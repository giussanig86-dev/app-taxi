/**
 * ADE CLIENT - Agenzia delle Entrate / Cassetto Fiscale
 *
 * Autenticazione: OAuth2 PKCE con SPID/CIE/CNS
 * L'intermediario (consulente) fa login SPID una volta → ottiene access_token + refresh_token.
 * Il sistema usa il refresh_token per rinnovare l'access_token automaticamente ogni ora.
 *
 * Variabili d'ambiente richieste:
 *   ADE_CLIENT_ID        - OAuth2 client_id ottenuto dalla registrazione app su AdE
 *   ADE_CLIENT_SECRET    - OAuth2 client_secret
 *   ADE_REDIRECT_URI     - URL callback (es. https://app.tuodominio.it/api/v1/ade/callback)
 *   ADE_AUTH_URL         - OIDC authorization endpoint AdE
 *   ADE_TOKEN_URL        - OIDC token endpoint AdE
 *   ADE_API_BASE         - Base URL REST Cassetto Fiscale
 *
 * Come ottenere le credenziali:
 *   1. Accedi a https://ivaservizi.agenziaentrate.gov.it
 *   2. Sezione "Accreditamento intermediari" → registra la tua applicazione
 *   3. AdE fornisce client_id e client_secret
 */

const crypto  = require('crypto');
const https   = require('https');
const http    = require('http');
const { URL } = require('url');

const ADE_AUTH_URL   = process.env.ADE_AUTH_URL   || 'https://idp.agenziaentrate.gov.it/oauth2/authorize';
const ADE_TOKEN_URL  = process.env.ADE_TOKEN_URL  || 'https://idp.agenziaentrate.gov.it/oauth2/token';
const ADE_API_BASE   = process.env.ADE_API_BASE   || 'https://ivaservizi.agenziaentrate.gov.it/ser/v1';
const ADE_CLIENT_ID  = process.env.ADE_CLIENT_ID;
const ADE_CLIENT_SECRET = process.env.ADE_CLIENT_SECRET;
const ADE_REDIRECT_URI  = process.env.ADE_REDIRECT_URI;

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// ─── OAuth2 URL builder ───────────────────────────────────────────────────────

/**
 * Genera l'URL di autorizzazione SPID/CIE a cui redirigere il consulente.
 * @param {string} state - valore opaco salvato in sessione per CSRF
 * @param {string} codeVerifier - PKCE verifier (salvare in sessione)
 * @returns {{ url: string, codeVerifier: string, state: string }}
 */
function getAuthUrl(state, codeVerifier) {
  if (!ADE_CLIENT_ID) throw new Error('ADE_CLIENT_ID non configurato');

  const verifier   = codeVerifier || generateCodeVerifier();
  const challenge  = generateCodeChallenge(verifier);
  const stateVal   = state || crypto.randomBytes(16).toString('hex');

  const url = new URL(ADE_AUTH_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', ADE_CLIENT_ID);
  url.searchParams.set('redirect_uri', ADE_REDIRECT_URI);
  url.searchParams.set('scope', 'openid profile cassetto_fiscale');
  url.searchParams.set('state', stateVal);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return { url: url.toString(), codeVerifier: verifier, state: stateVal };
}

// ─── Token exchange & refresh ─────────────────────────────────────────────────

async function httpPost(urlStr, body) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(urlStr);
    const data    = new URLSearchParams(body).toString();
    const lib     = parsed.protocol === 'https:' ? https : http;

    const req = lib.request({
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      method:   'POST',
      headers:  {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (res.statusCode >= 400) reject(new Error(json.error_description || json.error || raw));
          else resolve(json);
        } catch { reject(new Error(raw)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Scambia authorization_code con access_token + refresh_token.
 */
async function exchangeCode(code, codeVerifier) {
  if (!ADE_CLIENT_ID) throw new Error('ADE_CLIENT_ID non configurato');
  return httpPost(ADE_TOKEN_URL, {
    grant_type:    'authorization_code',
    client_id:     ADE_CLIENT_ID,
    client_secret: ADE_CLIENT_SECRET || '',
    redirect_uri:  ADE_REDIRECT_URI,
    code,
    code_verifier: codeVerifier,
  });
}

/**
 * Rinnova l'access_token usando il refresh_token.
 * @returns {{ access_token, refresh_token, expires_in }}
 */
async function refreshAccessToken(refreshToken) {
  if (!ADE_CLIENT_ID) throw new Error('ADE_CLIENT_ID non configurato');
  return httpPost(ADE_TOKEN_URL, {
    grant_type:    'refresh_token',
    client_id:     ADE_CLIENT_ID,
    client_secret: ADE_CLIENT_SECRET || '',
    refresh_token: refreshToken,
  });
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function apiGet(path, accessToken) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(path, ADE_API_BASE + '/');
    const lib     = fullUrl.protocol === 'https:' ? https : http;

    const req = lib.request({
      hostname: fullUrl.hostname,
      path:     fullUrl.pathname + fullUrl.search,
      port:     fullUrl.port || (fullUrl.protocol === 'https:' ? 443 : 80),
      method:   'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept':        'application/json',
      },
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode === 401) return reject(new Error('TOKEN_EXPIRED'));
        if (res.statusCode >= 400) return reject(new Error(`AdE API ${res.statusCode}: ${buf.toString()}`));
        try { resolve(JSON.parse(buf.toString())); }
        catch { resolve(buf); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Lista fatture passive ricevute da un cliente nel periodo.
 * AdE endpoint: GET /cassetto/{cf}/fatture-passive
 *
 * @param {string} accessToken
 * @param {string} codiceFiscale - CF o P.IVA del cliente
 * @param {Object} options - { dataDa: 'YYYY-MM-DD', dataA: 'YYYY-MM-DD' }
 */
async function listFatturePassive(accessToken, codiceFiscale, options = {}) {
  const { dataDa, dataA } = options;
  const params = new URLSearchParams({ cf: codiceFiscale });
  if (dataDa) params.set('dataDa', dataDa);
  if (dataA)  params.set('dataA', dataA);

  // L'endpoint esatto viene confermato dalla documentazione tecnica AdE
  // che l'intermediario riceve dopo l'accreditamento
  return apiGet(`cassetto/${codiceFiscale}/fatture-passive?${params}`, accessToken);
}

/**
 * Scarica il contenuto XML di una fattura passiva.
 * @returns {Buffer} XML della fattura
 */
async function downloadFatturaXML(accessToken, codiceFiscale, fatturaId) {
  return apiGet(
    `cassetto/${codiceFiscale}/fatture-passive/${fatturaId}/xml`,
    accessToken
  );
}

// ─── Token validity check ─────────────────────────────────────────────────────

function tokenScaduto(tokenExpiresAt) {
  if (!tokenExpiresAt) return true;
  // margine di 5 minuti
  return new Date(tokenExpiresAt).getTime() < Date.now() + 5 * 60 * 1000;
}

/**
 * Restituisce un access_token valido, rinnovandolo se necessario.
 * Aggiorna il documento utente in-place e lo salva.
 */
async function getValidToken(user) {
  if (!user.adeConnection?.enabled) throw new Error('AdE non connessa per questo utente');

  if (!tokenScaduto(user.adeConnection.tokenExpiresAt)) {
    return user.adeConnection.accessToken;
  }

  // Token scaduto → refresh
  if (!user.adeConnection.refreshToken) throw new Error('Nessun refresh_token: riconnettiti con SPID');

  const tokens = await refreshAccessToken(user.adeConnection.refreshToken);

  user.adeConnection.accessToken    = tokens.access_token;
  user.adeConnection.refreshToken   = tokens.refresh_token || user.adeConnection.refreshToken;
  user.adeConnection.tokenExpiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);
  await user.save();

  return tokens.access_token;
}

module.exports = {
  getAuthUrl,
  exchangeCode,
  refreshAccessToken,
  listFatturePassive,
  downloadFatturaXML,
  getValidToken,
  tokenScaduto,
};

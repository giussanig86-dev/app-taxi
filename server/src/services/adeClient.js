/**
 * ADE CLIENT - Agenzia delle Entrate / Cassetto Fiscale
 *
 * Autenticazione: mTLS con certificato CNS/Entratel (.p12 / PKCS#12)
 *
 * Il consulente carica una volta il suo certificato Entratel (.p12).
 * L'app lo usa per tutte le chiamate al Cassetto Fiscale AdE senza
 * bisogno di login interattivo o OAuth2.
 *
 * Variabile d'ambiente (opzionale, ha default):
 *   ADE_API_BASE  - Base URL REST Cassetto Fiscale AdE
 *                   Default: https://ivaservizi.agenziaentrate.gov.it/ser/v1
 */

const https   = require('https');
const http    = require('http');
const { URL } = require('url');

const ADE_API_BASE = process.env.ADE_API_BASE
  || 'https://ivaservizi.agenziaentrate.gov.it/ser/v1';

// ─── Agent mTLS ───────────────────────────────────────────────────────────────

/**
 * Crea un https.Agent con il certificato P12 (mTLS).
 * Lancia errore se il P12 o la password non sono validi.
 *
 * @param {Buffer|string} p12 - Buffer del file .p12 OPPURE stringa base64
 * @param {string} password   - Passphrase del certificato
 */
function creaAgentMTLS(p12, password) {
  const pfxBuf = Buffer.isBuffer(p12) ? p12 : Buffer.from(p12, 'base64');
  // Node.js valida subito il PKCS#12 al momento della costruzione dell'Agent:
  // se la password è errata o il file è corrotto lancia qui.
  return new https.Agent({
    pfx:                pfxBuf,
    passphrase:         password || '',
    rejectUnauthorized: true,    // verifica certificato AdE (produzione)
    keepAlive:          true,
  });
}

/**
 * Verifica che il certificato e la password siano corretti
 * senza fare chiamate di rete.
 * @throws {Error} se non valido
 */
function verificaCertificato(p12, password) {
  creaAgentMTLS(p12, password); // lancia se non valido
  return true;
}

// ─── HTTP helper (mTLS) ───────────────────────────────────────────────────────

async function apiGet(path, agent, params = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(path.startsWith('http') ? path : `${ADE_API_BASE}/${path}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v != null) fullUrl.searchParams.set(k, v);
    });

    const lib = fullUrl.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: fullUrl.hostname,
      path:     fullUrl.pathname + fullUrl.search,
      port:     fullUrl.port || (fullUrl.protocol === 'https:' ? 443 : 80),
      method:   'GET',
      headers:  { 'Accept': 'application/json' },
      agent,   // ← mTLS: il certificato è nell'agent
    };

    const req = lib.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode === 401 || res.statusCode === 403) {
          return reject(new Error('CERT_REJECTED: certificato non autorizzato su AdE'));
        }
        if (res.statusCode >= 400) {
          return reject(new Error(`AdE API ${res.statusCode}: ${buf.toString().substring(0, 200)}`));
        }
        try { resolve(JSON.parse(buf.toString())); }
        catch { resolve(buf); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── API Cassetto Fiscale ─────────────────────────────────────────────────────

/**
 * Lista fatture passive ricevute da un cliente nel periodo.
 *
 * @param {https.Agent} agent  - Agent mTLS con certificato CNS
 * @param {string} cf          - Codice fiscale / P.IVA del cliente
 * @param {{ dataDa, dataA }}  - Periodo (YYYY-MM-DD)
 */
async function listFatturePassive(agent, cf, { dataDa, dataA } = {}) {
  return apiGet(`cassetto/${cf}/fatture-passive`, agent, { dataDa, dataA });
}

/**
 * Scarica l'XML di una fattura passiva.
 * @returns {Buffer}
 */
async function downloadFatturaXML(agent, cf, fatturaId) {
  return apiGet(`cassetto/${cf}/fatture-passive/${fatturaId}/xml`, agent);
}

// ─── Helper per usare l'utente direttamente ───────────────────────────────────

/**
 * Crea un agent mTLS partendo dal documento User (con i campi decrittati).
 * @param {Object} consulente - documento User con adeConnection.certificato decriptato
 */
function agentDaUser(consulente) {
  const { certificato, certPassword } = consulente.adeConnection ?? {};
  if (!certificato) throw new Error('Nessun certificato CNS caricato. Vai in Impostazioni → AdE.');
  return creaAgentMTLS(certificato, certPassword || '');
}

module.exports = {
  creaAgentMTLS,
  verificaCertificato,
  listFatturePassive,
  downloadFatturaXML,
  agentDaUser,
};

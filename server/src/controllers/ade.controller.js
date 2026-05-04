/**
 * ADE CONTROLLER
 * Gestisce connessione OAuth2 SPID con AdE e sincronizzazione fatture passive.
 */

const crypto = require('crypto');
const User   = require('../models/User');
const adeClient   = require('../services/adeClient');
const { syncAllClienti, syncClienteFatture } = require('../services/syncFatture');

// Mappa in-memory per PKCE code_verifier (in produzione usa Redis o session store)
const pkceStore = new Map();

// ─── GET /ade/status ─────────────────────────────────────────────────────────

exports.status = async (req, res) => {
  const user = await User.findById(req.user.id).select(
    'adeConnection.enabled adeConnection.tokenExpiresAt adeConnection.lastSyncAt ' +
    'adeConnection.lastSyncStatus adeConnection.lastSyncError adeConnection.syncFrequency ' +
    'adeConnection.connectedAt adeConnection.importOnlyAfter'
  );

  const conn = user?.adeConnection ?? {};
  const tokenValido = conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) > new Date();

  res.json({
    status: 'ok',
    data: {
      connessa: !!conn.enabled && tokenValido,
      tokenScade: conn.tokenExpiresAt,
      ultimaSync: conn.lastSyncAt,
      statoSync: conn.lastSyncStatus,
      erroreSync: conn.lastSyncError,
      frequenza: conn.syncFrequency || 'daily',
      connessaDal: conn.connectedAt,
      importaDal: conn.importOnlyAfter,
      adeConfigured: !!(process.env.ADE_CLIENT_ID),
    }
  });
};

// ─── GET /ade/auth-url ────────────────────────────────────────────────────────

exports.getAuthUrl = (req, res) => {
  if (!process.env.ADE_CLIENT_ID) {
    return res.status(503).json({
      status: 'fail',
      messaggio: 'Integrazione AdE non configurata. Contatta il supporto TAXITAX.',
    });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const { url, codeVerifier } = adeClient.getAuthUrl(state);

  // Salva verifier associato allo state (TTL 10 min)
  pkceStore.set(state, { codeVerifier, userId: req.user.id, ts: Date.now() });
  setTimeout(() => pkceStore.delete(state), 10 * 60 * 1000);

  res.json({ status: 'ok', data: { authUrl: url } });
};

// ─── GET /ade/callback ────────────────────────────────────────────────────────

exports.callback = async (req, res) => {
  const { code, state, error, error_description } = req.query;

  const FRONTEND = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:5173';

  if (error) {
    return res.redirect(`${FRONTEND}/consulente/impostazioni?tab=ade&errore=${encodeURIComponent(error_description || error)}`);
  }

  const entry = pkceStore.get(state);
  if (!entry || entry.userId !== req.user?.id) {
    return res.redirect(`${FRONTEND}/consulente/impostazioni/ade?errore=state_non_valido`);
  }
  pkceStore.delete(state);

  try {
    const tokens = await adeClient.exchangeCode(code, entry.codeVerifier);

    const user = await User.findById(entry.userId);
    user.adeConnection = {
      enabled:        true,
      accessToken:    tokens.access_token,
      refreshToken:   tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
      connectedAt:    new Date(),
      lastSyncStatus: null,
      syncFrequency:  user.adeConnection?.syncFrequency || 'daily',
      importOnlyAfter: user.adeConnection?.importOnlyAfter || null,
    };
    await user.save();

    res.redirect(`${FRONTEND}/consulente/impostazioni?tab=ade&connessa=1`);
  } catch (err) {
    res.redirect(`${FRONTEND}/consulente/impostazioni?tab=ade&errore=${encodeURIComponent(err.message)}`);
  }
};

// ─── DELETE /ade/connection ────────────────────────────────────────────────────

exports.disconnect = async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, {
    $set: {
      'adeConnection.enabled':        false,
      'adeConnection.accessToken':    null,
      'adeConnection.refreshToken':   null,
      'adeConnection.tokenExpiresAt': null,
    }
  });
  res.json({ status: 'ok', messaggio: 'Connessione AdE rimossa.' });
};

// ─── PATCH /ade/settings ──────────────────────────────────────────────────────

exports.updateSettings = async (req, res) => {
  const { syncFrequency, importOnlyAfter } = req.body;

  const update = {};
  if (syncFrequency && ['hourly', 'daily', 'manual'].includes(syncFrequency)) {
    update['adeConnection.syncFrequency'] = syncFrequency;
  }
  if (importOnlyAfter) {
    update['adeConnection.importOnlyAfter'] = new Date(importOnlyAfter);
  }

  const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true });
  res.json({ status: 'ok', data: user.adeConnection });
};

// ─── POST /ade/sync ───────────────────────────────────────────────────────────

exports.syncManuale = async (req, res) => {
  const user = await User.findById(req.user.id).select(
    '+adeConnection.accessToken +adeConnection.refreshToken adeConnection'
  );

  if (!user?.adeConnection?.enabled) {
    return res.status(400).json({
      status: 'fail',
      messaggio: 'Connessione AdE non attiva. Esegui prima il login SPID.',
    });
  }

  const { dataDa, dataA } = req.body;

  try {
    const risultati = await syncAllClienti(req.user.id, { dataDa, dataA });
    const totImportate = risultati.reduce((s, r) => s + (r.importate || 0), 0);
    const totErrori    = risultati.reduce((s, r) => s + (r.errori || 0), 0);

    res.json({
      status: 'ok',
      messaggio: `Sincronizzazione completata: ${totImportate} fatture importate.`,
      data: { risultati, totImportate, totErrori },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', messaggio: err.message });
  }
};

// ─── POST /ade/sync/:clienteId ────────────────────────────────────────────────

exports.syncCliente = async (req, res) => {
  const { clienteId } = req.params;
  const { dataDa, dataA } = req.body;

  const [consulente, cliente] = await Promise.all([
    User.findById(req.user.id).select('+adeConnection.accessToken +adeConnection.refreshToken adeConnection'),
    User.findOne({ _id: clienteId, consulenteId: req.user.id, ruolo: 'cliente' })
      .select('nome cognome codiceFiscale partitaIva'),
  ]);

  if (!consulente?.adeConnection?.enabled) {
    return res.status(400).json({ status: 'fail', messaggio: 'Connessione AdE non attiva.' });
  }
  if (!cliente) {
    return res.status(404).json({ status: 'fail', messaggio: 'Cliente non trovato.' });
  }

  try {
    const risultato = await syncClienteFatture(consulente, cliente, { dataDa, dataA });
    res.json({
      status: 'ok',
      messaggio: `${risultato.importate} fatture importate per ${cliente.nome} ${cliente.cognome}.`,
      data: risultato,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', messaggio: err.message });
  }
};

// ─── POST /ade/import-xml ─────────────────────────────────────────────────────
// Upload manuale di XML/ZIP FatturaPA (alternativa all'API automatica)

const multer = require('multer');
const { parseFatturaXML, parseFattureZip } = require('../services/fatturaParser');
const Costo = require('../models/Costo');

const uploadXml = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB (ZIP con molte fatture)
  fileFilter: (req, file, cb) => {
    if (/\.(xml|p7m|zip)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Formato non supportato. Usa XML, P7M o ZIP.'));
  },
}).single('file');

exports.uploadXmlMiddleware = uploadXml;

exports.importXml = async (req, res) => {
  if (!req.file) return res.status(400).json({ status: 'fail', messaggio: 'File mancante.' });

  // clienteId può venire da ?userId= (tenantGuard) o da body
  const clienteId = req.query.userId || req.body.clienteId;
  if (!clienteId) return res.status(400).json({ status: 'fail', messaggio: 'clienteId obbligatorio.' });

  const cliente = await User.findOne({ _id: clienteId, consulenteId: req.user.id, ruolo: 'cliente' });
  if (!cliente) return res.status(404).json({ status: 'fail', messaggio: 'Cliente non trovato.' });

  const ext = req.file.originalname.toLowerCase();
  let fattureDati = [];

  if (ext.endsWith('.zip')) {
    const parsed = await parseFattureZip(req.file.buffer);
    fattureDati = parsed;
  } else {
    try {
      const data = await parseFatturaXML(req.file.buffer);
      fattureDati = [{ filename: req.file.originalname, data }];
    } catch (err) {
      return res.status(422).json({ status: 'fail', messaggio: err.message });
    }
  }

  let importate = 0, duplicate = 0, errori = 0;
  const dettagli = [];

  for (const { filename, data, error } of fattureDati) {
    if (error) {
      errori++;
      dettagli.push({ filename, stato: 'errore', messaggio: error });
      continue;
    }
    data.userId = cliente._id;
    try {
      await Costo.create(data);
      importate++;
      dettagli.push({ filename, stato: 'importata', numero: data.sdi?.numeroFattura });
    } catch (dbErr) {
      if (dbErr.code === 11000) { duplicate++; dettagli.push({ filename, stato: 'duplicato' }); }
      else { errori++; dettagli.push({ filename, stato: 'errore', messaggio: dbErr.message }); }
    }
  }

  res.json({
    status: 'ok',
    messaggio: `${importate} fatture importate, ${duplicate} duplicate, ${errori} errori.`,
    data: { importate, duplicate, errori, dettagli },
  });
};

/**
 * ADE CONTROLLER
 * Gestisce la connessione CNS/Entratel del consulente.
 * Download e parsing fatture sono delegati al gestionale fatture esterno.
 */

const multer = require('multer');
const User   = require('../models/User');

// ─── GET /ade/status ──────────────────────────────────────────────────────────

exports.status = async (req, res) => {
  const user = await User.findById(req.user.id).select(
    'adeConnection.enabled adeConnection.certScadeAt adeConnection.lastSyncAt ' +
    'adeConnection.lastSyncStatus adeConnection.lastSyncError ' +
    'adeConnection.syncFrequency adeConnection.connectedAt adeConnection.importOnlyAfter'
  );

  const conn = user?.adeConnection ?? {};
  const certValido = conn.certScadeAt ? new Date(conn.certScadeAt) > new Date() : !!conn.enabled;

  res.json({
    status: 'ok',
    data: {
      connessa:    !!conn.enabled && certValido,
      certScade:   conn.certScadeAt,
      ultimaSync:  conn.lastSyncAt,
      statoSync:   conn.lastSyncStatus,
      erroreSync:  conn.lastSyncError,
      frequenza:   conn.syncFrequency || 'daily',
      connessaDal: conn.connectedAt,
      importaDal:  conn.importOnlyAfter,
    }
  });
};

// ─── POST /ade/certificato ────────────────────────────────────────────────────

const uploadCert = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 1 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(p12|pfx)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Formato non valido. Carica un file .p12 o .pfx'));
  },
}).single('certificato');

exports.uploadCertMiddleware = uploadCert;

exports.uploadCertificato = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'fail', messaggio: 'File .p12 mancante.' });
  }

  const password  = req.body.password || '';
  const certBase64 = req.file.buffer.toString('base64');

  const user = await User.findById(req.user.id);
  user.adeConnection = {
    ...user.adeConnection?.toObject?.() ?? {},
    enabled:        true,
    certificato:    certBase64,
    certPassword:   password,
    certScadeAt:    null,
    connectedAt:    new Date(),
    lastSyncStatus: null,
    syncFrequency:  user.adeConnection?.syncFrequency || 'daily',
    importOnlyAfter: user.adeConnection?.importOnlyAfter || null,
  };
  await user.save();

  res.json({ status: 'ok', messaggio: 'Certificato CNS caricato correttamente.' });
};

// ─── DELETE /ade/connection ───────────────────────────────────────────────────

exports.disconnect = async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, {
    $set: {
      'adeConnection.enabled':      false,
      'adeConnection.certificato':  null,
      'adeConnection.certPassword': null,
    }
  });
  res.json({ status: 'ok', messaggio: 'Certificato CNS rimosso.' });
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

  await User.findByIdAndUpdate(req.user.id, { $set: update });
  res.json({ status: 'ok', messaggio: 'Impostazioni aggiornate.' });
};

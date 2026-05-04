/**
 * ADE CONTROLLER
 * Gestisce upload certificato CNS/Entratel e sincronizzazione fatture passive.
 */

const multer  = require('multer');
const User    = require('../models/User');
const Costo   = require('../models/Costo');
const adeClient = require('../services/adeClient');
const { syncAllClienti, syncClienteFatture } = require('../services/syncFatture');
const { parseFatturaXML, parseFattureZip } = require('../services/fatturaParser');

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
      connessa:     !!conn.enabled && certValido,
      certScade:    conn.certScadeAt,
      ultimaSync:   conn.lastSyncAt,
      statoSync:    conn.lastSyncStatus,
      erroreSync:   conn.lastSyncError,
      frequenza:    conn.syncFrequency || 'daily',
      connessaDal:  conn.connectedAt,
      importaDal:   conn.importOnlyAfter,
    }
  });
};

// ─── POST /ade/certificato ────────────────────────────────────────────────────

const uploadCert = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 1 * 1024 * 1024 }, // 1 MB max (i P12 sono ~5 KB)
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

  const password = req.body.password || '';

  // Valida che il P12 sia integro e la password corretta
  try {
    adeClient.verificaCertificato(req.file.buffer, password);
  } catch (err) {
    return res.status(422).json({
      status: 'fail',
      messaggio: 'Certificato non valido o password errata. Verifica il file .p12 e riprova.',
    });
  }

  // Salva il certificato come base64 crittografato
  const certBase64 = req.file.buffer.toString('base64');

  const user = await User.findById(req.user.id);
  user.adeConnection = {
    ...user.adeConnection?.toObject?.() ?? {},
    enabled:      true,
    certificato:  certBase64,
    certPassword: password,
    certScadeAt:  null,        // può essere estratta in futuro con node-forge
    connectedAt:  new Date(),
    lastSyncStatus: null,
    syncFrequency: user.adeConnection?.syncFrequency || 'daily',
    importOnlyAfter: user.adeConnection?.importOnlyAfter || null,
  };
  await user.save();

  res.json({ status: 'ok', messaggio: 'Certificato CNS caricato correttamente.' });
};

// ─── DELETE /ade/connection ────────────────────────────────────────────────────

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

// ─── POST /ade/sync ───────────────────────────────────────────────────────────

exports.syncManuale = async (req, res) => {
  const user = await User.findById(req.user.id).select(
    'adeConnection nome'
  );

  if (!user?.adeConnection?.enabled) {
    return res.status(400).json({
      status: 'fail',
      messaggio: 'Nessun certificato CNS caricato. Vai in Impostazioni → AdE.',
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
    User.findById(req.user.id).select('adeConnection nome'),
    User.findOne({ _id: clienteId, consulenteId: req.user.id, ruolo: 'cliente' })
      .select('nome cognome codiceFiscale partitaIva'),
  ]);

  if (!consulente?.adeConnection?.enabled) {
    return res.status(400).json({ status: 'fail', messaggio: 'Nessun certificato CNS caricato.' });
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

const uploadXml = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(xml|p7m|zip)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Formato non supportato. Usa XML, P7M o ZIP.'));
  },
}).single('file');

exports.uploadXmlMiddleware = uploadXml;

exports.importXml = async (req, res) => {
  if (!req.file) return res.status(400).json({ status: 'fail', messaggio: 'File mancante.' });

  const clienteId = req.query.userId || req.body.clienteId;
  if (!clienteId) return res.status(400).json({ status: 'fail', messaggio: 'clienteId obbligatorio.' });

  const cliente = await User.findOne({ _id: clienteId, consulenteId: req.user.id, ruolo: 'cliente' });
  if (!cliente) return res.status(404).json({ status: 'fail', messaggio: 'Cliente non trovato.' });

  const ext = req.file.originalname.toLowerCase();
  let fattureDati;

  if (ext.endsWith('.zip')) {
    fattureDati = await parseFattureZip(req.file.buffer);
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
      if (dbErr.code === 11000) {
        duplicate++;
        dettagli.push({ filename, stato: 'duplicato' });
      } else {
        errori++;
        dettagli.push({ filename, stato: 'errore', messaggio: dbErr.message });
      }
    }
  }

  res.json({
    status: 'ok',
    messaggio: `${importate} fatture importate, ${duplicate} duplicate, ${errori} errori.`,
    data: { importate, duplicate, errori, dettagli },
  });
};

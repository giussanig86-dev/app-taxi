/**
 * ADMIN CONTROLLER
 * Gestione consulenti e statistiche piattaforma (solo super_admin)
 */

const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ── Statistiche piattaforma ───────────────────────────────────────────────
exports.getStats = catchAsync(async (req, res) => {
  const [totConsulenti, totClienti, consulentiAttivi, consulentiSospesi] = await Promise.all([
    User.countDocuments({ ruolo: 'consulente' }),
    User.countDocuments({ ruolo: 'cliente' }),
    User.countDocuments({ ruolo: 'consulente', accountSospeso: false }),
    User.countDocuments({ ruolo: 'consulente', accountSospeso: true }),
  ]);

  // MRR dai consulenti con abbonamento attivo
  const mrrAgg = await User.aggregate([
    { $match: { ruolo: 'consulente', 'consulente.billing.abbonamentoPagato': true } },
    { $group: { _id: null, mrr: { $sum: '$consulente.billing.importoMensile' } } },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      totConsulenti,
      totClienti,
      consulentiAttivi,
      consulentiSospesi,
      mrr: mrrAgg[0]?.mrr || 0,
    },
  });
});

// ── Lista consulenti ──────────────────────────────────────────────────────
exports.getConsulenti = catchAsync(async (req, res) => {
  const { search, piano, sospeso, page = 1, limit = 20 } = req.query;

  const filter = { ruolo: 'consulente' };
  if (search) {
    filter.$or = [
      { nome: { $regex: search, $options: 'i' } },
      { cognome: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (piano) filter['consulente.piano'] = piano;
  if (sospeso !== undefined) filter.accountSospeso = sospeso === 'true';

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [consulenti, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: consulenti.length,
    total,
    pages: Math.ceil(total / parseInt(limit)),
    page: parseInt(page),
    data: { consulenti },
  });
});

// ── Singolo consulente ────────────────────────────────────────────────────
exports.getConsulente = catchAsync(async (req, res, next) => {
  const consulente = await User.findOne({ _id: req.params.id, ruolo: 'consulente' }).select('-password');
  if (!consulente) return next(new AppError('Consulente non trovato.', 404));

  // Conta i clienti associati
  const nClienti = await User.countDocuments({ consulenteId: consulente._id, ruolo: 'cliente' });

  res.status(200).json({
    status: 'success',
    data: { consulente, nClienti },
  });
});

// ── Crea consulente ───────────────────────────────────────────────────────
exports.createConsulente = catchAsync(async (req, res, next) => {
  const {
    nome, cognome, email, password, telefono,
    piano = 'pro',
    maxClienti = 50,
    importoMensile = 49,
    dataScadenza,
    abbonamentoPagato = true,
    nomeStudio,
    indirizzoStudio,
  } = req.body;

  if (!nome || !cognome || !email || !password) {
    return next(new AppError('Nome, cognome, email e password sono obbligatori.', 400));
  }
  if (password.length < 8) {
    return next(new AppError('La password deve essere di almeno 8 caratteri.', 400));
  }

  const scadenza = dataScadenza ? new Date(dataScadenza) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const consulente = await User.create({
    nome,
    cognome,
    email,
    password,
    telefono: telefono || '',
    ruolo: 'consulente',
    consulente: {
      piano,
      limiti: {
        maxClienti: parseInt(maxClienti),
        maxStorage: 20480,
        hasFatturazioneElettronica: piano !== 'free',
        hasWhiteLabel: piano === 'enterprise' || piano === 'custom',
        hasPrioritySupport: piano !== 'free',
      },
      utilizzo: { clientiAttivi: 0, storageUsato: 0 },
      billing: {
        abbonamentoPagato,
        dataScadenza: scadenza,
        importoMensile: parseFloat(importoMensile),
        ultimoPagamento: abbonamentoPagato ? new Date() : null,
      },
      branding: {
        nomeStudio: nomeStudio || `Studio ${cognome}`,
        indirizzo: indirizzoStudio || '',
      },
    },
  });

  const plain = consulente.toObject();
  delete plain.password;

  res.status(201).json({ status: 'success', data: { consulente: plain } });
});

// ── Aggiorna consulente ───────────────────────────────────────────────────
exports.updateConsulente = catchAsync(async (req, res, next) => {
  const consulente = await User.findOne({ _id: req.params.id, ruolo: 'consulente' });
  if (!consulente) return next(new AppError('Consulente non trovato.', 404));

  const {
    nome, cognome, email, telefono, password,
    piano, maxClienti, importoMensile, dataScadenza,
    abbonamentoPagato, nomeStudio, indirizzoStudio,
  } = req.body;

  if (nome)     consulente.nome     = nome;
  if (cognome)  consulente.cognome  = cognome;
  if (email)    consulente.email    = email;
  if (telefono) consulente.telefono = telefono;
  if (password) {
    if (password.length < 8) return next(new AppError('Password minimo 8 caratteri.', 400));
    consulente.password = password;
  }

  if (piano)                consulente.consulente.piano                           = piano;
  if (maxClienti !== undefined) consulente.consulente.limiti.maxClienti           = parseInt(maxClienti);
  if (importoMensile !== undefined) consulente.consulente.billing.importoMensile  = parseFloat(importoMensile);
  if (dataScadenza)         consulente.consulente.billing.dataScadenza            = new Date(dataScadenza);
  if (abbonamentoPagato !== undefined) consulente.consulente.billing.abbonamentoPagato = Boolean(abbonamentoPagato);
  if (nomeStudio)           consulente.consulente.branding.nomeStudio             = nomeStudio;
  if (indirizzoStudio)      consulente.consulente.branding.indirizzo              = indirizzoStudio;

  await consulente.save();

  const plain = consulente.toObject();
  delete plain.password;

  res.status(200).json({ status: 'success', data: { consulente: plain } });
});

// ── Sospendi / riattiva ───────────────────────────────────────────────────
exports.toggleSospensione = catchAsync(async (req, res, next) => {
  const consulente = await User.findOne({ _id: req.params.id, ruolo: 'consulente' });
  if (!consulente) return next(new AppError('Consulente non trovato.', 404));

  consulente.accountSospeso    = !consulente.accountSospeso;
  consulente.motivoSospensione = consulente.accountSospeso ? (req.body.motivo || 'Sospeso da admin') : null;
  await consulente.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      sospeso: consulente.accountSospeso,
      messaggio: consulente.accountSospeso ? 'Account sospeso.' : 'Account riattivato.',
    },
  });
});

// ── Elimina consulente ────────────────────────────────────────────────────
exports.deleteConsulente = catchAsync(async (req, res, next) => {
  const consulente = await User.findOne({ _id: req.params.id, ruolo: 'consulente' });
  if (!consulente) return next(new AppError('Consulente non trovato.', 404));

  const nClienti = await User.countDocuments({ consulenteId: consulente._id });
  if (nClienti > 0) {
    return next(new AppError(`Impossibile eliminare: il consulente ha ancora ${nClienti} clienti associati. Riassegnali prima.`, 400));
  }

  await consulente.deleteOne();
  res.status(204).json({ status: 'success', data: null });
});

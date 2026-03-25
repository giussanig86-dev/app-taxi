const User = require('../models/User');
const StatoLog = require('../models/StatoLog');
const Notifica = require('../models/Notifica');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.getProfilo = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ status: 'success', data: { user } });
});

exports.updateProfilo = catchAsync(async (req, res) => {
  const campiPermessi = ['nome', 'cognome', 'telefono', 'indirizzo', 'codiceCliente', 'numeroLicenza', 'comuneRilascioLicenza'];
  const updates = {};
  campiPermessi.forEach(campo => {
    if (req.body[campo] !== undefined) updates[campo] = req.body[campo];
  });
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.status(200).json({ status: 'success', data: { user } });
});

exports.updateDatiFiscali = catchAsync(async (req, res, next) => {
  if (req.user.ruolo !== 'cliente') return next(new AppError('Solo i clienti possono modificare dati fiscali.', 403));
  const campiPermessi = ['partitaIva', 'codiceFiscale', 'regimeFiscale', 'coefficienteRedditivita', 'aliquotaForfettaria', 'aliquotaINPS'];
  const updates = {};
  campiPermessi.forEach(campo => {
    if (req.body[campo] !== undefined) updates[campo] = req.body[campo];
  });
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.status(200).json({ status: 'success', data: { user } });
});

exports.getClienti = catchAsync(async (req, res) => {
  const clienti = await User.trovaClientiConsulente(req.user._id);
  res.status(200).json({ status: 'success', results: clienti.length, data: { clienti } });
});

exports.createCliente = catchAsync(async (req, res, next) => {
  if (!req.user.puoCreareNuovoCliente()) return next(new AppError('Hai raggiunto il limite di clienti del tuo piano.', 403));
  const cliente = await User.create({ ...req.body, ruolo: 'cliente', consulenteId: req.user._id });
  res.status(201).json({ status: 'success', data: { cliente } });
});

exports.getCliente = catchAsync(async (req, res, next) => {
  const cliente = await User.findOne({ _id: req.params.id, consulenteId: req.user._id, ruolo: 'cliente' });
  if (!cliente) return next(new AppError('Cliente non trovato.', 404));
  res.status(200).json({ status: 'success', data: { cliente } });
});

exports.updateCliente = catchAsync(async (req, res, next) => {
  const campiPermessi = [
    'nome', 'cognome', 'email', 'telefono', 'indirizzo',
    'codiceCliente', 'numeroLicenza', 'comuneRilascioLicenza',
    'codiceFiscale', 'partitaIva',
    'regimeFiscale', 'coefficienteRedditivita', 'aliquotaForfettaria', 'aliquotaINPS'
  ];
  const updates = {};
  campiPermessi.forEach(campo => {
    if (req.body[campo] !== undefined) updates[campo] = req.body[campo];
  });
  const cliente = await User.findOneAndUpdate(
    { _id: req.params.id, consulenteId: req.user._id, ruolo: 'cliente' },
    updates, { new: true, runValidators: true }
  );
  if (!cliente) return next(new AppError('Cliente non trovato.', 404));
  res.status(200).json({ status: 'success', data: { cliente } });
});

// ── Cambio stato cliente (consulente) ─────────────────────────────────────────
exports.cambiaStato = catchAsync(async (req, res, next) => {
  const { stato, motivazione, dataVariazione } = req.body;
  if (!['attivo', 'sospeso', 'cessato'].includes(stato)) {
    return next(new AppError('Stato non valido.', 400));
  }
  const cliente = await User.findOneAndUpdate(
    { _id: req.params.id, consulenteId: req.user._id, ruolo: 'cliente' },
    { statoCliente: stato },
    { new: true }
  );
  if (!cliente) return next(new AppError('Cliente non trovato.', 404));

  await StatoLog.create({
    userId: cliente._id,
    stato,
    dataVariazione: dataVariazione ? new Date(dataVariazione) : new Date(),
    motivazione: motivazione || '',
    cambiatoDa: req.user._id
  });

  res.json({ status: 'success', data: { cliente } });
});

// ── Storico stato cliente ─────────────────────────────────────────────────────
exports.getStoricoStato = catchAsync(async (req, res, next) => {
  const cliente = await User.findOne({ _id: req.params.id, consulenteId: req.user._id, ruolo: 'cliente' });
  if (!cliente) return next(new AppError('Cliente non trovato.', 404));

  const storico = await StatoLog
    .find({ userId: req.params.id })
    .sort({ dataVariazione: -1 })
    .populate('cambiatoDa', 'nome cognome');

  res.json({ status: 'success', data: { storico } });
});

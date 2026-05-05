const Fattura = require('../models/Fattura');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Costruisce il filtro MongoDB in base al ruolo dell'utente autenticato.
// La taxi app non usa più tenantGuard per le fatture perché il nuovo modello
// usa clienteId/consulenteId invece di userId.
const buildFilter = (user, extra = {}) => {
  if (user.ruolo === 'super_admin') return extra;
  if (user.ruolo === 'cliente')     return { clienteId: user._id, ...extra };
  if (user.ruolo === 'consulente')  return { consulenteId: user._id, ...extra };
  return null;
};

exports.getAll = catchAsync(async (req, res, next) => {
  const { stato, anno, page = 1, limit = 50 } = req.query;

  const filter = buildFilter(req.user);
  if (!filter) return next(new AppError('Accesso non autorizzato.', 403));

  if (stato) filter.stato = stato;
  if (anno) {
    const a = parseInt(anno);
    filter['datiParsati.data'] = { $gte: new Date(a, 0, 1), $lt: new Date(a + 1, 0, 1) };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [fatture, total] = await Promise.all([
    Fattura.find(filter).sort({ 'datiParsati.data': -1 }).skip(skip).limit(parseInt(limit)),
    Fattura.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: fatture.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: { fatture },
  });
});

exports.getOne = catchAsync(async (req, res, next) => {
  const filter = buildFilter(req.user, { _id: req.params.id });
  if (!filter) return next(new AppError('Accesso non autorizzato.', 403));

  const fattura = await Fattura.findOne(filter);
  if (!fattura) return next(new AppError('Fattura non trovata.', 404));

  res.status(200).json({ status: 'success', data: { fattura } });
});

exports.updateStato = catchAsync(async (req, res, next) => {
  const { stato } = req.body;
  const allowed = ['ricevuta', 'accettata', 'rifiutata', 'scartata'];
  if (!stato || !allowed.includes(stato)) {
    return next(new AppError(`Stato non valido. Valori ammessi: ${allowed.join(', ')}.`, 400));
  }

  const filter = buildFilter(req.user, { _id: req.params.id });
  if (!filter) return next(new AppError('Accesso non autorizzato.', 403));

  const fattura = await Fattura.findOneAndUpdate(filter, { stato }, { new: true, runValidators: true });
  if (!fattura) return next(new AppError('Fattura non trovata.', 404));

  res.status(200).json({ status: 'success', data: { fattura } });
});

exports.updateCorsaId = catchAsync(async (req, res, next) => {
  const { corsaId } = req.body;

  const filter = buildFilter(req.user, { _id: req.params.id });
  if (!filter) return next(new AppError('Accesso non autorizzato.', 403));

  const fattura = await Fattura.findOneAndUpdate(filter, { corsaId: corsaId || null }, { new: true });
  if (!fattura) return next(new AppError('Fattura non trovata.', 404));

  res.status(200).json({ status: 'success', data: { fattura } });
});

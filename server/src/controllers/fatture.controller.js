const FatturaAttiva = require('../models/FatturaAttiva');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.getAll = catchAsync(async (req, res) => {
  const { anno, pagata, statoSdi, page = 1, limit = 50 } = req.query;
  const filter = { ...req.tenantFilter };
  if (anno) { const a = parseInt(anno); filter.dataEmissione = { $gte: new Date(a, 0, 1), $lt: new Date(a + 1, 0, 1) }; }
  if (pagata !== undefined) filter.pagata = pagata === 'true';
  if (statoSdi) filter['sdi.statoTrasmissione'] = statoSdi;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [fatture, total] = await Promise.all([
    FatturaAttiva.find(filter).sort({ dataEmissione: -1 }).skip(skip).limit(parseInt(limit)),
    FatturaAttiva.countDocuments(filter)
  ]);
  res.status(200).json({ status: 'success', results: fatture.length, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), data: { fatture } });
});

exports.create = catchAsync(async (req, res) => {
  const fattura = await FatturaAttiva.create({ ...req.body, userId: req.tenantUserId || req.user._id, createdBy: req.user._id });
  res.status(201).json({ status: 'success', data: { fattura } });
});

exports.getOne = catchAsync(async (req, res, next) => {
  const fattura = await FatturaAttiva.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!fattura) return next(new AppError('Fattura non trovata.', 404));
  res.status(200).json({ status: 'success', data: { fattura } });
});

exports.update = catchAsync(async (req, res, next) => {
  const fattura = await FatturaAttiva.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!fattura) return next(new AppError('Fattura non trovata.', 404));
  if (fattura.sdi.statoTrasmissione !== 'bozza') return next(new AppError('Puoi modificare solo fatture in bozza.', 400));
  Object.assign(fattura, req.body);
  await fattura.save();
  res.status(200).json({ status: 'success', data: { fattura } });
});

exports.delete = catchAsync(async (req, res, next) => {
  const fattura = await FatturaAttiva.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!fattura) return next(new AppError('Fattura non trovata.', 404));
  if (fattura.sdi.statoTrasmissione !== 'bozza') return next(new AppError('Puoi eliminare solo fatture in bozza.', 400));
  await fattura.deleteOne();
  res.status(204).json({ status: 'success', data: null });
});

exports.marcaPagata = catchAsync(async (req, res, next) => {
  const fattura = await FatturaAttiva.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!fattura) return next(new AppError('Fattura non trovata.', 404));
  await fattura.marcaPagata(req.body.metodoPagamento);
  res.status(200).json({ status: 'success', data: { fattura } });
});

exports.statsAnno = catchAsync(async (req, res) => {
  const anno = parseInt(req.query.anno) || new Date().getFullYear();
  const userId = req.tenantUserId || req.user._id;
  const result = await FatturaAttiva.fatturatoAnno(userId, anno);
  res.status(200).json({ status: 'success', data: result });
});

exports.statsScadute = catchAsync(async (req, res) => {
  const userId = req.tenantUserId || req.user._id;
  const result = await FatturaAttiva.fattureScadute(userId);
  res.status(200).json({ status: 'success', data: { fatture: result } });
});

exports.statsScadenze = catchAsync(async (req, res) => {
  const giorni = parseInt(req.query.giorni) || 30;
  const userId = req.tenantUserId || req.user._id;
  const result = await FatturaAttiva.prossimeScadenze(userId, giorni);
  res.status(200).json({ status: 'success', data: { fatture: result } });
});

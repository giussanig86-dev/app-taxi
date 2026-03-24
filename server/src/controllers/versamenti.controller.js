const Versamento = require('../models/Versamento');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.getAll = catchAsync(async (req, res) => {
  const { anno, categoriaFiscale, pagato, page = 1, limit = 50 } = req.query;
  const filter = { ...req.tenantFilter };
  if (anno) filter.competenzaAnno = parseInt(anno);
  if (categoriaFiscale) filter.categoriaFiscale = categoriaFiscale;
  if (pagato !== undefined) filter.pagato = pagato === 'true';
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [versamenti, total] = await Promise.all([
    Versamento.find(filter).sort({ dataScadenza: 1 }).skip(skip).limit(parseInt(limit)),
    Versamento.countDocuments(filter)
  ]);
  res.status(200).json({ status: 'success', results: versamenti.length, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), data: { versamenti } });
});

exports.create = catchAsync(async (req, res) => {
  const versamento = await Versamento.create({ ...req.body, userId: req.tenantUserId || req.user._id });
  res.status(201).json({ status: 'success', data: { versamento } });
});

exports.getOne = catchAsync(async (req, res, next) => {
  const versamento = await Versamento.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!versamento) return next(new AppError('Versamento non trovato.', 404));
  res.status(200).json({ status: 'success', data: { versamento } });
});

exports.update = catchAsync(async (req, res, next) => {
  const versamento = await Versamento.findOneAndUpdate(
    { _id: req.params.id, ...req.tenantFilter }, req.body,
    { new: true, runValidators: true }
  );
  if (!versamento) return next(new AppError('Versamento non trovato.', 404));
  res.status(200).json({ status: 'success', data: { versamento } });
});

exports.delete = catchAsync(async (req, res, next) => {
  const versamento = await Versamento.findOneAndDelete({ _id: req.params.id, ...req.tenantFilter });
  if (!versamento) return next(new AppError('Versamento non trovato.', 404));
  res.status(204).json({ status: 'success', data: null });
});

exports.marcaPagato = catchAsync(async (req, res, next) => {
  const versamento = await Versamento.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!versamento) return next(new AppError('Versamento non trovato.', 404));
  await versamento.marcaPagato(req.body.metodoPagamento, req.body.dataVersamento);
  res.status(200).json({ status: 'success', data: { versamento } });
});

exports.statsScadenze = catchAsync(async (req, res) => {
  const giorni = parseInt(req.query.giorni) || 60;
  const userId = req.tenantUserId || req.user._id;
  const result = await Versamento.prossimeScadenze(userId, giorni);
  res.status(200).json({ status: 'success', data: { versamenti: result } });
});

exports.statsScaduti = catchAsync(async (req, res) => {
  const userId = req.tenantUserId || req.user._id;
  const result = await Versamento.scaduti(userId);
  res.status(200).json({ status: 'success', data: { versamenti: result } });
});

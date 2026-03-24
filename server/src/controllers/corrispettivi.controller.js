const Corrispettivo = require('../models/Corrispettivo');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.getAll = catchAsync(async (req, res) => {
  const { anno, mese, metodoPagamento, page = 1, limit = 50 } = req.query;
  const filter = { ...req.tenantFilter };

  if (anno) {
    const a = parseInt(anno);
    filter.data = { $gte: new Date(a, 0, 1), $lt: new Date(a + 1, 0, 1) };
  }
  if (anno && mese) {
    const a = parseInt(anno);
    const m = parseInt(mese);
    filter.data = { $gte: new Date(a, m - 1, 1), $lt: new Date(a, m, 1) };
  }
  if (metodoPagamento) filter.metodoPagamento = metodoPagamento;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [corrispettivi, total] = await Promise.all([
    Corrispettivo.find(filter).sort({ data: -1 }).skip(skip).limit(parseInt(limit)),
    Corrispettivo.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success', results: corrispettivi.length, total,
    page: parseInt(page), pages: Math.ceil(total / parseInt(limit)),
    data: { corrispettivi }
  });
});

exports.create = catchAsync(async (req, res) => {
  const corrispettivo = await Corrispettivo.create({
    ...req.body,
    userId: req.tenantUserId || req.user._id
  });
  res.status(201).json({ status: 'success', data: { corrispettivo } });
});

exports.getOne = catchAsync(async (req, res, next) => {
  const corrispettivo = await Corrispettivo.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!corrispettivo) return next(new AppError('Corrispettivo non trovato.', 404));
  res.status(200).json({ status: 'success', data: { corrispettivo } });
});

exports.update = catchAsync(async (req, res, next) => {
  const corrispettivo = await Corrispettivo.findOneAndUpdate(
    { _id: req.params.id, ...req.tenantFilter }, req.body,
    { new: true, runValidators: true }
  );
  if (!corrispettivo) return next(new AppError('Corrispettivo non trovato.', 404));
  res.status(200).json({ status: 'success', data: { corrispettivo } });
});

exports.delete = catchAsync(async (req, res, next) => {
  const corrispettivo = await Corrispettivo.findOneAndDelete({ _id: req.params.id, ...req.tenantFilter });
  if (!corrispettivo) return next(new AppError('Corrispettivo non trovato.', 404));
  res.status(204).json({ status: 'success', data: null });
});

exports.statsAnno = catchAsync(async (req, res) => {
  const anno = parseInt(req.query.anno) || new Date().getFullYear();
  const userId = req.tenantUserId || req.user._id;
  const result = await Corrispettivo.totaleAnno(userId, anno);
  res.status(200).json({ status: 'success', data: result });
});

exports.statsMese = catchAsync(async (req, res) => {
  const anno = parseInt(req.query.anno) || new Date().getFullYear();
  const mese = parseInt(req.query.mese) || new Date().getMonth() + 1;
  const userId = req.tenantUserId || req.user._id;
  const result = await Corrispettivo.totaleMese(userId, anno, mese);
  res.status(200).json({ status: 'success', data: result });
});

exports.statsMetodi = catchAsync(async (req, res) => {
  const anno = parseInt(req.query.anno) || new Date().getFullYear();
  const userId = req.tenantUserId || req.user._id;
  const result = await Corrispettivo.breakdownMetodi(userId, anno);
  res.status(200).json({ status: 'success', data: result });
});

exports.statsAndamento = catchAsync(async (req, res) => {
  const anno = parseInt(req.query.anno) || new Date().getFullYear();
  const userId = req.tenantUserId || req.user._id;
  const result = await Corrispettivo.andamentoMensile(userId, anno);
  res.status(200).json({ status: 'success', data: result });
});

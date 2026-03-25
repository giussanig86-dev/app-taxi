const Costo = require('../models/Costo');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.getAll = catchAsync(async (req, res) => {
  const { anno, categoria, approvato, tipoCosto, page = 1, limit = 50 } = req.query;
  const filter = { ...req.tenantFilter };
  if (anno) filter.competenzaAnno = parseInt(anno);
  if (categoria) filter.categoria = categoria;
  if (approvato !== undefined) filter.approvato = approvato === 'true';
  if (tipoCosto) filter.tipoCosto = tipoCosto;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [costi, total] = await Promise.all([
    Costo.find(filter).sort({ data: -1 }).skip(skip).limit(parseInt(limit)),
    Costo.countDocuments(filter)
  ]);
  res.status(200).json({ status: 'success', results: costi.length, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), data: { costi } });
});

exports.create = catchAsync(async (req, res) => {
  const isConsulente = req.user.ruolo === 'consulente'
  const extra = isConsulente
    ? { approvato: true, approvatoDa: req.user._id, dataApprovazione: new Date() }
    : {}
  const costo = await Costo.create({
    ...req.body,
    userId: req.tenantUserId || req.user._id,
    ...extra,
  });
  res.status(201).json({ status: 'success', data: { costo } });
});

exports.getOne = catchAsync(async (req, res, next) => {
  const costo = await Costo.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!costo) return next(new AppError('Costo non trovato.', 404));
  res.status(200).json({ status: 'success', data: { costo } });
});

exports.update = catchAsync(async (req, res, next) => {
  const costo = await Costo.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!costo) return next(new AppError('Costo non trovato.', 404));
  const isConsulente = req.user.ruolo === 'consulente'
  if (costo.approvato && !isConsulente) return next(new AppError('Non puoi modificare un costo approvato.', 400));
  Object.assign(costo, req.body);
  await costo.save();
  res.status(200).json({ status: 'success', data: { costo } });
});

exports.delete = catchAsync(async (req, res, next) => {
  const costo = await Costo.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!costo) return next(new AppError('Costo non trovato.', 404));
  const isConsulente = req.user.ruolo === 'consulente'
  if (costo.approvato && !isConsulente) return next(new AppError('Non puoi eliminare un costo approvato.', 400));
  await costo.deleteOne();
  res.status(204).json({ status: 'success', data: null });
});

exports.approva = catchAsync(async (req, res, next) => {
  const costo = await Costo.findById(req.params.id);
  if (!costo) return next(new AppError('Costo non trovato.', 404));
  await costo.approva(req.user._id);
  res.status(200).json({ status: 'success', data: { costo }, messaggio: 'Costo approvato' });
});

exports.rifiuta = catchAsync(async (req, res, next) => {
  const costo = await Costo.findById(req.params.id);
  if (!costo) return next(new AppError('Costo non trovato.', 404));
  if (!req.body.motivazione) return next(new AppError('Motivazione obbligatoria.', 400));
  await costo.rifiuta(req.user._id, req.body.motivazione);
  res.status(200).json({ status: 'success', data: { costo }, messaggio: 'Costo rifiutato' });
});

exports.statsAnno = catchAsync(async (req, res) => {
  const anno = parseInt(req.query.anno) || new Date().getFullYear();
  const userId = req.tenantUserId || req.user._id;
  const result = await Costo.totaleAnno(userId, anno);
  res.status(200).json({ status: 'success', data: result });
});

exports.statsCategorie = catchAsync(async (req, res) => {
  const anno = parseInt(req.query.anno) || new Date().getFullYear();
  const userId = req.tenantUserId || req.user._id;
  const result = await Costo.breakdownCategorie(userId, anno);
  res.status(200).json({ status: 'success', data: result });
});

exports.daApprovare = catchAsync(async (req, res) => {
  const result = await Costo.daApprovareConsulente(req.user._id);
  res.status(200).json({ status: 'success', results: result.length, data: { costi: result } });
});

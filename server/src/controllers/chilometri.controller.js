const Chilometro = require('../models/Chilometro');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.getAll = catchAsync(async (req, res) => {
  const { anno } = req.query;
  const filter = { ...req.tenantFilter };
  if (anno) filter.anno = parseInt(anno);
  const chilometri = await Chilometro.find(filter).sort({ anno: -1, mese: -1 });
  res.status(200).json({ status: 'success', results: chilometri.length, data: { chilometri } });
});

exports.createOrUpdate = catchAsync(async (req, res) => {
  const userId = req.tenantUserId || req.user._id;
  const { anno, mese, kmTotali, kmLavorativi } = req.body;
  const chilometro = await Chilometro.findOneAndUpdate(
    { userId, anno, mese },
    { userId, anno, mese, kmTotali, kmLavorativi, insertMode: req.body.insertMode || 'manuale' },
    { new: true, upsert: true, runValidators: true }
  );
  res.status(200).json({ status: 'success', data: { chilometro } });
});

exports.update = catchAsync(async (req, res, next) => {
  const chilometro = await Chilometro.findOneAndUpdate(
    { _id: req.params.id, ...req.tenantFilter }, req.body,
    { new: true, runValidators: true }
  );
  if (!chilometro) return next(new AppError('Record chilometri non trovato.', 404));
  res.status(200).json({ status: 'success', data: { chilometro } });
});

exports.getByAnno = catchAsync(async (req, res) => {
  const userId = req.tenantUserId || req.user._id;
  const anno = parseInt(req.params.anno);
  const chilometri = await Chilometro.find({ userId, anno }).sort({ mese: 1 });
  res.status(200).json({ status: 'success', results: chilometri.length, data: { chilometri } });
});

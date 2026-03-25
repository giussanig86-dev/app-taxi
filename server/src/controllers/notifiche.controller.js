const Notifica = require('../models/Notifica');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// GET /notifiche — ultime 30 notifiche del consulente
exports.getAll = catchAsync(async (req, res) => {
  const notifiche = await Notifica
    .find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('clienteId', 'nome cognome codiceCliente');

  const nonLette = await Notifica.countDocuments({ userId: req.user._id, letta: false });
  res.json({ status: 'success', data: { notifiche, nonLette } });
});

// PATCH /notifiche/:id/letta — segna come letta
exports.segnaLetta = catchAsync(async (req, res, next) => {
  const n = await Notifica.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { letta: true },
    { new: true }
  );
  if (!n) return next(new AppError('Notifica non trovata.', 404));
  res.json({ status: 'success', data: { notifica: n } });
});

// PATCH /notifiche/leggi-tutte — segna tutte come lette
exports.segnaLetteTutte = catchAsync(async (req, res) => {
  await Notifica.updateMany({ userId: req.user._id, letta: false }, { letta: true });
  res.json({ status: 'success', data: null });
});

// DELETE /notifiche/:id
exports.delete = catchAsync(async (req, res, next) => {
  const n = await Notifica.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!n) return next(new AppError('Notifica non trovata.', 404));
  res.json({ status: 'success', data: null });
});

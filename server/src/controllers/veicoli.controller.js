/**
 * VEICOLI CONTROLLER
 *
 * GET    /veicoli            → lista veicoli (tutti, con storico)
 * GET    /veicoli/attivo     → solo il veicolo attivo corrente
 * POST   /veicoli            → crea nuovo veicolo (se non ce n'è uno attivo, o dopo storicizzazione)
 * PUT    /veicoli/:id        → modifica dati veicolo attivo
 * POST   /veicoli/:id/storicizza → chiude il veicolo con data + motivo fine uso
 * DELETE /veicoli/:id        → elimina (solo se l'utente ha un solo veicolo e non storico)
 */

const Veicolo = require('../models/Veicolo');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ── GET /veicoli — tutti i veicoli dell'utente (attivi + storici) ─────────────
exports.getAll = catchAsync(async (req, res) => {
  const veicoli = await Veicolo
    .find({ userId: req.tenantUserId })
    .sort({ attivo: -1, dataInizioUso: -1 });

  res.json({ status: 'success', data: { veicoli } });
});

// ── GET /veicoli/attivo — solo veicolo corrente ───────────────────────────────
exports.getAttivo = catchAsync(async (req, res) => {
  const veicolo = await Veicolo.findOne({ userId: req.tenantUserId, attivo: true });
  res.json({ status: 'success', data: { veicolo } });
});

// ── POST /veicoli — crea nuovo veicolo ────────────────────────────────────────
exports.create = catchAsync(async (req, res, next) => {
  // Non deve esserci già un veicolo attivo
  const esistente = await Veicolo.findOne({ userId: req.tenantUserId, attivo: true });
  if (esistente) {
    return next(new AppError(
      'Esiste già un veicolo attivo. Storicizza prima quello corrente.',
      400
    ));
  }

  const campi = ['targa', 'marca', 'modello', 'annoImmatricolazione', 'alimentazione', 'colore', 'note', 'dataInizioUso'];
  const dati = { userId: req.tenantUserId, attivo: true };
  campi.forEach(c => { if (req.body[c] !== undefined) dati[c] = req.body[c]; });

  const veicolo = await Veicolo.create(dati);
  res.status(201).json({ status: 'success', data: { veicolo } });
});

// ── PUT /veicoli/:id — modifica veicolo attivo ────────────────────────────────
exports.update = catchAsync(async (req, res, next) => {
  const campi = ['targa', 'marca', 'modello', 'annoImmatricolazione', 'alimentazione', 'colore', 'note', 'dataInizioUso'];
  const updates = {};
  campi.forEach(c => { if (req.body[c] !== undefined) updates[c] = req.body[c]; });

  const veicolo = await Veicolo.findOneAndUpdate(
    { _id: req.params.id, userId: req.tenantUserId },
    updates,
    { new: true, runValidators: true }
  );
  if (!veicolo) return next(new AppError('Veicolo non trovato.', 404));
  res.json({ status: 'success', data: { veicolo } });
});

// ── POST /veicoli/:id/storicizza — chiude il veicolo ─────────────────────────
exports.storicizza = catchAsync(async (req, res, next) => {
  const { dataFineUso, motivoFineUso } = req.body;
  if (!dataFineUso) return next(new AppError('dataFineUso obbligatoria.', 400));

  const veicolo = await Veicolo.findOneAndUpdate(
    { _id: req.params.id, userId: req.tenantUserId, attivo: true },
    {
      attivo: false,
      dataFineUso: new Date(dataFineUso),
      motivoFineUso: motivoFineUso || 'altro'
    },
    { new: true, runValidators: true }
  );
  if (!veicolo) return next(new AppError('Veicolo attivo non trovato.', 404));
  res.json({ status: 'success', data: { veicolo } });
});

// ── DELETE /veicoli/:id ───────────────────────────────────────────────────────
exports.delete = catchAsync(async (req, res, next) => {
  const veicolo = await Veicolo.findOneAndDelete({
    _id: req.params.id,
    userId: req.tenantUserId
  });
  if (!veicolo) return next(new AppError('Veicolo non trovato.', 404));
  res.json({ status: 'success', data: null });
});

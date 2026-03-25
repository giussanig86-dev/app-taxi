/**
 * DOCUMENTI CONTROLLER
 * Upload, download ed eliminazione documenti cliente
 */

const multer = require('multer');
const Documento = require('../models/Documento');
const { TIPI_DOCUMENTO } = require('../models/Documento');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Tipi MIME accettati
const MIME_ACCETTATI = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

// Multer in-memory (salviamo il Buffer in MongoDB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (MIME_ACCETTATI.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Formato file non supportato. Usa JPG, PNG, WEBP o PDF.', 400), false);
    }
  },
});

exports.uploadMiddleware = upload.single('file');

// ── Lista documenti (senza data binario) ──────────────────────────────────
exports.getAll = catchAsync(async (req, res) => {
  const documenti = await Documento.find(req.tenantFilter)
    .select('-data')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: documenti.length,
    data: { documenti },
  });
});

// ── Upload documento ──────────────────────────────────────────────────────
exports.upload = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Nessun file caricato.', 400));

  const { tipo, note } = req.body;

  if (!TIPI_DOCUMENTO.includes(tipo)) {
    return next(new AppError('Tipo documento non valido.', 400));
  }

  const userId = req.tenantUserId || req.user._id;

  const documento = await Documento.create({
    userId,
    tipo,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    data: req.file.buffer,
    uploadedBy: req.user._id,
    note: note || '',
  });

  // Rimuovi data dalla risposta
  const docPlain = documento.toObject();
  delete docPlain.data;

  res.status(201).json({
    status: 'success',
    data: { documento: docPlain },
  });
});

// ── Download documento ────────────────────────────────────────────────────
exports.download = catchAsync(async (req, res, next) => {
  // Fetch con data (bypass toJSON transform)
  const documento = await Documento.findOne({
    _id: req.params.id,
    ...req.tenantFilter,
  }).select('+data');

  if (!documento) return next(new AppError('Documento non trovato.', 404));

  res.set('Content-Type', documento.mimeType);
  res.set(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(documento.originalName)}"`
  );
  res.set('Content-Length', documento.size);
  res.send(documento.data);
});

// ── Elimina documento ─────────────────────────────────────────────────────
exports.delete = catchAsync(async (req, res, next) => {
  const documento = await Documento.findOneAndDelete({
    _id: req.params.id,
    ...req.tenantFilter,
  });

  if (!documento) return next(new AppError('Documento non trovato.', 404));

  res.status(204).json({ status: 'success', data: null });
});

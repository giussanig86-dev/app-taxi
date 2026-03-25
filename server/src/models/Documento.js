/**
 * DOCUMENTO MODEL
 * Gestisce documenti del cliente (patente, CI, CF, licenza, ecc.)
 * I file sono salvati come Binary in MongoDB (no disk storage)
 */

const mongoose = require('mongoose');

const TIPI_DOCUMENTO = [
  'patente',
  'ci',
  'cf',
  'kb',
  'iscrizione_ruolo',
  'visura',
  'qr_agenzia_entrate',
  'copia_licenza',
  'altro',
];

const documentoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID obbligatorio'],
      index: true,
    },

    tipo: {
      type: String,
      enum: {
        values: TIPI_DOCUMENTO,
        message: 'Tipo documento non valido',
      },
      required: [true, 'Tipo documento obbligatorio'],
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
      required: true,
    },

    // File salvato come Buffer direttamente in MongoDB
    data: {
      type: Buffer,
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    // Non includere il campo data nelle query list (solo quando serve il download)
    toJSON: { transform: (doc, ret) => { delete ret.data; return ret; } },
    toObject: { transform: (doc, ret) => { delete ret.data; return ret; } },
  }
);

documentoSchema.index({ userId: 1, tipo: 1 });

const Documento = mongoose.model('Documento', documentoSchema);

module.exports = Documento;
module.exports.TIPI_DOCUMENTO = TIPI_DOCUMENTO;

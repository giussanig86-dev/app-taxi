/**
 * VEICOLO MODEL
 * Storico autoveicoli di un cliente tassista.
 * Un cliente può avere più veicoli nel tempo; solo uno è attivo (attivo: true).
 * Quando si "storicizza" si imposta dataFineUso + motivoFineUso + attivo: false
 * e si può inserire un nuovo veicolo.
 */

const mongoose = require('mongoose');

const veicoloSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ── Dati identificativi ────────────────────────────────────────────────────
  targa: {
    type: String,
    required: [true, 'Targa obbligatoria'],
    uppercase: true,
    trim: true,
    maxlength: 10
  },

  marca: {
    type: String,
    required: [true, 'Marca obbligatoria'],
    trim: true,
    maxlength: 60
  },

  modello: {
    type: String,
    required: [true, 'Modello obbligatorio'],
    trim: true,
    maxlength: 80
  },

  annoImmatricolazione: {
    type: Number,
    min: 1950,
    max: new Date().getFullYear() + 1
  },

  alimentazione: {
    type: String,
    enum: ['benzina', 'diesel', 'gpl', 'metano', 'ibrido_benzina', 'ibrido_diesel', 'elettrico', 'idrogeno', 'altro'],
    default: 'benzina'
  },

  colore: {
    type: String,
    trim: true,
    maxlength: 40
  },

  note: {
    type: String,
    maxlength: 500
  },

  // ── Periodo d'uso ──────────────────────────────────────────────────────────
  dataInizioUso: {
    type: Date,
    default: Date.now
  },

  // Compilato quando si storicizza (vendita / permuta)
  dataFineUso: {
    type: Date,
    default: null
  },

  motivoFineUso: {
    type: String,
    enum: ['vendita', 'permuta', 'rottamazione', 'altro', null],
    default: null
  },

  // ── Stato ─────────────────────────────────────────────────────────────────
  attivo: {
    type: Boolean,
    default: true,
    index: true
  },

}, { timestamps: true });

veicoloSchema.index({ userId: 1, attivo: 1 });

const Veicolo = mongoose.model('Veicolo', veicoloSchema);
module.exports = Veicolo;

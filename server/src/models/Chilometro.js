/**
 * CHILOMETRO MODEL
 */

const mongoose = require('mongoose');

const chilometroSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  anno: { type: Number, required: true, index: true },

  mese: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
    index: true
  },

  kmTotali: {
    type: Number,
    required: true,
    min: 0
  },

  kmLavorativi: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) { return v <= this.kmTotali; },
      message: 'Km lavorativi non possono superare km totali'
    }
  },

  insertMode: {
    type: String,
    enum: ['manuale', 'vocale'],
    default: 'manuale'
  }
}, {
  timestamps: true
});

chilometroSchema.index({ userId: 1, anno: 1, mese: 1 }, { unique: true });

const Chilometro = mongoose.model('Chilometro', chilometroSchema);

module.exports = Chilometro;

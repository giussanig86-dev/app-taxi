/**
 * SCAGLIONE IRPEF MODEL
 */

const mongoose = require('mongoose');

const scaglioneIrpefSchema = new mongoose.Schema({
  anno: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },

  scaglioni: [{
    limite_superiore: { type: Number, required: true },
    aliquota: { type: Number, required: true, min: 0, max: 1 }
  }],

  note: String
}, {
  timestamps: true
});

const ScaglioneIrpef = mongoose.model('ScaglioneIrpef', scaglioneIrpefSchema);

module.exports = ScaglioneIrpef;

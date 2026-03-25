/**
 * STATO LOG MODEL
 * Traccia le variazioni di stato del cliente (attivo → sospeso → cessato).
 */
const mongoose = require('mongoose');

const statoLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  stato: {
    type: String,
    enum: ['attivo', 'sospeso', 'cessato'],
    required: true
  },
  dataVariazione: {
    type: Date,
    default: Date.now
  },
  motivazione: {
    type: String,
    maxlength: 500,
    default: ''
  },
  cambiatoDa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: false });

module.exports = mongoose.model('StatoLog', statoLogSchema);

/**
 * NOTIFICA MODEL
 * Notifiche in-app per i consulenti.
 * Es. cambio veicolo da parte del cliente.
 */
const mongoose = require('mongoose');

const notificaSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tipo: {
    type: String,
    enum: ['cambio_veicolo', 'cambio_stato', 'altro'],
    required: true
  },
  titolo: {
    type: String,
    required: true,
    maxlength: 100
  },
  messaggio: {
    type: String,
    required: true,
    maxlength: 500
  },
  letta: {
    type: Boolean,
    default: false,
    index: true
  },
  // Riferimento opzionale al cliente coinvolto
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  datiExtra: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true, collection: 'notifiche_sdi' });

notificaSchema.index({ userId: 1, letta: 1, createdAt: -1 });

module.exports = mongoose.model('Notifica', notificaSchema);

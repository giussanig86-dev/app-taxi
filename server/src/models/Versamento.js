/**
 * VERSAMENTO MODEL
 * Gestisce versamenti imposte e contributi
 */

const mongoose = require('mongoose');

const versamentoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  anno: { type: Number, required: true, index: true },

  tipoVersamento: {
    type: String,
    enum: [
      'irpef_acconto', 'irpef_saldo',
      'inps_acconto', 'inps_saldo',
      'imposta_sostitutiva_acconto', 'imposta_sostitutiva_saldo'
    ],
    required: true,
    index: true
  },

  competenzaAnno: { type: Number, required: true, index: true },

  importo: {
    type: Number,
    required: true,
    min: [0.01, 'Importo deve essere positivo']
  },

  dataVersamento: Date,
  dataScadenza: { type: Date, required: true, index: true },
  pagato: { type: Boolean, default: false, index: true },

  categoriaFiscale: {
    type: String,
    enum: ['irpef', 'inps', 'imposta_sostitutiva'],
    required: true,
    index: true
  },

  tipoQuota: {
    type: String,
    enum: ['acconto', 'saldo'],
    required: true
  },

  metodoPagamento: {
    type: String,
    enum: ['f24', 'bonifico', 'altro']
  },

  ricevutaF24: String,

  insertMode: {
    type: String,
    enum: ['manuale', 'vocale', 'automatico'],
    default: 'manuale'
  },

  approvato: { type: Boolean, default: false, index: true },
  approvatoDa: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dataApprovazione: Date,
  note: { type: String, trim: true, maxlength: 500 }

}, {
  timestamps: true
});

// ============ INDICI ============
versamentoSchema.index({ userId: 1, anno: -1 });
versamentoSchema.index({ userId: 1, categoriaFiscale: 1, competenzaAnno: 1 });
versamentoSchema.index({ userId: 1, dataScadenza: 1, pagato: 1 });

// ============ VIRTUALS ============
versamentoSchema.virtual('isScaduto').get(function() {
  if (this.pagato) return false;
  return new Date() > this.dataScadenza;
});

versamentoSchema.virtual('giorniMancanti').get(function() {
  if (this.pagato) return null;
  const diff = this.dataScadenza - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

versamentoSchema.virtual('isImminente').get(function() {
  const giorni = this.giorniMancanti;
  return giorni !== null && giorni >= 0 && giorni <= 7;
});

// ============ METODI ISTANZA ============
versamentoSchema.methods.marcaPagato = async function(metodo, dataVersamento = new Date()) {
  this.pagato = true;
  this.dataVersamento = dataVersamento;
  this.metodoPagamento = metodo;
  await this.save();
};

// ============ METODI STATICI ============
versamentoSchema.statics.totaleAnnoCategoria = async function(userId, anno, categoria) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        competenzaAnno: anno,
        categoriaFiscale: categoria,
        pagato: true
      }
    },
    { $group: { _id: null, totale: { $sum: '$importo' } } }
  ]);

  return result[0]?.totale || 0;
};

versamentoSchema.statics.prossimeScadenze = async function(userId, giorni = 60) {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() + giorni);

  return await this.find({
    userId: userId,
    pagato: false,
    dataScadenza: { $gte: new Date(), $lte: dataLimite }
  }).sort({ dataScadenza: 1 });
};

versamentoSchema.statics.scaduti = async function(userId) {
  return await this.find({
    userId: userId,
    pagato: false,
    dataScadenza: { $lt: new Date() }
  }).sort({ dataScadenza: 1 });
};

const Versamento = mongoose.model('Versamento', versamentoSchema);

module.exports = Versamento;

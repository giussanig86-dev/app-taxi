const mongoose = require('mongoose');

const FatturaSchema = new mongoose.Schema({
  idSdi:        String,
  cfDelegante:  String,
  clienteId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  consulenteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  xmlRaw:       String,
  datiParsati: {
    numero: String,
    data:   Date,
    cedente: { nome: String, piva: String, codiceFiscale: String },
    totale: Number,
    iva:    Number,
  },
  stato:   { type: String, enum: ['ricevuta', 'accettata', 'rifiutata', 'scartata'], index: true },
  corsaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Corrispettivo' },
}, { timestamps: true, collection: 'fatture' });

FatturaSchema.index({ clienteId: 1, 'datiParsati.data': -1 });
FatturaSchema.index({ consulenteId: 1, 'datiParsati.data': -1 });

// Totale fatture accettate per un cliente in un anno (usato dalla dashboard)
FatturaSchema.statics.totaleAnno = async function(clienteId, anno) {
  const result = await this.aggregate([
    {
      $match: {
        clienteId: new mongoose.Types.ObjectId(clienteId),
        stato: 'accettata',
        'datiParsati.data': {
          $gte: new Date(anno, 0, 1),
          $lt:  new Date(anno + 1, 0, 1),
        },
      },
    },
    { $group: { _id: null, totale: { $sum: '$datiParsati.totale' }, count: { $sum: 1 } } },
  ]);
  return result[0] || { totale: 0, count: 0 };
};

// Fatture passive non hanno scadenza — restituisce array vuoto per compatibilità dashboard
FatturaSchema.statics.fattureScadute = async function() {
  return [];
};

module.exports = mongoose.model('Fattura', FatturaSchema);

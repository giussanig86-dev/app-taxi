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

// Totale fatture accettate per un anno. filter: { clienteId } oppure { consulenteId }
FatturaSchema.statics.totaleAnno = async function(filter, anno) {
  const match = { stato: 'accettata', ...buildObjIdFilter(filter) };
  match['datiParsati.data'] = { $gte: new Date(anno, 0, 1), $lt: new Date(anno + 1, 0, 1) };

  const result = await this.aggregate([
    { $match: match },
    { $group: { _id: null, totale: { $sum: '$datiParsati.totale' }, count: { $sum: 1 } } },
  ]);
  return result[0] || { totale: 0, count: 0 };
};

// Fatture ricevute ma non ancora elaborate da più di `giorni` giorni.
// filter: { clienteId } oppure { consulenteId }
FatturaSchema.statics.fattureScadute = async function(filter, giorni = 30) {
  const soglia = new Date();
  soglia.setDate(soglia.getDate() - giorni);

  return this.find({
    ...buildObjIdFilter(filter),
    stato: 'ricevuta',
    createdAt: { $lt: soglia },
  }).sort({ createdAt: 1 });
};

function buildObjIdFilter(filter) {
  const out = {};
  for (const [k, v] of Object.entries(filter)) {
    out[k] = v instanceof mongoose.Types.ObjectId ? v : new mongoose.Types.ObjectId(String(v));
  }
  return out;
}

module.exports = mongoose.model('Fattura', FatturaSchema);

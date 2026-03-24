/**
 * CONNESSIONE MONGODB
 */

const mongoose = require('mongoose');
const { MONGO_URI, MONGO_URI_STANDARD } = require('./env');

const isSrvDnsError = (err) => {
  const msg = err.message || '';
  return (
    msg.includes('querySrv') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('getaddrinfo') ||
    msg.includes('DNS') ||
    (err.code && ['ENOTFOUND', 'EAI_AGAIN', 'ETIMEOUT'].includes(err.code))
  );
};

const connectDB = async () => {
  // Usa la URI standard (non-SRV) se disponibile, altrimenti quella principale
  const uri = MONGO_URI_STANDARD || MONGO_URI;
  const isSrv = uri.startsWith('mongodb+srv://');

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`\u{1F4E1} MongoDB connesso: ${conn.connection.host}`);
  } catch (error) {
    if (isSrv && isSrvDnsError(error)) {
      console.error('\u274C Errore DNS/SRV: il router sta bloccando la risoluzione mongodb+srv://');
      console.error('\u{1F4A1} Soluzione: usa la connection string STANDARD (senza +srv) da MongoDB Atlas.');
      console.error('   1. Vai su https://cloud.mongodb.com → Clusters → Connect → Drivers');
      console.error('   2. Seleziona "Node.js", versione 2.2.12 or later');
      console.error('   3. Copia la stringa che inizia con mongodb:// (non mongodb+srv://)');
      console.error('   4. Aggiungila nel .env come: MONGO_URI_STANDARD=mongodb://...');
      console.error(`\u26A0\uFE0F  Dettaglio errore: ${error.message}`);
    } else {
      console.error(`\u274C Errore connessione MongoDB: ${error.message}`);
    }
    process.exit(1);
  }
};

// Gestione eventi connessione
mongoose.connection.on('disconnected', () => {
  console.log('\u26A0\uFE0F  MongoDB disconnesso');
});

mongoose.connection.on('error', (err) => {
  console.error(`\u274C Errore MongoDB: ${err}`);
});

module.exports = connectDB;

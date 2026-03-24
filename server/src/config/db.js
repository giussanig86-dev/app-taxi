/**
 * CONNESSIONE MONGODB
 */

const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`\u{1F4E1} MongoDB connesso: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\u274C Errore connessione MongoDB: ${error.message}`);
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

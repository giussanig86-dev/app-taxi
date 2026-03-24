/**
 * CONFIGURAZIONE VARIABILI AMBIENTE
 * Valida che tutte le variabili necessarie siano presenti
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const requiredVars = ['MONGO_URI', 'JWT_SECRET', 'ENCRYPTION_KEY'];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`\u274C Variabile ambiente mancante: ${varName}`);
    console.error('Copia .env.example in .env e configura le variabili');
    process.exit(1);
  }
}

module.exports = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173'
};

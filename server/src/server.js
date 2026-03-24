/**
 * SERVER ENTRY POINT
 */

const { PORT } = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

const startServer = async () => {
  // Connetti al database
  await connectDB();

  // Avvia server
  app.listen(PORT, () => {
    console.log(`\u{1F680} Server avviato su porta ${PORT}`);
    console.log(`\u{1F4CD} API: http://localhost:${PORT}/api/v1`);
    console.log(`\u{1F3E5} Health: http://localhost:${PORT}/api/health`);
  });
};

startServer().catch(err => {
  console.error('\u274C Errore avvio server:', err);
  process.exit(1);
});

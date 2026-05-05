/**
 * SERVER ENTRY POINT
 */

const { PORT } = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server avviato su porta ${PORT}`);
    console.log(`API: http://localhost:${PORT}/api/v1`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
  });
};

startServer().catch(err => {
  console.error('Errore avvio server:', err);
  process.exit(1);
});

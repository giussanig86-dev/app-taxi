/**
 * SERVER ENTRY POINT
 */

const { PORT } = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const cron = require('node-cron');

const startServer = async () => {
  await connectDB();

  // \u2500\u2500\u2500 CRON: Sync fatture AdE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // Ogni giorno alle 06:00 scarica le fatture passive di tutti i clienti
  // il cui consulente ha la connessione AdE attiva e syncFrequency = 'daily'
  if (process.env.ADE_CLIENT_ID) {
    const { syncAllClienti } = require('./services/syncFatture');
    const User = require('./models/User');

    cron.schedule('0 6 * * *', async () => {
      console.log('[ADE-CRON] Avvio sync giornaliera fatture passive...');
      try {
        const consulenti = await User.find({
          ruolo: 'consulente',
          'adeConnection.enabled': true,
          'adeConnection.syncFrequency': 'daily',
        }).select('_id nome');

        for (const c of consulenti) {
          try {
            await syncAllClienti(c._id.toString());
            console.log(`[ADE-CRON] OK: ${c.nome}`);
          } catch (err) {
            console.error(`[ADE-CRON] Errore ${c.nome}:`, err.message);
          }
        }
      } catch (err) {
        console.error('[ADE-CRON] Errore cron:', err.message);
      }
    }, { timezone: 'Europe/Rome' });

    // Sync oraria per consulenti con syncFrequency = 'hourly'
    cron.schedule('0 * * * *', async () => {
      try {
        const consulenti = await User.find({
          ruolo: 'consulente',
          'adeConnection.enabled': true,
          'adeConnection.syncFrequency': 'hourly',
        }).select('_id nome');

        for (const c of consulenti) {
          try { await syncAllClienti(c._id.toString()); }
          catch (err) { console.error(`[ADE-CRON-H] Errore ${c.nome}:`, err.message); }
        }
      } catch (err) {
        console.error('[ADE-CRON-H]', err.message);
      }
    }, { timezone: 'Europe/Rome' });

    console.log('Cron AdE attivo (sync giornaliera 06:00 + oraria)');
  }

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

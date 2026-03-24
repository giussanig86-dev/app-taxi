/**
 * SCRIPT INIZIALIZZAZIONE DATABASE
 * Calcolatore Forfettario SaaS
 *
 * USO: npm run seed (dalla root)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import modelli
const User = require('../models/User');
const Corrispettivo = require('../models/Corrispettivo');
const Costo = require('../models/Costo');
const Versamento = require('../models/Versamento');
const Chilometro = require('../models/Chilometro');
const ScaglioneIrpef = require('../models/ScaglioneIrpef');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/calcolatore-forfettario';

async function initializeDatabase() {
  try {
    console.log('\u{1F680} Inizializzazione Database...\n');

    await mongoose.connect(MONGO_URI);
    console.log('\u2705 Connesso a MongoDB\n');

    if (process.env.DROP_EXISTING === 'true') {
      console.log('\u26A0\uFE0F  Cancellazione database esistente...');
      await mongoose.connection.dropDatabase();
      console.log('\u2705 Database cancellato\n');
    }

    // Crea utenti
    console.log('\u{1F331} Creazione utenti...');

    const superAdmin = await User.create({
      nome: 'Admin',
      cognome: 'Sistema',
      email: 'admin@calcolatore.it',
      password: 'SuperAdmin123!',
      ruolo: 'super_admin',
      telefono: '+39 02 12345678'
    });
    console.log(`   \u2713 Super Admin: ${superAdmin.email}`);

    const consulente = await User.create({
      nome: 'Dott. Marco',
      cognome: 'Rossi',
      email: 'consulente@studio.it',
      password: 'Consulente123!',
      ruolo: 'consulente',
      telefono: '+39 02 98765432',
      consulente: {
        piano: 'pro',
        limiti: {
          maxClienti: 50,
          maxStorage: 20480,
          hasFatturazioneElettronica: true,
          hasWhiteLabel: false,
          hasPrioritySupport: true
        },
        utilizzo: { clientiAttivi: 0, storageUsato: 0 },
        billing: {
          abbonamentoPagato: true,
          dataScadenza: new Date('2026-12-31'),
          metodoPagamento: 'stripe',
          importoMensile: 49
        },
        branding: {
          nomeStudio: 'Studio Rossi Commercialisti',
          indirizzo: 'Via Milano 10, 20100 Milano'
        }
      }
    });
    console.log(`   \u2713 Consulente: ${consulente.email}`);

    const cliente = await User.create({
      nome: 'Mario',
      cognome: 'Rossi',
      email: 'mario.rossi@taxi.it',
      password: 'Cliente123!',
      ruolo: 'cliente',
      telefono: '+39 333 1234567',
      consulenteId: consulente._id,
      partitaIva: '12345678901',
      codiceFiscale: 'RSSMRA80A01H501Z',
      regimeFiscale: 'forfettario',
      coefficienteRedditivita: 0.67,
      aliquotaForfettaria: 0.15,
      aliquotaINPS: 0.2448,
      indirizzo: {
        via: 'Via Roma 123',
        cap: '20100',
        comune: 'Milano',
        provincia: 'MI'
      },
      apiCube: {
        enabled: false,
        syncFrequency: 'daily',
        autoApprove: false
      }
    });
    console.log(`   \u2713 Cliente: ${cliente.email}`);

    // Aggiorna counter consulente
    await User.updateOne(
      { _id: consulente._id },
      { $set: { 'consulente.utilizzo.clientiAttivi': 1 } }
    );

    // Crea corrispettivi (ultimi 90 giorni)
    console.log('\n\u{1F4B0} Creazione corrispettivi...');
    const corrispettivi = [];
    const descrizioni = ['Corsa centro', 'Aeroporto Malpensa', 'Stazione Centrale', 'Cliente abituale', 'Fiera', 'Ospedale'];
    const metodi = ['contante', 'carta', 'pos'];

    for (let i = 0; i < 90; i++) {
      const data = new Date();
      data.setDate(data.getDate() - i);
      const numCorse = Math.floor(Math.random() * 4) + 3; // 3-6 corse

      for (let j = 0; j < numCorse; j++) {
        corrispettivi.push({
          userId: cliente._id,
          data: data,
          importo: Math.round((Math.random() * 80 + 15) * 100) / 100,
          descrizione: descrizioni[Math.floor(Math.random() * descrizioni.length)],
          metodoPagamento: metodi[Math.floor(Math.random() * metodi.length)],
          insertMode: 'manuale',
          verificato: true
        });
      }
    }
    await Corrispettivo.insertMany(corrispettivi);
    console.log(`   \u2713 ${corrispettivi.length} corrispettivi creati`);

    // Crea costi
    console.log('\u{1F4C4} Creazione costi...');
    const oggi = new Date();
    const costi = [
      {
        userId: cliente._id, tipoCosto: 'costo_manuale',
        data: new Date(oggi.getFullYear(), 0, 15), importo: 75.50,
        categoria: 'carburante', descrizione: 'Rifornimento Eni Via Torino',
        competenzaAnno: oggi.getFullYear(), insertMode: 'manuale',
        approvato: true, approvatoDa: consulente._id, dataApprovazione: new Date(oggi.getFullYear(), 0, 16)
      },
      {
        userId: cliente._id, tipoCosto: 'costo_manuale',
        data: new Date(oggi.getFullYear(), 0, 28), importo: 62.30,
        categoria: 'carburante', descrizione: 'Rifornimento Q8',
        competenzaAnno: oggi.getFullYear(), insertMode: 'manuale',
        approvato: true, approvatoDa: consulente._id, dataApprovazione: new Date(oggi.getFullYear(), 0, 29)
      },
      {
        userId: cliente._id, tipoCosto: 'costo_manuale',
        data: new Date(oggi.getFullYear(), 1, 5), importo: 450.00,
        categoria: 'manutenzione', descrizione: 'Cambio gomme invernali',
        competenzaAnno: oggi.getFullYear(), insertMode: 'manuale',
        approvato: false
      },
      {
        userId: cliente._id, tipoCosto: 'costo_manuale',
        data: new Date(oggi.getFullYear(), 1, 10), importo: 1200.00,
        categoria: 'assicurazione', descrizione: 'RCA annuale UnipolSai',
        competenzaAnno: oggi.getFullYear(), insertMode: 'manuale',
        approvato: true, approvatoDa: consulente._id, dataApprovazione: new Date(oggi.getFullYear(), 1, 11)
      },
      {
        userId: cliente._id, tipoCosto: 'costo_manuale',
        data: new Date(oggi.getFullYear(), 1, 1), importo: 350.00,
        categoria: 'bollo', descrizione: 'Bollo auto annuale',
        competenzaAnno: oggi.getFullYear(), insertMode: 'manuale',
        approvato: true, approvatoDa: consulente._id, dataApprovazione: new Date(oggi.getFullYear(), 1, 2)
      },
      {
        userId: cliente._id, tipoCosto: 'costo_manuale',
        data: new Date(oggi.getFullYear(), 1, 14), importo: 85.00,
        categoria: 'pedaggi', descrizione: 'Telepass febbraio',
        competenzaAnno: oggi.getFullYear(), insertMode: 'manuale',
        approvato: false
      }
    ];
    await Costo.insertMany(costi);
    console.log(`   \u2713 ${costi.length} costi creati`);

    // Crea versamenti
    console.log('\u{1F4CA} Creazione versamenti...');
    const anno = oggi.getFullYear();
    const versamenti = [
      {
        userId: cliente._id, anno, tipoVersamento: 'inps_acconto',
        competenzaAnno: anno, importo: 1115.00,
        dataScadenza: new Date(anno, 2, 16), pagato: false,
        categoriaFiscale: 'inps', tipoQuota: 'acconto',
        insertMode: 'manuale', approvato: true
      },
      {
        userId: cliente._id, anno, tipoVersamento: 'imposta_sostitutiva_acconto',
        competenzaAnno: anno, importo: 780.00,
        dataScadenza: new Date(anno, 5, 30), pagato: false,
        categoriaFiscale: 'imposta_sostitutiva', tipoQuota: 'acconto',
        insertMode: 'manuale', approvato: true
      },
      {
        userId: cliente._id, anno, tipoVersamento: 'inps_saldo',
        competenzaAnno: anno - 1, importo: 2230.00,
        dataScadenza: new Date(anno, 5, 30), pagato: false,
        categoriaFiscale: 'inps', tipoQuota: 'saldo',
        insertMode: 'manuale', approvato: true
      },
      {
        userId: cliente._id, anno, tipoVersamento: 'imposta_sostitutiva_saldo',
        competenzaAnno: anno - 1, importo: 1560.00,
        dataScadenza: new Date(anno, 5, 30), pagato: false,
        categoriaFiscale: 'imposta_sostitutiva', tipoQuota: 'saldo',
        insertMode: 'manuale', approvato: true
      }
    ];
    await Versamento.insertMany(versamenti);
    console.log(`   \u2713 ${versamenti.length} versamenti creati`);

    // Crea chilometri
    console.log('\u{1F697} Creazione chilometri...');
    const chilometri = [];
    for (let m = 0; m < 3; m++) {
      const mese = oggi.getMonth() - m;
      if (mese >= 0) {
        chilometri.push({
          userId: cliente._id,
          anno: oggi.getFullYear(),
          mese: mese + 1,
          kmTotali: Math.floor(Math.random() * 1000) + 2500,
          kmLavorativi: Math.floor(Math.random() * 800) + 2000,
          insertMode: 'manuale'
        });
      }
    }
    await Chilometro.insertMany(chilometri);
    console.log(`   \u2713 ${chilometri.length} record chilometri creati`);

    // Scaglioni IRPEF 2026
    console.log('\u{1F4CB} Configurazione scaglioni IRPEF...');
    await ScaglioneIrpef.create({
      anno: 2026,
      scaglioni: [
        { limite_superiore: 28000, aliquota: 0.23 },
        { limite_superiore: 50000, aliquota: 0.35 },
        { limite_superiore: 100000, aliquota: 0.43 },
        { limite_superiore: 999999999, aliquota: 0.47 }
      ],
      note: 'Scaglioni IRPEF aggiornati Legge di Bilancio 2026'
    });
    console.log('   \u2713 Scaglioni IRPEF 2026 configurati');

    // Verifica
    console.log('\n\u{1F50D} Verifica database...');
    const stats = {
      users: await User.countDocuments(),
      corrispettivi: await Corrispettivo.countDocuments(),
      costi: await Costo.countDocuments(),
      versamenti: await Versamento.countDocuments(),
      chilometri: await Chilometro.countDocuments()
    };
    console.log(`   Users: ${stats.users}`);
    console.log(`   Corrispettivi: ${stats.corrispettivi}`);
    console.log(`   Costi: ${stats.costi}`);
    console.log(`   Versamenti: ${stats.versamenti}`);
    console.log(`   Chilometri: ${stats.chilometri}`);

    console.log('\n\u2705 Inizializzazione completata!\n');
    console.log('\u{1F4CB} CREDENZIALI ACCESSO:');
    console.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
    console.log('Super Admin:  admin@calcolatore.it / SuperAdmin123!');
    console.log('Consulente:   consulente@studio.it / Consulente123!');
    console.log('Cliente:      mario.rossi@taxi.it / Cliente123!');
    console.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

    process.exit(0);

  } catch (error) {
    console.error('\u274C Errore inizializzazione:', error);
    process.exit(1);
  }
}

initializeDatabase();

/**
 * SYNC FATTURE PASSIVE da AdE Cassetto Fiscale
 *
 * Usa il certificato CNS/Entratel (mTLS) del consulente per scaricare
 * automaticamente le fatture passive dei clienti e salvarle come Costo.
 * Evita duplicati tramite sdi.identificativoSdi (unique sparse index).
 */

const User      = require('../models/User');
const Costo     = require('../models/Costo');
const adeClient = require('./adeClient');
const { parseFatturaXML } = require('./fatturaParser');

/**
 * Sincronizza le fatture passive di UN cliente.
 *
 * @param {Object} consulente - documento User del consulente (con adeConnection)
 * @param {Object} cliente    - documento User del cliente
 * @param {{ dataDa, dataA }} opts  - YYYY-MM-DD; default: ultimi 90 giorni / dall'ultima sync
 * @returns {{ importate, duplicate, errori, totale, dettagli }}
 */
async function syncClienteFatture(consulente, cliente, opts = {}) {
  const cf = cliente.codiceFiscale || cliente.partitaIva;
  if (!cf) throw new Error(`Cliente ${cliente._id} senza codice fiscale / partita IVA`);

  const dataA  = opts.dataA  || formatDate(new Date());
  const dataDa = opts.dataDa || formatDate(
    consulente.adeConnection?.lastSyncAt
      ? new Date(consulente.adeConnection.lastSyncAt)
      : subDays(new Date(), 90)
  );

  const agent = adeClient.agentDaUser(consulente);

  let lista;
  try {
    lista = await adeClient.listFatturePassive(agent, cf, { dataDa, dataA });
  } catch (err) {
    throw new Error(`Errore lista fatture AdE per ${cf}: ${err.message}`);
  }

  const fatture = Array.isArray(lista) ? lista : (lista?.fatture ?? lista?.items ?? []);

  const dettagli = [];
  let importate = 0, duplicate = 0, errori = 0;

  for (const f of fatture) {
    const fatturaId = f.id ?? f.identificativo ?? f.progressivoInvio;
    try {
      const xmlBuf   = await adeClient.downloadFatturaXML(agent, cf, fatturaId);
      const datiCosto = await parseFatturaXML(xmlBuf);
      datiCosto.userId = cliente._id;

      try {
        await Costo.create(datiCosto);
        importate++;
        dettagli.push({ id: fatturaId, stato: 'importata', numero: datiCosto.sdi.numeroFattura });
      } catch (dbErr) {
        if (dbErr.code === 11000) {
          duplicate++;
          dettagli.push({ id: fatturaId, stato: 'duplicato' });
        } else {
          throw dbErr;
        }
      }
    } catch (err) {
      errori++;
      dettagli.push({ id: fatturaId, stato: 'errore', messaggio: err.message });
    }
  }

  return { importate, duplicate, errori, totale: fatture.length, dettagli };
}

/**
 * Sincronizza tutti i clienti di un consulente.
 *
 * @param {string} consulenteId
 * @param {{ dataDa, dataA }} opts
 */
async function syncAllClienti(consulenteId, opts = {}) {
  const consulente = await User.findById(consulenteId).select('adeConnection nome');
  if (!consulente?.adeConnection?.enabled) {
    throw new Error('Nessun certificato CNS caricato. Vai in Impostazioni → AdE.');
  }

  const clienti = await User.find({
    consulenteId,
    ruolo:        'cliente',
    statoCliente: { $ne: 'cessato' },
  }).select('nome cognome codiceFiscale partitaIva');

  consulente.adeConnection.lastSyncStatus = 'in_progress';
  await consulente.save();

  const risultati = [];
  let haErrori = false;

  for (const cliente of clienti) {
    try {
      const res = await syncClienteFatture(consulente, cliente, opts);
      risultati.push({ clienteId: cliente._id, nome: `${cliente.nome} ${cliente.cognome}`, ...res });
    } catch (err) {
      haErrori = true;
      risultati.push({ clienteId: cliente._id, nome: `${cliente.nome} ${cliente.cognome}`, errore: err.message });
    }
  }

  consulente.adeConnection.lastSyncAt     = new Date();
  consulente.adeConnection.lastSyncStatus = haErrori ? 'error' : 'ok';
  consulente.adeConnection.lastSyncError  = haErrori
    ? risultati.filter(r => r.errore).map(r => r.nome).join(', ')
    : null;
  await consulente.save();

  return risultati;
}

function formatDate(d) { return d.toISOString().split('T')[0]; }
function subDays(d, n)  { const r = new Date(d); r.setDate(r.getDate() - n); return r; }

module.exports = { syncClienteFatture, syncAllClienti };

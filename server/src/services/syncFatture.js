/**
 * SYNC FATTURE PASSIVE da AdE Cassetto Fiscale
 *
 * Scarica automaticamente le fatture passive dei clienti e le salva come Costo.
 * Evita duplicati tramite sdi.identificativoSdi (unique sparse index).
 */

const User   = require('../models/User');
const Costo  = require('../models/Costo');
const adeClient = require('./adeClient');
const { parseFatturaXML } = require('./fatturaParser');

/**
 * Sincronizza le fatture passive di UN cliente.
 *
 * @param {Object} consulente - documento User del consulente (con adeConnection)
 * @param {Object} cliente    - documento User del cliente
 * @param {Object} opts       - { dataDa, dataA } YYYY-MM-DD; default: ultimo mese
 * @returns {{ importate, duplicate, errori, dettagli }}
 */
async function syncClienteFatture(consulente, cliente, opts = {}) {
  const cf = cliente.codiceFiscale || cliente.partitaIva;
  if (!cf) throw new Error(`Cliente ${cliente._id} senza codice fiscale / partita IVA`);

  // Intervallo di default: dall'ultima sync a oggi
  const dataA  = opts.dataA  || formatDate(new Date());
  const dataDa = opts.dataDa || formatDate(
    consulente.adeConnection?.lastSyncAt
      ? new Date(consulente.adeConnection.lastSyncAt)
      : subDays(new Date(), 90)          // prima sync: ultimi 90 giorni
  );

  const accessToken = await adeClient.getValidToken(consulente);

  let lista;
  try {
    lista = await adeClient.listFatturePassive(accessToken, cf, { dataDa, dataA });
  } catch (err) {
    throw new Error(`Errore lista fatture AdE per ${cf}: ${err.message}`);
  }

  // La risposta AdE è un array di oggetti con almeno { id, progressivoInvio }
  const fatture = Array.isArray(lista) ? lista : (lista?.fatture ?? lista?.items ?? []);

  const dettagli  = [];
  let importate   = 0;
  let duplicate   = 0;
  let errori      = 0;

  for (const f of fatture) {
    const fatturaId = f.id ?? f.identificativo ?? f.progressivoInvio;
    try {
      // Scarica XML
      const xmlBuf = await adeClient.downloadFatturaXML(accessToken, cf, fatturaId);

      // Parsifica
      const datiCosto = await parseFatturaXML(xmlBuf);
      datiCosto.userId = cliente._id;

      // Salva (ignora duplicate per identificativoSdi)
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

  return { importate, duplicate, errori, dettagli, totale: fatture.length };
}

/**
 * Sincronizza tutti i clienti di un consulente.
 * Aggiorna lastSyncAt e lastSyncStatus sul consulente.
 *
 * @param {string} consulenteId
 * @param {Object} opts - opzionale { dataDa, dataA }
 * @returns {Array<{ clienteId, nome, ...risultato }>}
 */
async function syncAllClienti(consulenteId, opts = {}) {
  const consulente = await User.findById(consulenteId).select(
    '+adeConnection.accessToken +adeConnection.refreshToken'
  );
  if (!consulente?.adeConnection?.enabled) {
    throw new Error('AdE non connessa. Esegui il login SPID dalla pagina impostazioni.');
  }

  const clienti = await User.find({
    consulenteId,
    ruolo: 'cliente',
    statoCliente: { $ne: 'cessato' },
  }).select('nome cognome codiceFiscale partitaIva');

  // Aggiorna stato sync in corso
  consulente.adeConnection.lastSyncStatus = 'in_progress';
  await consulente.save();

  const risultati = [];
  let haErrori = false;

  for (const cliente of clienti) {
    try {
      const res = await syncClienteFatture(consulente, cliente, opts);
      risultati.push({
        clienteId: cliente._id,
        nome: `${cliente.nome} ${cliente.cognome}`,
        ...res,
      });
    } catch (err) {
      haErrori = true;
      risultati.push({
        clienteId: cliente._id,
        nome: `${cliente.nome} ${cliente.cognome}`,
        errore: err.message,
      });
    }
  }

  // Aggiorna consulente
  consulente.adeConnection.lastSyncAt     = new Date();
  consulente.adeConnection.lastSyncStatus = haErrori ? 'error' : 'ok';
  consulente.adeConnection.lastSyncError  = haErrori
    ? risultati.filter(r => r.errore).map(r => r.nome).join(', ')
    : null;
  await consulente.save();

  return risultati;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function subDays(d, days) {
  const r = new Date(d);
  r.setDate(r.getDate() - days);
  return r;
}

module.exports = { syncClienteFatture, syncAllClienti };

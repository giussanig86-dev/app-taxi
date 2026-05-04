/**
 * FATTURA PA XML PARSER
 * Converte XML FatturaPA (formato SDI) in oggetto Costo
 * Supporta: FPR12 (B2B/B2C), FPA12 (PA)
 */

const xml2js = require('xml2js');

const parser = new xml2js.Parser({
  explicitArray: false,
  ignoreAttrs: false,
  mergeAttrs: true,
  trim: true,
});

// Normalizza valore singolo o array → sempre stringa
function val(v) {
  if (Array.isArray(v)) return v[0];
  return v ?? '';
}

// Normalizza numero italiano/europeo → float
function parseImporto(s) {
  if (!s) return 0;
  const str = String(s).replace(',', '.');
  return parseFloat(str) || 0;
}

// Estrae il primo body (le fatture multi-body sono rare ma supportate)
function getBody(root) {
  const body = root.FatturaElettronicaBody;
  return Array.isArray(body) ? body[0] : body;
}

// Categorizzazione automatica dalla descrizione/causale
function indovinaCategoria(testo) {
  if (!testo) return 'altro';
  const t = testo.toLowerCase();
  if (/carburant|benzin|diesel|gasolio|metano|gpl/.test(t)) return 'carburante';
  if (/assicuraz|polizza|rca|kasko/.test(t)) return 'assicurazione';
  if (/manutenz|riparaz|officin|tagliand|pneumatic|gomm/.test(t)) return 'manutenzione';
  if (/bollo|tassa automob/.test(t)) return 'bollo';
  if (/pedaggio|autostrad|telepass/.test(t)) return 'pedaggi';
  if (/parcheggio|sosta|parking/.test(t)) return 'parcheggi';
  return 'altro';
}

/**
 * Parsifica una stringa XML FatturaPA e restituisce i dati pronti per creare un Costo.
 * @param {string|Buffer} xmlInput
 * @returns {Promise<Object>} dati parziali Costo (senza userId / approvato)
 */
async function parseFatturaXML(xmlInput) {
  const xmlStr = Buffer.isBuffer(xmlInput) ? xmlInput.toString('utf8') : xmlInput;

  let parsed;
  try {
    parsed = await parser.parseStringPromise(xmlStr);
  } catch (err) {
    throw new Error(`XML non valido: ${err.message}`);
  }

  const root = parsed.FatturaElettronica ?? parsed['p:FatturaElettronica'] ?? Object.values(parsed)[0];
  if (!root) throw new Error('Struttura FatturaPA non riconosciuta');

  const header = root.FatturaElettronicaHeader;
  const body   = getBody(root);

  // ---- TRASMISSIONE ----
  const trasmissione = header?.DatiTrasmissione ?? {};
  const progressivoInvio  = val(trasmissione.ProgressivoInvio);
  const codiceDestinatario = val(trasmissione.CodiceDestinatario);

  // ---- CEDENTE (FORNITORE) ----
  const cedente    = header?.CedentePrestatore ?? {};
  const datiAnag   = cedente.DatiAnagrafici ?? {};
  const idFisc     = datiAnag.IdFiscaleIVA ?? {};
  const anagrafica = datiAnag.Anagrafica ?? {};
  const sede       = cedente.Sede ?? {};

  const denominazione = val(anagrafica.Denominazione)
    || `${val(anagrafica.Nome) ?? ''} ${val(anagrafica.Cognome) ?? ''}`.trim();
  const partitaIvaFornitore  = val(idFisc.IdCodice);
  const cfFornitore = val(datiAnag.CodiceFiscale);
  const indirizzoFornitore   = [
    val(sede.Indirizzo), val(sede.CAP), val(sede.Comune), val(sede.Provincia)
  ].filter(Boolean).join(', ');

  // ---- DATI GENERALI ----
  const datiGen = body?.DatiGenerali?.DatiGeneraliDocumento ?? {};
  const tipoDoc  = val(datiGen.TipoDocumento) ?? 'TD01';
  const dataStr  = val(datiGen.Data);
  const numero   = val(datiGen.Numero);
  const causale  = Array.isArray(datiGen.Causale)
    ? datiGen.Causale.join(' ')
    : val(datiGen.Causale) ?? '';

  const dataFattura = dataStr ? new Date(dataStr) : new Date();
  const anno = dataFattura.getFullYear();

  // ---- RIEPILOGO IVA ----
  const riepilogo = body?.DatiBeniServizi?.DatiRiepilogo;
  const riepilogos = Array.isArray(riepilogo) ? riepilogo : (riepilogo ? [riepilogo] : []);

  let imponibile = 0;
  let iva = 0;
  riepilogos.forEach(r => {
    imponibile += parseImporto(r.ImponibileImporto);
    iva        += parseImporto(r.Imposta);
  });

  let totale = parseImporto(datiGen.ImportoTotaleDocumento);
  if (!totale) totale = imponibile + iva;

  // Nota credito (TD04, TD08) → importo negativo
  if (['TD04', 'TD08', 'TD11'].includes(tipoDoc)) {
    totale     = -Math.abs(totale);
    imponibile = -Math.abs(imponibile);
    iva        = -Math.abs(iva);
  }

  if (totale <= 0 && !['TD04', 'TD08', 'TD11'].includes(tipoDoc)) {
    throw new Error(`Importo non valido: ${totale}`);
  }

  // ---- DESCRIZIONE per categoria ----
  const linee = body?.DatiBeniServizi?.DettaglioLinee;
  const lineeArr = Array.isArray(linee) ? linee : (linee ? [linee] : []);
  const descrizioneLinee = lineeArr
    .map(l => val(l.Descrizione))
    .filter(Boolean)
    .join('; ')
    .substring(0, 500);

  const testoCategorizzazione = causale || descrizioneLinee;
  const categoria = indovinaCategoria(testoCategorizzazione);

  // ---- IDENTIFICATIVO SDI univoco ----
  const identificativoSdi = progressivoInvio
    ? `${partitaIvaFornitore}-${progressivoInvio}`
    : `${partitaIvaFornitore}-${numero}-${dataStr}`;

  return {
    tipoCosto: 'fattura_passiva',
    data: dataFattura,
    importo: Math.abs(totale),
    categoria,
    descrizione: (causale || descrizioneLinee || `Fattura ${numero}`).substring(0, 500),
    competenzaAnno: anno,
    insertMode: 'sdi_automatico',
    approvato: false,

    sdi: {
      isFatturaElettronica: true,
      numeroFattura: numero,
      dataFattura,
      fornitore: {
        denominazione,
        partitaIva: partitaIvaFornitore,
        codiceFiscale: cfFornitore,
        indirizzo: indirizzoFornitore,
      },
      identificativoSdi,
      progressivoInvio,
      imponibile,
      iva,
      totaleDocumento: totale,
      causale: causale.substring(0, 500),
      importedAt: new Date(),
      importedFrom: 'cassetto_fiscale',
    },
  };
}

/**
 * Parsifica uno ZIP contenente più file XML FatturaPA.
 * @param {Buffer} zipBuffer
 * @returns {Promise<Array<{filename, data}|{filename, error}>>}
 */
async function parseFattureZip(zipBuffer) {
  // Importazione lazy per non richiedere adesso il pacchetto
  let AdmZip;
  try {
    AdmZip = require('adm-zip');
  } catch {
    throw new Error('Installa adm-zip: npm install adm-zip');
  }

  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries().filter(e =>
    !e.isDirectory && /\.(xml|p7m)$/i.test(e.entryName)
  );

  const results = [];
  for (const entry of entries) {
    let xmlBuf = entry.getData();
    // P7M = XML firmato digitalmente → estrai payload
    if (entry.entryName.toLowerCase().endsWith('.p7m')) {
      xmlBuf = estraiDaP7M(xmlBuf);
    }
    try {
      const data = await parseFatturaXML(xmlBuf);
      results.push({ filename: entry.entryName, data });
    } catch (err) {
      results.push({ filename: entry.entryName, error: err.message });
    }
  }
  return results;
}

// Estrae il payload XML da un file P7M (CMS/PKCS7 signed data)
// Il formato P7M contiene l'XML come OctetString; questa è un'estrazione best-effort
function estraiDaP7M(buf) {
  // Cerca il prologo XML all'interno del buffer binario
  const xmlStart = buf.indexOf(Buffer.from('<?xml'));
  if (xmlStart !== -1) return buf.subarray(xmlStart);
  // Fallback: prova dal secondo possibile header (<Fatt)
  const tagStart = buf.indexOf(Buffer.from('<FatturaElettronica'));
  if (tagStart !== -1) return buf.subarray(tagStart);
  return buf;
}

module.exports = { parseFatturaXML, parseFattureZip };

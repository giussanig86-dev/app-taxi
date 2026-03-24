/**
 * SERVIZIO CALCOLO FISCALE
 * Motore calcolo imposte per regime forfettario e ordinario
 */

/**
 * Calcolo Regime Forfettario
 * @param {Object} params
 * @param {number} params.ricavoLordo - Totale corrispettivi + fatture
 * @param {number} params.coefficienteRedditivita - Default 0.67 per taxi
 * @param {number} params.aliquotaForfettaria - 0.15 o 0.05 (primi 5 anni)
 * @param {number} params.aliquotaINPS - Default 0.2448
 */
const calcolaForfettario = ({
  ricavoLordo = 0,
  coefficienteRedditivita = 0.67,
  aliquotaForfettaria = 0.15,
  aliquotaINPS = 0.2448
}) => {
  // 1. Reddito imponibile = ricavo * coefficiente
  const redditoImponibile = ricavoLordo * coefficienteRedditivita;

  // 2. Contributi INPS sul reddito imponibile
  const contributiINPS = redditoImponibile * aliquotaINPS;

  // 3. Base imponibile fiscale = reddito - INPS
  const baseImponibileFiscale = Math.max(0, redditoImponibile - contributiINPS);

  // 4. Imposta sostitutiva
  const impostaSostitutiva = baseImponibileFiscale * aliquotaForfettaria;

  // 5. Totale imposte e contributi
  const totaleImposteContributi = impostaSostitutiva + contributiINPS;

  // 6. Netto stimato
  const nettoStimato = ricavoLordo - totaleImposteContributi;

  return {
    redditoImponibile: Math.round(redditoImponibile * 100) / 100,
    contributiINPS: Math.round(contributiINPS * 100) / 100,
    baseImponibileFiscale: Math.round(baseImponibileFiscale * 100) / 100,
    impostaSostitutiva: Math.round(impostaSostitutiva * 100) / 100,
    totaleImposteContributi: Math.round(totaleImposteContributi * 100) / 100,
    nettoStimato: Math.round(nettoStimato * 100) / 100,
    aliquotaEffettiva: ricavoLordo > 0
      ? Math.round((totaleImposteContributi / ricavoLordo) * 10000) / 100
      : 0
  };
};

/**
 * Calcolo Regime Ordinario (IRPEF a scaglioni)
 * @param {Object} params
 * @param {number} params.redditoImponibile
 * @param {Array} params.scaglioni - Array di { limite_superiore, aliquota }
 */
const calcolaIRPEF = ({ redditoImponibile = 0, scaglioni = [] }) => {
  if (scaglioni.length === 0 || redditoImponibile <= 0) {
    return { irpefLorda: 0, dettaglioScaglioni: [] };
  }

  let residuo = redditoImponibile;
  let irpefLorda = 0;
  let limitePrecedente = 0;
  const dettaglioScaglioni = [];

  for (const scaglione of scaglioni) {
    if (residuo <= 0) break;

    const baseScaglione = Math.min(residuo, scaglione.limite_superiore - limitePrecedente);
    const impostaScaglione = baseScaglione * scaglione.aliquota;

    dettaglioScaglioni.push({
      da: limitePrecedente,
      a: limitePrecedente + baseScaglione,
      aliquota: scaglione.aliquota,
      base: Math.round(baseScaglione * 100) / 100,
      imposta: Math.round(impostaScaglione * 100) / 100
    });

    irpefLorda += impostaScaglione;
    residuo -= baseScaglione;
    limitePrecedente = scaglione.limite_superiore;
  }

  return {
    irpefLorda: Math.round(irpefLorda * 100) / 100,
    dettaglioScaglioni
  };
};

// Scaglioni IRPEF vigenti (2024-2025)
const SCAGLIONI_IRPEF = [
  { limite_superiore: 28000, aliquota: 0.23 },
  { limite_superiore: 50000, aliquota: 0.35 },
  { limite_superiore: Infinity, aliquota: 0.43 },
];

/**
 * Calcolo Regime Ordinario
 * Reddito imponibile = ricavi - costi; IRPEF per scaglioni progressivi
 */
const calcolaOrdinario = ({
  ricavoLordo = 0,
  totaleCosti = 0,
  aliquotaINPS = 0.2448,
}) => {
  // 1. Reddito al lordo dei contributi
  const redditoLordo = Math.max(0, ricavoLordo - totaleCosti);

  // 2. Contributi INPS (deducibili)
  const contributiINPS = redditoLordo * aliquotaINPS;

  // 3. Reddito imponibile IRPEF (al netto INPS, senza altre detrazioni)
  const redditoImponibile = Math.max(0, redditoLordo - contributiINPS);

  // 4. IRPEF lorda per scaglioni
  const { irpefLorda, dettaglioScaglioni } = calcolaIRPEF({
    redditoImponibile,
    scaglioni: SCAGLIONI_IRPEF,
  });

  // 5. Netto stimato
  const totaleImposteContributi = irpefLorda + contributiINPS;
  const nettoStimato = ricavoLordo - totaleImposteContributi;

  return {
    redditoLordo: Math.round(redditoLordo * 100) / 100,
    contributiINPS: Math.round(contributiINPS * 100) / 100,
    redditoImponibile: Math.round(redditoImponibile * 100) / 100,
    irpefLorda: Math.round(irpefLorda * 100) / 100,
    dettaglioScaglioni,
    totaleImposteContributi: Math.round(totaleImposteContributi * 100) / 100,
    nettoStimato: Math.round(nettoStimato * 100) / 100,
    aliquotaEffettiva: ricavoLordo > 0
      ? Math.round((totaleImposteContributi / ricavoLordo) * 10000) / 100
      : 0,
  };
};

module.exports = { calcolaForfettario, calcolaIRPEF, calcolaOrdinario };

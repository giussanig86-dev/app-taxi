const XLSX = require('xlsx');
const Corrispettivo = require('../models/Corrispettivo');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const MESI_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
];

const METODI_LABEL = {
  contante: 'Contante',
  carta: 'Carta',
  pos: 'POS',
  bonifico: 'Bonifico',
};

function formatEuroIT(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function formatDataIT(d) {
  return new Intl.DateTimeFormat('it-IT').format(new Date(d));
}

exports.getAll = catchAsync(async (req, res) => {
  const { anno, mese, metodoPagamento, page = 1, limit = 50 } = req.query;
  const filter = { ...req.tenantFilter };

  if (anno) {
    const a = parseInt(anno);
    filter.data = { $gte: new Date(a, 0, 1), $lt: new Date(a + 1, 0, 1) };
  }
  if (anno && mese) {
    const a = parseInt(anno);
    const m = parseInt(mese);
    filter.data = { $gte: new Date(a, m - 1, 1), $lt: new Date(a, m, 1) };
  }
  if (metodoPagamento) filter.metodoPagamento = metodoPagamento;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [corrispettivi, total] = await Promise.all([
    Corrispettivo.find(filter).sort({ data: -1 }).skip(skip).limit(parseInt(limit)),
    Corrispettivo.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success', results: corrispettivi.length, total,
    page: parseInt(page), pages: Math.ceil(total / parseInt(limit)),
    data: { corrispettivi }
  });
});

exports.create = catchAsync(async (req, res) => {
  const corrispettivo = await Corrispettivo.create({
    ...req.body,
    userId: req.tenantUserId || req.user._id
  });
  res.status(201).json({ status: 'success', data: { corrispettivo } });
});

exports.getOne = catchAsync(async (req, res, next) => {
  const corrispettivo = await Corrispettivo.findOne({ _id: req.params.id, ...req.tenantFilter });
  if (!corrispettivo) return next(new AppError('Corrispettivo non trovato.', 404));
  res.status(200).json({ status: 'success', data: { corrispettivo } });
});

exports.update = catchAsync(async (req, res, next) => {
  const corrispettivo = await Corrispettivo.findOneAndUpdate(
    { _id: req.params.id, ...req.tenantFilter }, req.body,
    { new: true, runValidators: true }
  );
  if (!corrispettivo) return next(new AppError('Corrispettivo non trovato.', 404));
  res.status(200).json({ status: 'success', data: { corrispettivo } });
});

exports.delete = catchAsync(async (req, res, next) => {
  const corrispettivo = await Corrispettivo.findOneAndDelete({ _id: req.params.id, ...req.tenantFilter });
  if (!corrispettivo) return next(new AppError('Corrispettivo non trovato.', 404));
  res.status(204).json({ status: 'success', data: null });
});

exports.statsAnno = catchAsync(async (req, res) => {
  const anno = parseInt(req.query.anno) || new Date().getFullYear();
  const userId = req.tenantUserId || req.user._id;
  const result = await Corrispettivo.totaleAnno(userId, anno);
  res.status(200).json({ status: 'success', data: result });
});

exports.statsMese = catchAsync(async (req, res) => {
  const anno = parseInt(req.query.anno) || new Date().getFullYear();
  const mese = parseInt(req.query.mese) || new Date().getMonth() + 1;
  const userId = req.tenantUserId || req.user._id;
  const result = await Corrispettivo.totaleMese(userId, anno, mese);
  res.status(200).json({ status: 'success', data: result });
});

exports.statsMetodi = catchAsync(async (req, res) => {
  const anno = parseInt(req.query.anno) || new Date().getFullYear();
  const userId = req.tenantUserId || req.user._id;
  const result = await Corrispettivo.breakdownMetodi(userId, anno);
  res.status(200).json({ status: 'success', data: result });
});

exports.statsAndamento = catchAsync(async (req, res) => {
  const anno = parseInt(req.query.anno) || new Date().getFullYear();
  const userId = req.tenantUserId || req.user._id;
  const result = await Corrispettivo.andamentoMensile(userId, anno);
  res.status(200).json({ status: 'success', data: result });
});

// ── Export Registro Corrispettivi (Excel) ─────────────────────────────────
exports.exportRegistro = catchAsync(async (req, res, next) => {
  const anno = parseInt(req.query.anno) || new Date().getFullYear();
  const mese = req.query.mese ? parseInt(req.query.mese) : null;

  // Recupera utente titolare (il cliente a cui appartengono i corrispettivi)
  const userId = req.tenantUserId || req.user._id;
  const titolare = await User.findById(userId).select('nome cognome codiceFiscale partitaIva indirizzo telefono');
  if (!titolare) return next(new AppError('Utente non trovato.', 404));

  // Filtro date
  const filter = { userId };
  if (mese) {
    filter.data = { $gte: new Date(anno, mese - 1, 1), $lt: new Date(anno, mese, 1) };
  } else {
    filter.data = { $gte: new Date(anno, 0, 1), $lt: new Date(anno + 1, 0, 1) };
  }

  const corrispettivi = await Corrispettivo.find(filter).sort({ data: 1 });

  const nomeMese = mese ? MESI_IT[mese - 1] : 'Annuale';
  const periodoLabel = mese ? `${nomeMese} ${anno}` : `Anno ${anno}`;
  const nomeFile = `registro-corrispettivi-${anno}${mese ? `-${String(mese).padStart(2,'0')}` : ''}.xlsx`;

  // ── Costruzione foglio Excel ──────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  // Stili (limitati a xlsx community edition)
  const aoa = [];

  // Intestazione azienda / titolare
  aoa.push(['REGISTRO CORRISPETTIVI', '', '', '', '', '']);
  aoa.push([`Periodo: ${periodoLabel}`, '', '', '', '', '']);
  aoa.push(['']);
  aoa.push(['DATI TITOLARE', '', '', '', '', '']);
  aoa.push(['Nome e Cognome:', `${titolare.nome} ${titolare.cognome}`, '', 'Telefono:', titolare.telefono || '-', '']);
  aoa.push(['Codice Fiscale:', titolare.codiceFiscale || '-', '', 'P.IVA:', titolare.partitaIva || '-', '']);
  if (titolare.indirizzo?.comune) {
    aoa.push(['Indirizzo:', `${titolare.indirizzo.via || ''} - ${titolare.indirizzo.cap || ''} ${titolare.indirizzo.comune || ''} (${titolare.indirizzo.provincia || ''})`, '', '', '', '']);
  }
  aoa.push(['']);
  aoa.push(['Data generazione:', new Date().toLocaleString('it-IT'), '', '', '', '']);
  aoa.push(['']);

  // Intestazione tabella
  aoa.push(['N.', 'Data', 'Importo (€)', 'Metodo Pagamento', 'Numerazione', 'Note']);

  let totaleGenerale = 0;
  let giorniLavorati = new Set();
  let riga = 1;

  // Se export mensile, separa per settimana per leggibilità (opzionale)
  // Qui riga per riga semplice
  corrispettivi.forEach((c) => {
    giorniLavorati.add(formatDataIT(c.data));
    totaleGenerale += c.importo;
    aoa.push([
      riga++,
      formatDataIT(c.data),
      c.importo,
      METODI_LABEL[c.metodoPagamento] || c.metodoPagamento,
      c.numerazione || '',
      c.note || '',
    ]);
  });

  aoa.push(['']);
  aoa.push(['', 'TOTALE', totaleGenerale, '', '', '']);
  aoa.push(['', 'Giorni lavorati', giorniLavorati.size, '', '', '']);
  aoa.push(['', 'Registrazioni', corrispettivi.length, '', '', '']);

  // Riepilogo mensile (solo se export annuale)
  if (!mese && corrispettivi.length > 0) {
    aoa.push(['']);
    aoa.push(['RIEPILOGO MENSILE', '', '', '', '', '']);
    aoa.push(['Mese', 'Registrazioni', 'Totale (€)', 'Media (€)', '', '']);

    const perMese = {};
    corrispettivi.forEach((c) => {
      const m = new Date(c.data).getMonth();
      if (!perMese[m]) perMese[m] = { count: 0, totale: 0 };
      perMese[m].count++;
      perMese[m].totale += c.importo;
    });

    Object.keys(perMese).sort((a, b) => a - b).forEach((m) => {
      const d = perMese[m];
      aoa.push([
        MESI_IT[parseInt(m)],
        d.count,
        d.totale,
        Math.round((d.totale / d.count) * 100) / 100,
        '',
        '',
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Larghezze colonne
  ws['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 30 },
  ];

  // Formato numerico per colonna importo (col C = indice 2)
  aoa.forEach((row, ri) => {
    if (ri > 10 && typeof row[2] === 'number') {
      const cellRef = XLSX.utils.encode_cell({ r: ri, c: 2 });
      if (ws[cellRef]) ws[cellRef].z = '#,##0.00 "€"';
    }
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Registro Corrispettivi');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition', `attachment; filename="${nomeFile}"`);
  res.set('Content-Length', buf.length);
  res.send(buf);
});

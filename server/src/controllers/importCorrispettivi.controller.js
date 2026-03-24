/**
 * IMPORT REGISTRO CORRISPETTIVI
 * Caricamento massivo corrispettivi da file Excel/CSV
 *
 * Flusso:
 *   POST /corrispettivi/import/preview?userId=:clienteId  → parse, ritorna headers+righe+mapping
 *   POST /corrispettivi/import/confirm?userId=:clienteId  → salva in bulk
 */

const multer = require('multer')
const XLSX = require('xlsx')
const Corrispettivo = require('../models/Corrispettivo')
const AppError = require('../utils/AppError')
const catchAsync = require('../utils/catchAsync')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().replace(/.*\./, '')
    if (['xlsx', 'xls', 'csv'].includes(ext)) return cb(null, true)
    cb(new AppError('Formato non supportato. Usa .xlsx, .xls o .csv', 400))
  }
})

exports.uploadMiddleware = upload.single('file')

function detectColumns(headers) {
  const h = headers.map(x => (x || '').toLowerCase().trim())
  const find = (...kws) => {
    for (const kw of kws) {
      const i = h.findIndex(x => x.includes(kw))
      if (i !== -1) return i
    }
    return -1
  }
  return {
    data:   find('data op', 'data corrispett', 'data reg', 'giorno', 'data'),
    importo: find('corrispett', 'importo tot', 'ricavo', 'totale', 'importo'),
    metodo:  find('metodo', 'tipo pag', 'mezzo', 'pagam'),
    note:    find('note', 'descrizione', 'causale'),
  }
}

function parseDate(str) {
  if (!str) return null
  const s = String(str).trim()
  const m1 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (m1) return new Date(`${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`)
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m2) return new Date(s.slice(0, 10))
  const n = parseFloat(s)
  if (!isNaN(n) && n > 40000 && n < 60000) return new Date(Date.UTC(1899, 11, 30) + n * 86400000)
  return null
}

function parseImporto(str) {
  if (str === null || str === undefined) return null
  const s = String(str).trim().replace(/[€$\s]/g, '')
  const cleaned = s.includes(',') && s.indexOf(',') > s.indexOf('.')
    ? s.replace(/\./g, '').replace(',', '.')
    : s.replace(',', '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : Math.abs(n)
}

const METODI_VALIDI = ['contante', 'carta', 'pos', 'bonifico']

function parseMetodo(str) {
  if (!str) return 'contante'
  const s = str.toLowerCase().trim()
  if (s.includes('cont')) return 'contante'
  if (s.includes('pos') || s.includes('bancomat')) return 'pos'
  if (s.includes('cart')) return 'carta'
  if (s.includes('bonif')) return 'bonifico'
  return 'contante'
}

exports.preview = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('File non trovato nella richiesta.', 400))
  if (!req.tenantUserId) return next(new AppError('userId del cliente obbligatorio.', 400))

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer', dateNF: 'dd/mm/yyyy' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  let headerIdx = 0
  for (let i = 0; i < Math.min(15, raw.length); i++) {
    if (raw[i].filter(c => String(c).trim()).length >= 2) { headerIdx = i; break }
  }

  const headers = raw[headerIdx].map(c => String(c).trim())
  const rows = raw
    .slice(headerIdx + 1)
    .filter(row => row.some(c => String(c).trim()))
    .slice(0, 500)
    .map(row => headers.map((_, i) => String(row[i] ?? '').trim()))

  if (rows.length === 0) return next(new AppError('Nessuna riga di dati trovata nel file.', 400))

  const mapping = detectColumns(headers)

  res.json({ status: 'success', data: { headers, rows, mapping, totaleRighe: rows.length } })
})

exports.confirm = catchAsync(async (req, res, next) => {
  if (!req.tenantUserId) return next(new AppError('userId del cliente obbligatorio.', 400))

  const { corrispettivi } = req.body
  if (!Array.isArray(corrispettivi) || corrispettivi.length === 0) {
    return next(new AppError('Nessun corrispettivo da importare.', 400))
  }

  const docs = []
  const errori = []

  corrispettivi.forEach((c, i) => {
    const data = parseDate(c.data)
    const importo = parseImporto(c.importo)

    if (!data || isNaN(data.getTime())) {
      errori.push(`Riga ${i + 1}: data non valida "${c.data}"`); return
    }
    if (!importo || importo <= 0) {
      errori.push(`Riga ${i + 1}: importo non valido "${c.importo}"`); return
    }

    const metodoPagamento = METODI_VALIDI.includes(c.metodoPagamento)
      ? c.metodoPagamento
      : parseMetodo(c.metodoPagamento)

    docs.push({
      userId: req.tenantUserId,
      data,
      importo,
      metodoPagamento,
      note: (c.note || '').slice(0, 500),
      insertMode: 'import_registro_corrispettivi',
      verificato: true,
    })
  })

  if (docs.length === 0) return next(new AppError('Nessuna riga valida da importare.', 400))

  await Corrispettivo.insertMany(docs, { ordered: false })

  res.status(201).json({
    status: 'success',
    data: { importati: docs.length, errori, totaleInviato: corrispettivi.length }
  })
})

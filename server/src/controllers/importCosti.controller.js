/**
 * IMPORT REGISTRO IVA ACQUISTI
 * Caricamento massivo costi da file Excel/CSV del registro IVA trimestrale
 *
 * Flusso:
 *   POST /costi/import/preview?userId=:clienteId  → parse file, ritorna headers + righe + mapping rilevato
 *   POST /costi/import/confirm?userId=:clienteId  → salva i costi confermati
 */

const multer = require('multer')
const XLSX = require('xlsx')
const Costo = require('../models/Costo')
const AppError = require('../utils/AppError')
const catchAsync = require('../utils/catchAsync')

// ── Multer: memoria, max 5MB, solo Excel/CSV ──────────────────────────────────
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

// ── Rilevamento automatico colonne ────────────────────────────────────────────
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
    data:          find('data doc', 'data fatt', 'data reg', 'data'),
    importo:       find('totale doc', 'tot doc', 'totale', 'importo tot', 'importo'),
    fornitore:     find('fornitore', 'denominazione', 'ragione soc', 'intestatario', 'descrizione'),
    numeroFattura: find('n. doc', 'numero doc', 'num. doc', 'num doc', 'n.doc', 'numero fatt', 'numero'),
    imponibile:    find('imponibile'),
  }
}

// ── Parsing data italiana (dd/mm/yyyy) o ISO ─────────────────────────────────
function parseDate(str) {
  if (!str) return null
  const s = String(str).trim()
  const m1 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (m1) return new Date(`${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`)
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m2) return new Date(s.slice(0, 10))
  // Seriale Excel
  const n = parseFloat(s)
  if (!isNaN(n) && n > 40000 && n < 60000) {
    return new Date(Date.UTC(1899, 11, 30) + n * 86400000)
  }
  return null
}

// ── Parsing importo (gestisce separatori italiani 1.234,56) ──────────────────
function parseImporto(str) {
  if (str === null || str === undefined) return null
  const s = String(str).trim().replace(/[€$\s]/g, '')
  // Formato italiano: 1.234,56
  const cleaned = s.includes(',') && s.indexOf(',') > s.indexOf('.')
    ? s.replace(/\./g, '').replace(',', '.')
    : s.replace(',', '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : Math.abs(n)
}

// ── STEP 1: Preview ───────────────────────────────────────────────────────────
exports.preview = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('File non trovato nella richiesta.', 400))
  if (!req.tenantUserId) return next(new AppError('userId del cliente obbligatorio.', 400))

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer', dateNF: 'dd/mm/yyyy' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  // Trova la riga di intestazione (prima riga con almeno 3 celle non vuote)
  let headerIdx = 0
  for (let i = 0; i < Math.min(15, raw.length); i++) {
    if (raw[i].filter(c => String(c).trim()).length >= 3) {
      headerIdx = i
      break
    }
  }

  const headers = raw[headerIdx].map(c => String(c).trim())
  const rows = raw
    .slice(headerIdx + 1)
    .filter(row => row.some(c => String(c).trim()))
    .slice(0, 500)
    .map(row => headers.map((_, i) => String(row[i] ?? '').trim()))

  if (rows.length === 0) return next(new AppError('Nessuna riga di dati trovata nel file.', 400))

  const mapping = detectColumns(headers)

  res.json({
    status: 'success',
    data: { headers, rows, mapping, totaleRighe: rows.length }
  })
})

// ── STEP 2: Confirm ───────────────────────────────────────────────────────────
exports.confirm = catchAsync(async (req, res, next) => {
  if (!req.tenantUserId) return next(new AppError('userId del cliente obbligatorio.', 400))

  const { costi } = req.body
  if (!Array.isArray(costi) || costi.length === 0) {
    return next(new AppError('Nessun costo da importare.', 400))
  }

  const CATEGORIE_VALIDE = ['carburante', 'manutenzione', 'assicurazione', 'bollo', 'pedaggi', 'parcheggi', 'altro']
  const docs = []
  const errori = []

  costi.forEach((c, i) => {
    const data = parseDate(c.data)
    const importo = parseImporto(c.importo)

    if (!data || isNaN(data.getTime())) {
      errori.push(`Riga ${i + 1}: data non valida "${c.data}"`)
      return
    }
    if (!importo || importo <= 0) {
      errori.push(`Riga ${i + 1}: importo non valido "${c.importo}"`)
      return
    }
    if (!CATEGORIE_VALIDE.includes(c.categoria)) {
      errori.push(`Riga ${i + 1}: categoria non valida "${c.categoria}"`)
      return
    }

    docs.push({
      userId: req.tenantUserId,
      tipoCosto: 'fattura_passiva',
      data,
      importo,
      categoria: c.categoria,
      descrizione: (c.descrizione || '').slice(0, 500),
      competenzaAnno: data.getFullYear(),
      insertMode: 'import_registro_iva',
      approvato: true,
      approvatoDa: req.user._id,
      dataApprovazione: new Date(),
      sdi: {
        isFatturaElettronica: false,
        ...(c.numeroFattura ? { numeroFattura: String(c.numeroFattura) } : {}),
        ...(c.fornitore    ? { fornitore: { denominazione: String(c.fornitore) } } : {}),
      }
    })
  })

  if (docs.length === 0) return next(new AppError('Nessuna riga valida da importare.', 400))

  await Costo.insertMany(docs, { ordered: false })

  res.status(201).json({
    status: 'success',
    data: { importati: docs.length, errori, totaleInviato: costi.length }
  })
})

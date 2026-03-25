/**
 * IMPORT BATCH REGISTRO IVA
 * Il consulente carica un file Excel per ogni cliente in una sola operazione.
 *
 * POST /costi/import/batch
 *   multipart/form-data:
 *     files[]      → array di file Excel/CSV (uno per cliente)
 *     clienteIds[] → array di userId (stesso ordine dei file)
 *
 * Ogni file viene processato con rilevamento automatico delle colonne.
 * Ritorna un riepilogo per ogni cliente: { clienteId, nome, importati, errori }
 */

const multer = require('multer')
const XLSX = require('xlsx')
const Costo = require('../models/Costo')
const User = require('../models/User')
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

exports.uploadMiddleware = upload.array('files', 30)

// ── Helpers (stesso logic di importCosti) ─────────────────────────────────────
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
  if (!isNaN(n) && n > 40000 && n < 60000) {
    return new Date(Date.UTC(1899, 11, 30) + n * 86400000)
  }
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

function parseFileBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', dateNF: 'dd/mm/yyyy' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  let headerIdx = 0
  for (let i = 0; i < Math.min(15, raw.length); i++) {
    if (raw[i].filter(c => String(c).trim()).length >= 3) { headerIdx = i; break }
  }

  const headers = raw[headerIdx].map(c => String(c).trim())
  const rows = raw
    .slice(headerIdx + 1)
    .filter(row => row.some(c => String(c).trim()))
    .slice(0, 500)
    .map(row => headers.map((_, i) => String(row[i] ?? '').trim()))

  return { headers, rows }
}

// ── Main handler ──────────────────────────────────────────────────────────────
exports.importBatch = catchAsync(async (req, res, next) => {
  const files = req.files || []
  if (files.length === 0) return next(new AppError('Nessun file ricevuto.', 400))

  // clienteIds può arrivare come stringa singola o array
  let clienteIds = req.body.clienteIds
  if (!clienteIds) return next(new AppError('clienteIds obbligatorio.', 400))
  if (!Array.isArray(clienteIds)) clienteIds = [clienteIds]

  if (files.length !== clienteIds.length) {
    return next(new AppError(`Numero file (${files.length}) diverso dal numero clienti (${clienteIds.length}).`, 400))
  }

  // Verifica che tutti i clienteId appartengano al consulente loggato
  const clienti = await User.find({
    _id: { $in: clienteIds },
    consulenteId: req.user._id,
    ruolo: 'cliente',
  })

  const clienteMap = Object.fromEntries(clienti.map(c => [String(c._id), c]))
  const risultati = []

  for (let i = 0; i < files.length; i++) {
    const clienteId = clienteIds[i]
    const file = files[i]
    const cliente = clienteMap[clienteId]

    if (!cliente) {
      risultati.push({ clienteId, nome: '—', importati: 0, errori: ['Cliente non trovato o non autorizzato'] })
      continue
    }

    let headers, rows
    try {
      ;({ headers, rows } = parseFileBuffer(file.buffer))
    } catch (err) {
      risultati.push({ clienteId, nome: `${cliente.nome} ${cliente.cognome}`, importati: 0, errori: ['Errore lettura file: ' + err.message] })
      continue
    }

    if (rows.length === 0) {
      risultati.push({ clienteId, nome: `${cliente.nome} ${cliente.cognome}`, importati: 0, errori: ['Nessuna riga trovata nel file'] })
      continue
    }

    const mapping = detectColumns(headers)
    const docs = []
    const errori = []

    rows.forEach((row, idx) => {
      const dataStr = mapping.data >= 0 ? row[mapping.data] : null
      const importoStr = mapping.importo >= 0 ? row[mapping.importo] : null
      const fornitore = mapping.fornitore >= 0 ? row[mapping.fornitore] : ''
      const numeroFattura = mapping.numeroFattura >= 0 ? row[mapping.numeroFattura] : ''

      const data = parseDate(dataStr)
      const importo = parseImporto(importoStr)

      if (!data || isNaN(data.getTime())) {
        errori.push(`Riga ${idx + 1}: data non valida "${dataStr}"`)
        return
      }
      if (!importo || importo <= 0) {
        errori.push(`Riga ${idx + 1}: importo non valido "${importoStr}"`)
        return
      }

      docs.push({
        userId: cliente._id,
        tipoCosto: 'fattura_passiva',
        data,
        importo,
        categoria: 'altro',
        descrizione: fornitore ? String(fornitore).slice(0, 500) : '',
        competenzaAnno: data.getFullYear(),
        insertMode: 'import_registro_iva',
        approvato: true,
        approvatoDa: req.user._id,
        dataApprovazione: new Date(),
        sdi: {
          isFatturaElettronica: false,
          ...(numeroFattura ? { numeroFattura: String(numeroFattura) } : {}),
          ...(fornitore ? { fornitore: { denominazione: String(fornitore) } } : {}),
        }
      })
    })

    if (docs.length > 0) {
      await Costo.insertMany(docs, { ordered: false })
    }

    risultati.push({
      clienteId,
      nome: `${cliente.nome} ${cliente.cognome}`,
      importati: docs.length,
      totaleRighe: rows.length,
      errori,
    })
  }

  res.status(200).json({
    status: 'success',
    data: { risultati }
  })
})

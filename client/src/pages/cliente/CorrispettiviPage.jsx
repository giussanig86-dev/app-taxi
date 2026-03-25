import { useState, useEffect } from 'react'
import { Plus, Search, Calendar, CreditCard, Banknote, Trash2, Edit3, X, Save, Filter, FileSpreadsheet, FileText, Download, ChevronDown } from 'lucide-react'
import api from '@/lib/api'
import { formatEuro, formatData, formatDataInput, cn, MESI } from '@/lib/utils'
import { METODI_PAGAMENTO } from '@/lib/constants'
import PageHeader from '@/components/shared/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import VoiceInput from '@/components/shared/VoiceInput'
import { useOutletContext } from 'react-router-dom'

const INITIAL_FORM = {
  data: formatDataInput(new Date()),
  importo: '',
  metodoPagamento: 'contante',
  numerazione: '',
  note: '',
}

export default function CorrispettiviPage() {
  const { anno, refreshKey } = useOutletContext()
  const [corrispettivi, setCorrispettivi] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [search, setSearch] = useState('')
  const [meseFilter, setMeseFilter] = useState('')
  const [metodoFilter, setMetodoFilter] = useState('')
  const [stats, setStats] = useState(null)
  const [showExport, setShowExport] = useState(false)
  const [exportMese, setExportMese] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [anno, refreshKey])

  async function fetchData() {
    setLoading(true)
    try {
      const [corrRes, statsRes] = await Promise.all([
        api.get('/corrispettivi', { params: { anno } }),
        api.get('/corrispettivi/stats/andamento', { params: { anno } }),
      ])
      setCorrispettivi(corrRes.data.data?.corrispettivi || [])
      setStats(statsRes.data.data || null)
    } catch (err) {
      console.error('Errore caricamento corrispettivi:', err)
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setForm(INITIAL_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(c) {
    setForm({
      data: formatDataInput(c.data),
      importo: c.importo,
      metodoPagamento: c.metodoPagamento,
      numerazione: c.numerazione || '',
      note: c.note || '',
    })
    setEditingId(c._id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        importo: parseFloat(form.importo),
      }
      if (editingId) {
        await api.put(`/corrispettivi/${editingId}`, payload)
      } else {
        await api.post('/corrispettivi', payload)
      }
      setShowForm(false)
      setEditingId(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/corrispettivi/${deleteId}`)
      setDeleteId(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore eliminazione')
    }
  }

  async function handleExportExcel() {
    setExporting(true)
    try {
      const params = { anno }
      if (exportMese) params.mese = exportMese
      const token = localStorage.getItem('token')
      const baseUrl = import.meta.env.VITE_API_URL || ''
      const qs = new URLSearchParams(params).toString()
      const res = await fetch(`${baseUrl}/api/v1/corrispettivi/export/registro?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Errore export')
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') || ''
      const match = cd.match(/filename="([^"]+)"/)
      const filename = match ? match[1] : `registro-${anno}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Errore durante l\'esportazione Excel')
    } finally {
      setExporting(false)
    }
  }

  function handleExportPDF() {
    const mese = exportMese ? parseInt(exportMese) : null
    const mesiFull = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
    const periodoLabel = mese ? `${mesiFull[mese - 1]} ${anno}` : `Anno ${anno}`

    const filtered2 = corrispettivi.filter(c => {
      if (!mese) return true
      return new Date(c.data).getMonth() === mese - 1
    }).sort((a, b) => new Date(a.data) - new Date(b.data))

    const totaleExport = filtered2.reduce((s, c) => s + c.importo, 0)
    const giorniLavorati = new Set(filtered2.map(c => new Date(c.data).toLocaleDateString('it-IT'))).size

    const righe = filtered2.map((c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${new Date(c.data).toLocaleDateString('it-IT')}</td>
        <td style="text-align:right">${c.importo.toLocaleString('it-IT', {style:'currency',currency:'EUR'})}</td>
        <td>${c.metodoPagamento?.charAt(0).toUpperCase() + c.metodoPagamento?.slice(1) || ''}</td>
        <td>${c.numerazione || ''}</td>
        <td>${c.note || ''}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"/>
<title>Registro Corrispettivi – ${periodoLabel}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #222; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  .subtitle { color: #555; margin-bottom: 16px; }
  .info-box { border: 1px solid #ddd; padding: 10px 14px; border-radius: 4px; margin-bottom: 20px; }
  .info-box p { margin: 3px 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1a1a2e; color: #fff; padding: 7px 8px; text-align: left; font-size: 10px; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .total-row td { font-weight: bold; background: #f0f4ff; border-top: 2px solid #aaa; }
  .summary { display: flex; gap: 20px; margin-top: 16px; }
  .summary-box { flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 4px; text-align: center; }
  .summary-box strong { display: block; font-size: 18px; color: #1a1a2e; }
  .footer { margin-top: 30px; font-size: 9px; color: #999; text-align: center; }
  @media print { button { display: none !important; } }
</style>
</head>
<body>
<h1>REGISTRO CORRISPETTIVI</h1>
<p class="subtitle">Periodo: ${periodoLabel}</p>

<div class="info-box">
  <p><strong>Data generazione:</strong> ${new Date().toLocaleString('it-IT')}</p>
  <p><strong>Registrazioni nel periodo:</strong> ${filtered2.length} · <strong>Giorni lavorati:</strong> ${giorniLavorati}</p>
</div>

<table>
  <thead>
    <tr>
      <th>N.</th><th>Data</th><th>Importo</th><th>Metodo</th><th>Numerazione</th><th>Note</th>
    </tr>
  </thead>
  <tbody>
    ${righe}
    <tr class="total-row">
      <td colspan="2">TOTALE</td>
      <td style="text-align:right">${totaleExport.toLocaleString('it-IT', {style:'currency',currency:'EUR'})}</td>
      <td colspan="3"></td>
    </tr>
  </tbody>
</table>

<div class="summary">
  <div class="summary-box">
    <span>Totale Incassato</span>
    <strong>${totaleExport.toLocaleString('it-IT', {style:'currency',currency:'EUR'})}</strong>
  </div>
  <div class="summary-box">
    <span>Giorni Lavorati</span>
    <strong>${giorniLavorati}</strong>
  </div>
  <div class="summary-box">
    <span>N. Registrazioni</span>
    <strong>${filtered2.length}</strong>
  </div>
  <div class="summary-box">
    <span>Media Giornaliera</span>
    <strong>${giorniLavorati > 0 ? (totaleExport / giorniLavorati).toLocaleString('it-IT', {style:'currency',currency:'EUR'}) : '–'}</strong>
  </div>
</div>

<div class="footer">Documento generato da App Taxi · ${new Date().toLocaleDateString('it-IT')}</div>

<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
  }

  const filtered = corrispettivi.filter((c) => {
    if (search && !c.numerazione?.toLowerCase().includes(search.toLowerCase()) &&
        !c.note?.toLowerCase().includes(search.toLowerCase())) return false
    if (meseFilter && new Date(c.data).getMonth() !== parseInt(meseFilter)) return false
    if (metodoFilter && c.metodoPagamento !== metodoFilter) return false
    return true
  })

  const totale = filtered.reduce((s, c) => s + c.importo, 0)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Corrispettivi"
        subtitle={`Anno ${anno} · ${filtered.length} registrazioni · Totale ${formatEuro(totale)}`}
        actionLabel="Nuovo Corrispettivo"
        actionIcon={Plus}
        onAction={openNew}
      />

      {/* Filtri */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per numerazione o note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={meseFilter}
          onChange={(e) => setMeseFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tutti i mesi</option>
          {MESI.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <select
          value={metodoFilter}
          onChange={(e) => setMetodoFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tutti i metodi</option>
          {Object.entries(METODI_PAGAMENTO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Riepilogo mensile */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {stats.map((s) => (
            <div key={s.mese} className="bg-white rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-xs text-gray-500">{MESI[s.mese - 1]?.substring(0, 3)}</p>
              <p className="text-sm font-semibold mt-1">{formatEuro(s.totale)}</p>
              <p className="text-xs text-gray-400">{s.count} reg.</p>
            </div>
          ))}
        </div>
      )}

      {/* Export Registro Corrispettivi */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowExport(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            Scarica Registro Corrispettivi
          </span>
          <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', showExport && 'rotate-180')} />
        </button>
        {showExport && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-50">
            <div className="flex flex-wrap items-end gap-3 pt-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Periodo</label>
                <select
                  value={exportMese}
                  onChange={(e) => setExportMese(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Anno {anno} (completo)</option>
                  {MESI.map((m, i) => (
                    <option key={i} value={i + 1}>{m} {anno}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleExportExcel}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {exporting ? 'Esportazione...' : 'Scarica Excel'}
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Stampa / PDF
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Excel: file scaricabile con tutti i dati strutturati. PDF: si apre la finestra di stampa del browser — scegli «Salva come PDF».
            </p>
          </div>
        )}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="Nessun corrispettivo"
          description="Inizia registrando il tuo primo corrispettivo giornaliero."
        />
      ) : (
        <>
          {/* Card layout mobile */}
          <div className="lg:hidden space-y-2">
            {filtered.map((c) => (
              <div key={c._id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500">{formatData(c.data)}</span>
                      {c.numerazione && <span className="font-mono text-xs text-gray-400">{c.numerazione}</span>}
                    </div>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      c.metodoPagamento === 'contante' ? 'bg-green-50 text-green-700' :
                      c.metodoPagamento === 'pos' || c.metodoPagamento === 'carta' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-50 text-gray-700'
                    )}>
                      {c.metodoPagamento === 'contante' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                      {METODI_PAGAMENTO[c.metodoPagamento]}
                    </span>
                    {c.note && <p className="text-xs text-gray-400 mt-1 truncate">{c.note}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-base font-bold text-green-600">{formatEuro(c.importo)}</span>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(c._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabella desktop */}
          <div className="hidden lg:block bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Numerazione</th>
                  <th className="px-4 py-3 font-medium">Importo</th>
                  <th className="px-4 py-3 font-medium">Metodo</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                  <th className="px-4 py-3 font-medium text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">{formatData(c.data)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.numerazione || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{formatEuro(c.importo)}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        c.metodoPagamento === 'contante' ? 'bg-green-50 text-green-700' :
                        c.metodoPagamento === 'pos' || c.metodoPagamento === 'carta' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-50 text-gray-700'
                      )}>
                        {c.metodoPagamento === 'contante' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                        {METODI_PAGAMENTO[c.metodoPagamento]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{c.note || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(c._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-lg">
                {editingId ? 'Modifica Corrispettivo' : 'Nuovo Corrispettivo'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Importo (€) *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.importo}
                    onChange={(e) => setForm({ ...form, importo: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Es. 250.00"
                  />
                  <VoiceInput onResult={(text) => {
                    const num = text.match(/\d+[.,]?\d*/)?.[0]?.replace(',', '.')
                    if (num) setForm(f => ({ ...f, importo: parseFloat(num) }))
                  }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metodo Pagamento</label>
                <select
                  value={form.metodoPagamento}
                  onChange={(e) => setForm({ ...form, metodoPagamento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {Object.entries(METODI_PAGAMENTO).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numerazione</label>
                <input
                  type="text"
                  value={form.numerazione}
                  onChange={(e) => setForm({ ...form, numerazione: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Es. 001/2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <div className="relative">
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    placeholder="Note opzionali..."
                  />
                  <VoiceInput className="top-3 -translate-y-0" onResult={(text) => setForm(f => ({ ...f, note: text }))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvataggio...' : editingId ? 'Aggiorna' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteId}
        title="Elimina Corrispettivo"
        message="Sei sicuro di voler eliminare questo corrispettivo? L'azione non può essere annullata."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        variant="danger"
      />
    </div>
  )
}

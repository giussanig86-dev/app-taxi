import { useState, useEffect, useRef } from 'react'
import {
  Save, User, Shield, Calculator, Info,
  FolderOpen, Upload, Trash2, Download, FileText, Image, AlertCircle, CheckCircle,
  Car, History, Plus, Archive
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'

// Scaglioni IRPEF 2024-2025 (info display)
const SCAGLIONI_IRPEF = [
  { da: 0, a: 28000, aliquota: 23 },
  { da: 28001, a: 50000, aliquota: 35 },
  { da: 50001, a: null, aliquota: 43 },
]

const TIPI_DOCUMENTO = [
  { value: 'patente',            label: 'Patente di Guida' },
  { value: 'ci',                 label: "Carta d'Identità" },
  { value: 'cf',                 label: 'Codice Fiscale' },
  { value: 'kb',                 label: 'KB (Kartellino)' },
  { value: 'iscrizione_ruolo',   label: 'Iscrizione a Ruolo' },
  { value: 'visura',             label: 'Visura Camerale' },
  { value: 'qr_agenzia_entrate', label: 'QR Agenzia delle Entrate' },
  { value: 'copia_licenza',      label: 'Copia Licenza' },
  { value: 'altro',              label: 'Altro' },
]

const TIPO_LABEL = Object.fromEntries(TIPI_DOCUMENTO.map(t => [t.value, t.label]))

const ALIMENTAZIONI = [
  { value: 'benzina',        label: 'Benzina' },
  { value: 'diesel',         label: 'Diesel' },
  { value: 'gpl',            label: 'GPL' },
  { value: 'metano',         label: 'Metano' },
  { value: 'ibrido_benzina', label: 'Ibrido Benzina' },
  { value: 'ibrido_diesel',  label: 'Ibrido Diesel' },
  { value: 'elettrico',      label: 'Elettrico' },
  { value: 'idrogeno',       label: 'Idrogeno' },
  { value: 'altro',          label: 'Altro' },
]

const MOTIVI_FINE_USO = [
  { value: 'vendita',      label: 'Vendita' },
  { value: 'permuta',      label: 'Permuta' },
  { value: 'rottamazione', label: 'Rottamazione' },
  { value: 'altro',        label: 'Altro' },
]

const VUOTO_VEICOLO = {
  targa: '', marca: '', modello: '',
  annoImmatricolazione: '', alimentazione: 'benzina',
  colore: '', note: '', dataInizioUso: '',
}

function formatBytes(b) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function DocIcon({ mimeType, className }) {
  if (mimeType?.startsWith('image/')) return <Image className={className} />
  return <FileText className={className} />
}

export default function ProfiloPage() {
  const { user, updateUser, isCliente } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profilo')
  const [success, setSuccess] = useState('')
  const [profilo, setProfilo] = useState({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    codiceCliente: '',
    numeroLicenza: '',
    comuneRilascioLicenza: '',
  })
  const [datiFiscali, setDatiFiscali] = useState({
    regimeFiscale: 'forfettario',
    coefficienteRedditivita: 67,
    aliquotaForfettaria: 15,
    aliquotaINPS: 24.48,
    codiceFiscale: '',
    partitaIva: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    passwordAttuale: '',
    nuovaPassword: '',
    confermaPassword: '',
  })

  // ── Documenti state ────────────────────────────────────────────────────
  const [documenti, setDocumenti] = useState([])
  const [docLoading, setDocLoading] = useState(false)
  const [docUploading, setDocUploading] = useState(false)
  const [docTipo, setDocTipo] = useState('patente')
  const [docNote, setDocNote] = useState('')
  const [docFile, setDocFile] = useState(null)
  const [docError, setDocError] = useState('')
  const fileInputRef = useRef(null)

  // ── Veicolo state ─────────────────────────────────────────────────────────
  const [veicoli, setVeicoli] = useState([])
  const [veicoloAttivo, setVeicoloAttivo] = useState(null)
  const [veicoloLoading, setVeicoloLoading] = useState(false)
  const [veicoloForm, setVeicoloForm] = useState(VUOTO_VEICOLO)
  const [editingVeicolo, setEditingVeicolo] = useState(false) // true = modifica attivo
  const [nuovoVeicolo, setNuovoVeicolo] = useState(false)    // true = form nuovo veicolo
  const [savingVeicolo, setSavingVeicolo] = useState(false)
  const [storicizzaForm, setStoricizzaForm] = useState({ data: '', motivo: 'vendita' })
  const [showStoricizza, setShowStoricizza] = useState(false)
  const [veicoloSuccess, setVeicoloSuccess] = useState('')

  useEffect(() => {
    fetchProfilo()
  }, [])

  useEffect(() => {
    if (activeTab === 'documenti') fetchDocumenti()
    if (activeTab === 'veicolo') fetchVeicoli()
  }, [activeTab])

  async function fetchProfilo() {
    setLoading(true)
    try {
      const res = await api.get('/users/profilo')
      const u = res.data.data?.user || res.data.data
      setProfilo({
        nome: u.nome || '',
        cognome: u.cognome || '',
        email: u.email || '',
        telefono: u.telefono || '',
        codiceCliente: u.codiceCliente || '',
        numeroLicenza: u.numeroLicenza || '',
        comuneRilascioLicenza: u.comuneRilascioLicenza || '',
      })
      setDatiFiscali({
        regimeFiscale: u.regimeFiscale || 'forfettario',
        coefficienteRedditivita: Math.round((u.coefficienteRedditivita ?? 0.67) * 100),
        aliquotaForfettaria: Math.round((u.aliquotaForfettaria ?? 0.15) * 100),
        aliquotaINPS: Math.round((u.aliquotaINPS ?? 0.2448) * 10000) / 100,
        codiceFiscale: u.codiceFiscale || '',
        partitaIva: u.partitaIva || '',
      })
    } catch (err) {
      console.error('Errore caricamento profilo:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchDocumenti() {
    setDocLoading(true)
    try {
      const res = await api.get('/documenti')
      setDocumenti(res.data.data?.documenti || [])
    } catch (err) {
      console.error('Errore caricamento documenti:', err)
    } finally {
      setDocLoading(false)
    }
  }

  async function handleSaveProfilo(e) {
    e.preventDefault()
    setSaving(true)
    setSuccess('')
    try {
      const res = await api.put('/users/profilo', profilo)
      updateUser(res.data.data?.user || res.data.data)
      setSuccess('Profilo aggiornato')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      alert(err.response?.data?.messaggio || err.response?.data?.message || 'Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveFiscale(e) {
    e.preventDefault()
    setSaving(true)
    setSuccess('')
    try {
      const payload = {
        regimeFiscale: datiFiscali.regimeFiscale,
        aliquotaINPS: datiFiscali.aliquotaINPS / 100,
        codiceFiscale: datiFiscali.codiceFiscale,
        partitaIva: datiFiscali.partitaIva,
      }
      if (datiFiscali.regimeFiscale === 'forfettario') {
        payload.coefficienteRedditivita = datiFiscali.coefficienteRedditivita / 100
        payload.aliquotaForfettaria = datiFiscali.aliquotaForfettaria / 100
      }
      await api.put('/users/profilo/fiscale', payload)
      setSuccess('Dati fiscali aggiornati')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      alert(err.response?.data?.messaggio || err.response?.data?.message || 'Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (passwordForm.nuovaPassword !== passwordForm.confermaPassword) {
      alert('Le password non coincidono')
      return
    }
    setSaving(true)
    setSuccess('')
    try {
      await api.put('/auth/cambio-password', {
        passwordAttuale: passwordForm.passwordAttuale,
        nuovaPassword: passwordForm.nuovaPassword,
      })
      setPasswordForm({ passwordAttuale: '', nuovaPassword: '', confermaPassword: '' })
      setSuccess('Password aggiornata')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      alert(err.response?.data?.messaggio || err.response?.data?.message || 'Errore cambio password')
    } finally {
      setSaving(false)
    }
  }

  // ── Documenti handlers ─────────────────────────────────────────────────
  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      setDocError('File troppo grande. Massimo 5 MB.')
      setDocFile(null)
      return
    }
    const tipiAccettati = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!tipiAccettati.includes(f.type)) {
      setDocError('Formato non supportato. Usa JPG, PNG, WEBP o PDF.')
      setDocFile(null)
      return
    }
    setDocError('')
    setDocFile(f)
  }

  async function handleUploadDoc(e) {
    e.preventDefault()
    if (!docFile) { setDocError('Seleziona un file.'); return }
    setDocUploading(true)
    setDocError('')
    try {
      const fd = new FormData()
      fd.append('file', docFile)
      fd.append('tipo', docTipo)
      fd.append('note', docNote)
      await api.post('/documenti/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setDocFile(null)
      setDocNote('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchDocumenti()
    } catch (err) {
      setDocError(err.response?.data?.message || err.response?.data?.messaggio || 'Errore upload')
    } finally {
      setDocUploading(false)
    }
  }

  async function handleDeleteDoc(id) {
    if (!confirm('Eliminare questo documento?')) return
    try {
      await api.delete(`/documenti/${id}`)
      setDocumenti(prev => prev.filter(d => d._id !== id))
    } catch (err) {
      alert(err.response?.data?.message || 'Errore eliminazione')
    }
  }

  function handleDownloadDoc(doc) {
    const baseUrl = import.meta.env.VITE_API_URL || ''
    const url = `${baseUrl}/api/v1/documenti/${doc._id}/download`
    const token = localStorage.getItem('token')
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = doc.originalName
        link.click()
        URL.revokeObjectURL(blobUrl)
      })
      .catch(() => alert('Errore download'))
  }

  // ── Veicolo handlers ──────────────────────────────────────────────────────
  async function fetchVeicoli() {
    setVeicoloLoading(true)
    try {
      const res = await api.get('/veicoli')
      const list = res.data.data?.veicoli || []
      setVeicoli(list)
      setVeicoloAttivo(list.find(v => v.attivo) || null)
    } catch (err) {
      console.error('Errore caricamento veicoli:', err)
    } finally {
      setVeicoloLoading(false)
    }
  }

  async function handleSaveVeicolo(e) {
    e.preventDefault()
    setSavingVeicolo(true)
    setVeicoloSuccess('')
    try {
      if (editingVeicolo && veicoloAttivo) {
        const res = await api.put(`/veicoli/${veicoloAttivo._id}`, veicoloForm)
        setVeicoloAttivo(res.data.data.veicolo)
        setEditingVeicolo(false)
      } else {
        await api.post('/veicoli', veicoloForm)
        setNuovoVeicolo(false)
        fetchVeicoli()
      }
      setVeicoloSuccess('Veicolo salvato')
      setTimeout(() => setVeicoloSuccess(''), 3000)
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.messaggio || 'Errore salvataggio')
    } finally {
      setSavingVeicolo(false)
    }
  }

  async function handleStoricizza(e) {
    e.preventDefault()
    if (!storicizzaForm.data) { alert('Inserisci la data di fine utilizzo.'); return }
    setSavingVeicolo(true)
    try {
      await api.post(`/veicoli/${veicoloAttivo._id}/storicizza`, {
        dataFineUso: storicizzaForm.data,
        motivoFineUso: storicizzaForm.motivo,
      })
      setShowStoricizza(false)
      setStoricizzaForm({ data: '', motivo: 'vendita' })
      setNuovoVeicolo(true)
      setVeicoloForm(VUOTO_VEICOLO)
      fetchVeicoli()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore storicizzazione')
    } finally {
      setSavingVeicolo(false)
    }
  }

  const tabs = [
    { key: 'profilo',   label: 'Profilo',      icon: User },
    ...(isCliente ? [
      { key: 'fiscale',   label: 'Dati Fiscali', icon: Calculator },
      { key: 'veicolo',   label: 'Veicolo',      icon: Car },
      { key: 'documenti', label: 'Documenti',    icon: FolderOpen },
    ] : []),
    { key: 'sicurezza', label: 'Sicurezza',    icon: Shield },
  ]

  const isForfettario = datiFiscali.regimeFiscale === 'forfettario'

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader title="Il Mio Profilo" subtitle="Gestisci le tue informazioni personali e fiscali" />

      {success && (
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
          <CheckCircle className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-gray-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Profilo */}
      {activeTab === 'profilo' && (
        <form onSubmit={handleSaveProfilo} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4 max-w-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" value={profilo.nome}
                onChange={(e) => setProfilo({ ...profilo, nome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
              <input type="text" value={profilo.cognome}
                onChange={(e) => setProfilo({ ...profilo, cognome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={profilo.email}
              onChange={(e) => setProfilo({ ...profilo, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
            <input type="tel" value={profilo.telefono}
              onChange={(e) => setProfilo({ ...profilo, telefono: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codice Cliente</label>
            <input type="text" value={profilo.codiceCliente}
              onChange={(e) => setProfilo({ ...profilo, codiceCliente: e.target.value })}
              placeholder="Es. CLI-001"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numero Licenza</label>
              <input type="text" value={profilo.numeroLicenza}
                onChange={(e) => setProfilo({ ...profilo, numeroLicenza: e.target.value })}
                placeholder="Es. 42"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comune di Rilascio</label>
              <input type="text" value={profilo.comuneRilascioLicenza}
                onChange={(e) => setProfilo({ ...profilo, comuneRilascioLicenza: e.target.value })}
                placeholder="Es. Milano"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
            <Save className="w-4 h-4" />{saving ? 'Salvataggio...' : 'Salva Profilo'}
          </button>
        </form>
      )}

      {/* Tab Fiscale */}
      {activeTab === 'fiscale' && (
        <form onSubmit={handleSaveFiscale} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4 max-w-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
              <input type="text" value={datiFiscali.codiceFiscale}
                onChange={(e) => setDatiFiscali({ ...datiFiscali, codiceFiscale: e.target.value.toUpperCase() })}
                placeholder="RSSMRA80A01H501U"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA</label>
              <input type="text" value={datiFiscali.partitaIva}
                onChange={(e) => setDatiFiscali({ ...datiFiscali, partitaIva: e.target.value })}
                placeholder="12345678901"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Regime Fiscale</label>
            <select value={datiFiscali.regimeFiscale}
              onChange={(e) => setDatiFiscali({ ...datiFiscali, regimeFiscale: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
              <option value="forfettario">Forfettario</option>
              <option value="ordinario">Ordinario</option>
            </select>
          </div>
          {isForfettario && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coefficiente Redditività %</label>
                <input type="number" min="0" max="100" value={datiFiscali.coefficienteRedditivita}
                  onChange={(e) => setDatiFiscali({ ...datiFiscali, coefficienteRedditivita: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                <p className="text-xs text-gray-400 mt-1">67% per i tassisti</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aliquota Sostitutiva %</label>
                <select value={datiFiscali.aliquotaForfettaria}
                  onChange={(e) => setDatiFiscali({ ...datiFiscali, aliquotaForfettaria: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  <option value={5}>5% (primi 5 anni)</option>
                  <option value={15}>15%</option>
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aliquota INPS %</label>
            <input type="number" min="0" max="100" step="0.01" value={datiFiscali.aliquotaINPS}
              onChange={(e) => setDatiFiscali({ ...datiFiscali, aliquotaINPS: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            <p className="text-xs text-gray-400 mt-1">Default 24,48% (gestione separata INPS)</p>
          </div>
          {!isForfettario && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-purple-700 font-medium text-sm">
                <Info className="w-4 h-4" />
                Calcolo IRPEF — Scaglioni 2024-2025
              </div>
              <p className="text-xs text-purple-600">
                Nel regime ordinario l'IRPEF è calcolata per scaglioni progressivi sul reddito imponibile
                (ricavi – costi – contributi INPS deducibili).
              </p>
              <div className="space-y-1">
                {SCAGLIONI_IRPEF.map((s, i) => (
                  <div key={i} className="flex justify-between text-xs text-purple-700 bg-white rounded px-3 py-1.5">
                    <span>
                      {s.da === 0 ? 'fino a' : `da €${s.da.toLocaleString('it-IT')} a`}{' '}
                      {s.a ? `€${s.a.toLocaleString('it-IT')}` : 'oltre'}
                    </span>
                    <span className="font-semibold">{s.aliquota}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-purple-500">
                Il calcolo esatto nella Dashboard tiene conto di ricavi, costi e contributi INPS dell'anno selezionato.
              </p>
            </div>
          )}
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
            <strong>Nota:</strong> P.IVA e Codice Fiscale sono crittografati e gestiti dal consulente.
          </p>
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
            <Save className="w-4 h-4" />{saving ? 'Salvataggio...' : 'Salva Dati Fiscali'}
          </button>
        </form>
      )}

      {/* Tab Veicolo */}
      {activeTab === 'veicolo' && (
        <div className="space-y-6 max-w-2xl">
          {veicoloSuccess && (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
              <CheckCircle className="w-4 h-4 shrink-0" /> {veicoloSuccess}
            </div>
          )}

          {veicoloLoading ? (
            <div className="py-8 text-center text-gray-400 text-sm">Caricamento...</div>
          ) : (
            <>
              {/* Veicolo attivo */}
              {veicoloAttivo && !editingVeicolo && !nuovoVeicolo && (
                <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Car className="w-4 h-4 text-primary" /> Veicolo Attuale
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Attivo</span>
                    </h3>
                    <button
                      onClick={() => { setVeicoloForm({ ...veicoloAttivo, annoImmatricolazione: veicoloAttivo.annoImmatricolazione || '', dataInizioUso: veicoloAttivo.dataInizioUso ? veicoloAttivo.dataInizioUso.slice(0,10) : '' }); setEditingVeicolo(true) }}
                      className="text-xs text-primary hover:underline"
                    >
                      Modifica
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {[
                      { label: 'Targa',            value: veicoloAttivo.targa },
                      { label: 'Marca',            value: veicoloAttivo.marca },
                      { label: 'Modello',          value: veicoloAttivo.modello },
                      { label: 'Anno imm.',        value: veicoloAttivo.annoImmatricolazione },
                      { label: 'Alimentazione',    value: ALIMENTAZIONI.find(a => a.value === veicoloAttivo.alimentazione)?.label },
                      { label: 'Colore',           value: veicoloAttivo.colore || '—' },
                      { label: 'In uso dal',       value: veicoloAttivo.dataInizioUso ? new Date(veicoloAttivo.dataInizioUso).toLocaleDateString('it-IT') : '—' },
                    ].map(r => (
                      <div key={r.label}>
                        <p className="text-xs text-gray-400">{r.label}</p>
                        <p className="font-medium text-gray-800">{r.value || '—'}</p>
                      </div>
                    ))}
                  </div>
                  {veicoloAttivo.note && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">{veicoloAttivo.note}</p>
                  )}

                  {/* Storicizza */}
                  {!showStoricizza ? (
                    <button
                      onClick={() => setShowStoricizza(true)}
                      className="flex items-center gap-2 px-4 py-2 border border-orange-200 text-orange-600 bg-orange-50 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
                    >
                      <Archive className="w-4 h-4" /> Storicizza (Vendita / Permuta)
                    </button>
                  ) : (
                    <form onSubmit={handleStoricizza} className="border border-orange-200 rounded-lg p-4 space-y-3 bg-orange-50">
                      <p className="text-sm font-medium text-orange-700 flex items-center gap-2">
                        <Archive className="w-4 h-4" /> Storicizza Veicolo
                      </p>
                      <p className="text-xs text-orange-600">
                        Il veicolo verrà archiviato nello storico. Potrai poi inserire il nuovo automezzo.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Data fine utilizzo *</label>
                          <input type="date" required value={storicizzaForm.data}
                            onChange={e => setStoricizzaForm({ ...storicizzaForm, data: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Motivo</label>
                          <select value={storicizzaForm.motivo}
                            onChange={e => setStoricizzaForm({ ...storicizzaForm, motivo: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                            {MOTIVI_FINE_USO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={savingVeicolo}
                          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                          {savingVeicolo ? 'Archiviazione...' : 'Conferma Storicizzazione'}
                        </button>
                        <button type="button" onClick={() => setShowStoricizza(false)}
                          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                          Annulla
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Nessun veicolo attivo → bottone aggiungi o form diretto */}
              {!veicoloAttivo && !nuovoVeicolo && !editingVeicolo && (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
                  <Car className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm text-gray-500 mb-4">Nessun veicolo registrato</p>
                  <button
                    onClick={() => { setVeicoloForm(VUOTO_VEICOLO); setNuovoVeicolo(true) }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors mx-auto"
                  >
                    <Plus className="w-4 h-4" /> Aggiungi Veicolo
                  </button>
                </div>
              )}

              {/* Form nuovo veicolo / modifica */}
              {(nuovoVeicolo || editingVeicolo) && (
                <form onSubmit={handleSaveVeicolo} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Car className="w-4 h-4 text-primary" />
                    {editingVeicolo ? 'Modifica Veicolo' : 'Nuovo Veicolo'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Targa *</label>
                      <input required type="text" value={veicoloForm.targa}
                        onChange={e => setVeicoloForm({ ...veicoloForm, targa: e.target.value.toUpperCase() })}
                        placeholder="AB123CD"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alimentazione</label>
                      <select value={veicoloForm.alimentazione}
                        onChange={e => setVeicoloForm({ ...veicoloForm, alimentazione: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                        {ALIMENTAZIONI.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                      <input required type="text" value={veicoloForm.marca}
                        onChange={e => setVeicoloForm({ ...veicoloForm, marca: e.target.value })}
                        placeholder="Toyota"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Modello *</label>
                      <input required type="text" value={veicoloForm.modello}
                        onChange={e => setVeicoloForm({ ...veicoloForm, modello: e.target.value })}
                        placeholder="Prius"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Anno immatricolazione</label>
                      <input type="number" min="1950" max={new Date().getFullYear() + 1} value={veicoloForm.annoImmatricolazione}
                        onChange={e => setVeicoloForm({ ...veicoloForm, annoImmatricolazione: e.target.value })}
                        placeholder="2020"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Colore</label>
                      <input type="text" value={veicoloForm.colore}
                        onChange={e => setVeicoloForm({ ...veicoloForm, colore: e.target.value })}
                        placeholder="Bianco"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">In uso dal</label>
                      <input type="date" value={veicoloForm.dataInizioUso}
                        onChange={e => setVeicoloForm({ ...veicoloForm, dataInizioUso: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                    <input type="text" value={veicoloForm.note}
                      onChange={e => setVeicoloForm({ ...veicoloForm, note: e.target.value })}
                      placeholder="Es. Taxi comunale n. 42"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={savingVeicolo}
                      className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                      <Save className="w-4 h-4" />{savingVeicolo ? 'Salvataggio...' : 'Salva Veicolo'}
                    </button>
                    {(editingVeicolo || nuovoVeicolo) && (
                      <button type="button"
                        onClick={() => { setEditingVeicolo(false); setNuovoVeicolo(false) }}
                        className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                        Annulla
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* Storico veicoli precedenti */}
              {veicoli.filter(v => !v.attivo).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                    <History className="w-4 h-4 text-gray-400" />
                    <h3 className="font-semibold text-gray-800 text-sm">Storico Veicoli</h3>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {veicoli.filter(v => !v.attivo).map(v => (
                      <li key={v._id} className="px-5 py-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {v.marca} {v.modello}
                            <span className="ml-2 font-mono text-xs text-gray-400">{v.targa}</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {ALIMENTAZIONI.find(a => a.value === v.alimentazione)?.label}
                            {v.annoImmatricolazione ? ` · ${v.annoImmatricolazione}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {v.dataFineUso && (
                            <p className="text-xs text-gray-400">
                              Fine uso: <span className="font-medium">{new Date(v.dataFineUso).toLocaleDateString('it-IT')}</span>
                            </p>
                          )}
                          {v.motivoFineUso && (
                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                              {MOTIVI_FINE_USO.find(m => m.value === v.motivoFineUso)?.label || v.motivoFineUso}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab Documenti */}
      {activeTab === 'documenti' && (
        <div className="space-y-6 max-w-2xl">

          {/* Upload form */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Carica Nuovo Documento
            </h3>
            <p className="text-xs text-gray-500">
              Formati accettati: JPG, PNG, WEBP, PDF · Max 5 MB per file
            </p>

            <form onSubmit={handleUploadDoc} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento *</label>
                <select
                  value={docTipo}
                  onChange={(e) => setDocTipo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {TIPI_DOCUMENTO.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  {docFile ? (
                    <p className="text-sm font-medium text-primary">{docFile.name} ({formatBytes(docFile.size)})</p>
                  ) : (
                    <p className="text-sm text-gray-400">Clicca per selezionare o trascina il file</p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
                <input
                  type="text"
                  value={docNote}
                  onChange={(e) => setDocNote(e.target.value)}
                  placeholder="Es. Scadenza 31/12/2027"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {docError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {docError}
                </div>
              )}

              <button
                type="submit"
                disabled={docUploading || !docFile}
                className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {docUploading ? 'Caricamento...' : 'Carica Documento'}
              </button>
            </form>
          </div>

          {/* Lista documenti */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" /> Documenti Caricati
              </h3>
            </div>

            {docLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Caricamento...</div>
            ) : documenti.length === 0 ? (
              <div className="p-8 text-center">
                <FolderOpen className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">Nessun documento caricato</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {documenti.map((doc) => (
                  <li key={doc._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <DocIcon mimeType={doc.mimeType} className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {TIPO_LABEL[doc.tipo] || doc.tipo}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {doc.originalName} · {formatBytes(doc.size)}
                        {doc.note ? ` · ${doc.note}` : ''}
                      </p>
                      <p className="text-xs text-gray-300">
                        {new Date(doc.createdAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleDownloadDoc(doc)}
                        title="Scarica"
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc._id)}
                        title="Elimina"
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Tab Sicurezza */}
      {activeTab === 'sicurezza' && (
        <form onSubmit={handleChangePassword} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Attuale</label>
            <input type="password" required value={passwordForm.passwordAttuale}
              onChange={(e) => setPasswordForm({ ...passwordForm, passwordAttuale: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuova Password</label>
            <input type="password" required minLength={8} value={passwordForm.nuovaPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, nuovaPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conferma Password</label>
            <input type="password" required minLength={8} value={passwordForm.confermaPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confermaPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
            <Shield className="w-4 h-4" />{saving ? 'Aggiornamento...' : 'Cambia Password'}
          </button>
        </form>
      )}
    </div>
  )
}

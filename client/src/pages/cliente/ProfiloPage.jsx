import { useState, useEffect, useRef } from 'react'
import {
  Save, User, Shield, Calculator, Info,
  FolderOpen, Upload, Trash2, Download, FileText, Image, AlertCircle, CheckCircle
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
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profilo')
  const [success, setSuccess] = useState('')
  const [profilo, setProfilo] = useState({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
  })
  const [datiFiscali, setDatiFiscali] = useState({
    regimeFiscale: 'forfettario',
    coefficienteRedditivita: 67,
    aliquotaForfettaria: 15,
    aliquotaINPS: 24.48,
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

  useEffect(() => {
    fetchProfilo()
  }, [])

  useEffect(() => {
    if (activeTab === 'documenti') fetchDocumenti()
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
      })
      setDatiFiscali({
        regimeFiscale: u.regimeFiscale || 'forfettario',
        coefficienteRedditivita: Math.round((u.coefficienteRedditivita ?? 0.67) * 100),
        aliquotaForfettaria: Math.round((u.aliquotaForfettaria ?? 0.15) * 100),
        aliquotaINPS: Math.round((u.aliquotaINPS ?? 0.2448) * 10000) / 100,
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

  const tabs = [
    { key: 'profilo',   label: 'Profilo',      icon: User },
    { key: 'fiscale',   label: 'Dati Fiscali', icon: Calculator },
    { key: 'documenti', label: 'Documenti',    icon: FolderOpen },
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
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
            <Save className="w-4 h-4" />{saving ? 'Salvataggio...' : 'Salva Profilo'}
          </button>
        </form>
      )}

      {/* Tab Fiscale */}
      {activeTab === 'fiscale' && (
        <form onSubmit={handleSaveFiscale} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4 max-w-lg">
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

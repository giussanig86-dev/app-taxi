import { useState, useEffect } from 'react'
import { Save, User, Shield, Calculator, Info } from 'lucide-react'
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
    coefficienteRedditivita: 67,   // visualizzato come %, salvato /100
    aliquotaForfettaria: 15,       // visualizzato come %, salvato /100
    aliquotaINPS: 24.48,           // visualizzato come %, salvato /100
  })
  const [passwordForm, setPasswordForm] = useState({
    passwordAttuale: '',
    nuovaPassword: '',
    confermaPassword: '',
  })

  useEffect(() => {
    fetchProfilo()
  }, [])

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
      // Converte da % a decimale prima di inviare
      const payload = {
        regimeFiscale: datiFiscali.regimeFiscale,
        aliquotaINPS: datiFiscali.aliquotaINPS / 100,
      }
      if (datiFiscali.regimeFiscale === 'forfettario') {
        payload.coefficienteRedditivita = datiFiscali.coefficienteRedditivita / 100
        payload.aliquotaForfettaria = datiFiscali.aliquotaForfettaria / 100
      }
      await api.put('/users/profilo/dati-fiscali', payload)
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

  const tabs = [
    { key: 'profilo', label: 'Profilo', icon: User },
    { key: 'fiscale', label: 'Dati Fiscali', icon: Calculator },
    { key: 'sicurezza', label: 'Sicurezza', icon: Shield },
  ]

  const isForfettario = datiFiscali.regimeFiscale === 'forfettario'

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader title="Il Mio Profilo" subtitle="Gestisci le tue informazioni personali e fiscali" />

      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">{success}</div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
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
          {/* Regime Fiscale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Regime Fiscale</label>
            <select value={datiFiscali.regimeFiscale}
              onChange={(e) => setDatiFiscali({ ...datiFiscali, regimeFiscale: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
              <option value="forfettario">Forfettario</option>
              <option value="ordinario">Ordinario</option>
            </select>
          </div>

          {/* Campi solo forfettario */}
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

          {/* Aliquota INPS - sempre visibile */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aliquota INPS %</label>
            <input type="number" min="0" max="100" step="0.01" value={datiFiscali.aliquotaINPS}
              onChange={(e) => setDatiFiscali({ ...datiFiscali, aliquotaINPS: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            <p className="text-xs text-gray-400 mt-1">Default 24,48% (gestione separata INPS)</p>
          </div>

          {/* Info IRPEF ordinario */}
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

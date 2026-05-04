import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Save, Settings, Shield, CreditCard, Bell, User, Building2, RefreshCw, Link2, Link2Off, Upload, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import api from '@/lib/api'
import { cn, formatEuro } from '@/lib/utils'
import { PIANI_SAAS } from '@/lib/constants'
import PageHeader from '@/components/shared/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'

export default function ImpostazioniPage() {
  const { user, updateUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profilo')
  const [success, setSuccess] = useState('')

  // AdE state
  const [adeStatus, setAdeStatus] = useState(null)
  const [adeLoading, setAdeLoading] = useState(false)
  const [adeSyncing, setAdeSyncing] = useState(false)
  const [adeError, setAdeError] = useState('')
  const [adeSuccess, setAdeSuccess] = useState('')
  const [adeSettings, setAdeSettings] = useState({ syncFrequency: 'daily', importOnlyAfter: '' })
  const [adeImportFile, setAdeImportFile] = useState(null)
  const [profilo, setProfilo] = useState({
    nome: '', cognome: '', email: '', telefono: '',
    studioNome: '', studioIndirizzo: '', studioPec: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    passwordAttuale: '', nuovaPassword: '', confermaPassword: '',
  })

  useEffect(() => {
    fetchProfilo()
    fetchAdeStatus()

    // Gestisci redirect da OAuth AdE
    const connessa = searchParams.get('connessa')
    const errore   = searchParams.get('errore')
    if (connessa) { setAdeSuccess('Connessione AdE completata con successo!'); setSearchParams({}) }
    if (errore)   { setAdeError(decodeURIComponent(errore)); setSearchParams({}) }
  }, [])

  async function fetchAdeStatus() {
    try {
      const res = await api.get('/ade/status')
      const d = res.data.data
      setAdeStatus(d)
      setAdeSettings(s => ({
        syncFrequency: d.frequenza || 'daily',
        importOnlyAfter: d.importaDal ? d.importaDal.substring(0, 10) : '',
      }))
    } catch { /* non critico */ }
  }

  async function handleAdeConnect() {
    setAdeLoading(true)
    setAdeError('')
    try {
      const res = await api.get('/ade/auth-url')
      window.location.href = res.data.data.authUrl
    } catch (err) {
      setAdeError(err.response?.data?.messaggio || 'Errore connessione AdE')
      setAdeLoading(false)
    }
  }

  async function handleAdeDisconnect() {
    if (!confirm('Vuoi rimuovere la connessione AdE? Le fatture già importate rimangono.')) return
    try {
      await api.delete('/ade/connection')
      setAdeSuccess('Connessione AdE rimossa.')
      fetchAdeStatus()
    } catch (err) {
      setAdeError(err.response?.data?.messaggio || 'Errore')
    }
  }

  async function handleAdeSaveSettings(e) {
    e.preventDefault()
    try {
      await api.patch('/ade/settings', adeSettings)
      setAdeSuccess('Impostazioni aggiornate.')
      setTimeout(() => setAdeSuccess(''), 3000)
      fetchAdeStatus()
    } catch (err) {
      setAdeError(err.response?.data?.messaggio || 'Errore')
    }
  }

  async function handleAdeSync() {
    setAdeSyncing(true)
    setAdeError('')
    setAdeSuccess('')
    try {
      const res = await api.post('/ade/sync')
      setAdeSuccess(res.data.messaggio)
      fetchAdeStatus()
    } catch (err) {
      setAdeError(err.response?.data?.messaggio || 'Errore sincronizzazione')
    } finally {
      setAdeSyncing(false)
    }
  }

  async function handleAdeImportXml(clienteId) {
    if (!adeImportFile || !clienteId) return
    const fd = new FormData()
    fd.append('file', adeImportFile)
    setAdeLoading(true)
    try {
      const res = await api.post(`/ade/import-xml?userId=${clienteId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAdeSuccess(res.data.messaggio)
      setAdeImportFile(null)
    } catch (err) {
      setAdeError(err.response?.data?.messaggio || 'Errore import')
    } finally {
      setAdeLoading(false)
    }
  }

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
        studioNome: u.studio?.nome || '',
        studioIndirizzo: u.studio?.indirizzo || '',
        studioPec: u.studio?.pec || '',
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
      const payload = {
        nome: profilo.nome,
        cognome: profilo.cognome,
        email: profilo.email,
        telefono: profilo.telefono,
        studio: {
          nome: profilo.studioNome,
          indirizzo: profilo.studioIndirizzo,
          pec: profilo.studioPec,
        },
      }
      const res = await api.put('/users/profilo', payload)
      updateUser(res.data.data?.user || res.data.data)
      setSuccess('Profilo aggiornato con successo')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      alert(err.response?.data?.message || 'Errore salvataggio')
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
      setSuccess('Password aggiornata con successo')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      alert(err.response?.data?.message || 'Errore cambio password')
    } finally {
      setSaving(false)
    }
  }

  const piano = PIANI_SAAS[user?.piano?.tipo] || PIANI_SAAS.free
  const tabs = [
    { key: 'profilo',   label: 'Profilo & Studio',   icon: User },
    { key: 'piano',     label: 'Piano SaaS',          icon: CreditCard },
    { key: 'ade',       label: 'AdE / Fatture',       icon: Building2 },
    { key: 'sicurezza', label: 'Sicurezza',            icon: Shield },
  ]

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader title="Impostazioni" subtitle="Gestisci il tuo profilo, piano e sicurezza" />

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
        <form onSubmit={handleSaveProfilo} className="space-y-6 max-w-lg">
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">Dati Personali</h3>
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
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">Dati Studio</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Studio</label>
              <input type="text" value={profilo.studioNome}
                onChange={(e) => setProfilo({ ...profilo, studioNome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Es. Studio Rossi & Associati" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo Studio</label>
              <input type="text" value={profilo.studioIndirizzo}
                onChange={(e) => setProfilo({ ...profilo, studioIndirizzo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PEC Studio</label>
              <input type="email" value={profilo.studioPec}
                onChange={(e) => setProfilo({ ...profilo, studioPec: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
            <Save className="w-4 h-4" />{saving ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </form>
      )}

      {/* Tab Piano */}
      {activeTab === 'piano' && (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-white rounded-xl border border-primary/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Piano Attuale: {piano.label}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {piano.prezzo === 0 ? 'Gratuito' : `${formatEuro(piano.prezzo)}/mese`} · Max {piano.maxClienti} clienti
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(PIANI_SAAS).map(([key, p]) => (
              <div key={key} className={cn(
                'bg-white rounded-xl border p-5 text-center transition-all',
                user?.piano?.tipo === key ? 'border-primary ring-2 ring-primary/20' : 'border-gray-100 hover:border-gray-200'
              )}>
                <h4 className="font-bold text-lg">{p.label}</h4>
                <p className="text-2xl font-bold mt-2">
                  {p.prezzo === 0 ? 'Gratis' : `€${p.prezzo}`}
                  {p.prezzo > 0 && <span className="text-sm font-normal text-gray-400">/mese</span>}
                </p>
                <p className="text-sm text-gray-500 mt-2">Max {p.maxClienti} clienti</p>
                {user?.piano?.tipo === key ? (
                  <p className="mt-4 text-sm text-primary font-medium">Piano attuale</p>
                ) : (
                  <button className="mt-4 w-full px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors">
                    {p.prezzo > (PIANI_SAAS[user?.piano?.tipo]?.prezzo || 0) ? 'Upgrade' : 'Seleziona'}
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center">
            Per modificare il piano contatta il supporto o gestisci il tuo abbonamento dalla dashboard di pagamento.
          </p>
        </div>
      )}

      {/* Tab AdE */}
      {activeTab === 'ade' && (
        <div className="space-y-6 max-w-2xl">
          {adeError   && <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm"><AlertCircle className="w-4 h-4 shrink-0" />{adeError}</div>}
          {adeSuccess && <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm"><CheckCircle className="w-4 h-4 shrink-0" />{adeSuccess}</div>}

          {/* Stato connessione */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">Agenzia delle Entrate</h3>
                <p className="text-sm text-gray-500 mt-0.5">Download automatico fatture passive dal Cassetto Fiscale</p>
              </div>
              <div className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                adeStatus?.connessa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              )}>
                {adeStatus?.connessa ? <><CheckCircle className="w-3.5 h-3.5" /> Connessa</> : <><Link2Off className="w-3.5 h-3.5" /> Non connessa</>}
              </div>
            </div>

            {!adeStatus?.adeConfigured && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 mb-4">
                <strong>Configurazione richiesta:</strong> le credenziali OAuth2 AdE non sono ancora impostate sul server.
                Contatta il supporto TAXITAX per completare la configurazione iniziale (richiede registrazione app su AdE).
              </div>
            )}

            {adeStatus?.connessa ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 space-y-1">
                  {adeStatus.ultimaSync && (
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Ultima sync: {new Date(adeStatus.ultimaSync).toLocaleString('it-IT')}
                      {adeStatus.statoSync === 'ok' && <span className="text-green-600 font-medium ml-1">✓ OK</span>}
                      {adeStatus.statoSync === 'error' && <span className="text-red-600 font-medium ml-1">⚠ Errore</span>}
                    </p>
                  )}
                  {adeStatus.connessaDal && (
                    <p className="text-gray-400 text-xs">Connessa dal {new Date(adeStatus.connessaDal).toLocaleDateString('it-IT')}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleAdeSync} disabled={adeSyncing}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    <RefreshCw className={cn('w-4 h-4', adeSyncing && 'animate-spin')} />
                    {adeSyncing ? 'Sincronizzazione...' : 'Sincronizza ora'}
                  </button>
                  <button onClick={handleAdeDisconnect}
                    className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                    <Link2Off className="w-4 h-4" /> Disconnetti
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={handleAdeConnect} disabled={adeLoading || !adeStatus?.adeConfigured}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Link2 className="w-4 h-4" />
                {adeLoading ? 'Reindirizzamento...' : 'Connetti con SPID / CIE / CNS'}
              </button>
            )}
          </div>

          {/* Impostazioni sync */}
          {adeStatus?.connessa && (
            <form onSubmit={handleAdeSaveSettings} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
              <h3 className="font-semibold text-gray-800">Impostazioni Sincronizzazione</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequenza automatica</label>
                <select value={adeSettings.syncFrequency}
                  onChange={e => setAdeSettings(s => ({ ...s, syncFrequency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  <option value="hourly">Ogni ora</option>
                  <option value="daily">Giornaliera (06:00)</option>
                  <option value="manual">Solo manuale</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Importa fatture a partire dal</label>
                <input type="date" value={adeSettings.importOnlyAfter}
                  onChange={e => setAdeSettings(s => ({ ...s, importOnlyAfter: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                <p className="text-xs text-gray-400 mt-1">Lascia vuoto per importare gli ultimi 90 giorni alla prima sync</p>
              </div>
              <button type="submit"
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                <Save className="w-4 h-4" /> Salva impostazioni
              </button>
            </form>
          )}

          {/* Import manuale XML/ZIP */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">Import Manuale FatturaPA</h3>
            <p className="text-sm text-gray-500">
              Carica un file XML o ZIP scaricato dal Cassetto Fiscale AdE.
              Le fatture vengono importate come costi dei rispettivi clienti.
            </p>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors">
              <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <input type="file" accept=".xml,.p7m,.zip" id="ade-xml-input"
                className="hidden"
                onChange={e => setAdeImportFile(e.target.files[0])} />
              <label htmlFor="ade-xml-input" className="cursor-pointer text-sm text-primary font-medium hover:underline">
                Seleziona file XML, P7M o ZIP
              </label>
              {adeImportFile && (
                <p className="text-xs text-gray-500 mt-2">{adeImportFile.name}</p>
              )}
            </div>
            {adeImportFile && (
              <p className="text-xs text-amber-600">
                Nota: l'import manuale richiede di selezionare il cliente dalla pagina "Clienti" → "Sincronizza fatture".
              </p>
            )}
          </div>

          {/* Come funziona */}
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
            <h4 className="font-semibold text-blue-800 text-sm mb-2">Come funziona</h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Clicca "Connetti con SPID" e completa il login AdE</li>
              <li>Il sistema scarica automaticamente le fatture passive dei tuoi clienti</li>
              <li>Le fatture appaiono nella sezione "Costi" di ciascun cliente come <em>fattura_passiva</em></li>
              <li>Approva o rifiuta ogni fattura dalla sezione "Approvazioni"</li>
            </ol>
          </div>
        </div>
      )}

      {/* Tab Sicurezza */}
      {activeTab === 'sicurezza' && (
        <form onSubmit={handleChangePassword} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4 max-w-lg">
          <h3 className="font-semibold text-gray-800">Cambio Password</h3>
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

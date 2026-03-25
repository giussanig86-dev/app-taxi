import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Menu, LogOut, User, ChevronDown, LayoutDashboard, Car, Bell, X, CheckCheck } from 'lucide-react'
import { useNavigate, NavLink } from 'react-router-dom'
import api from '@/lib/api'
import { useActiveCliente } from '@/contexts/ActiveClienteContext'

export default function Topbar({ onMenuClick, anno, onAnnoChange }) {
  const { user, logout, isCliente, isConsulente } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [targaAttiva, setTargaAttiva] = useState(null)
  const { clienteAttivo } = useActiveCliente()
  const [bellOpen, setBellOpen] = useState(false)
  const [notifiche, setNotifiche] = useState([])
  const [nonLette, setNonLette] = useState(0)
  const bellRef = useRef(null)

  // Fetch veicolo attivo una sola volta al mount (solo per il cliente)
  useEffect(() => {
    if (!isCliente) return
    api.get('/veicoli/attivo')
      .then(r => setTargaAttiva(r.data.data?.veicolo?.targa || null))
      .catch(() => {})
  }, [isCliente])

  // Fetch notifiche per consulente
  useEffect(() => {
    if (!isConsulente) return
    fetchNotifiche()
    const iv = setInterval(fetchNotifiche, 60000)
    return () => clearInterval(iv)
  }, [isConsulente])

  async function fetchNotifiche() {
    try {
      const res = await api.get('/notifiche')
      setNotifiche(res.data.data?.notifiche || [])
      setNonLette(res.data.data?.nonLette || 0)
    } catch {}
  }

  async function handleSegnaLetta(notificaId) {
    try {
      await api.patch(`/notifiche/${notificaId}/letta`)
      setNotifiche(prev => prev.map(n => n._id === notificaId ? { ...n, letta: true } : n))
      setNonLette(prev => Math.max(0, prev - 1))
    } catch {}
  }

  async function handleSegnaLetteTutte() {
    try {
      await api.patch('/notifiche/leggi-tutte')
      setNotifiche(prev => prev.map(n => ({ ...n, letta: true })))
      setNonLette(0)
    } catch {}
  }

  async function handleDeleteNotifica(notificaId) {
    try {
      await api.delete(`/notifiche/${notificaId}`)
      const n = notifiche.find(x => x._id === notificaId)
      setNotifiche(prev => prev.filter(x => x._id !== notificaId))
      if (n && !n.letta) setNonLette(prev => Math.max(0, prev - 1))
    } catch {}
  }

  // Dati da mostrare nell'info strip: cliente loggato o cliente selezionato dal consulente
  const stripData = isCliente
    ? { nome: user?.nome, cognome: user?.cognome, codiceCliente: user?.codiceCliente, numeroLicenza: user?.numeroLicenza, comuneRilascioLicenza: user?.comuneRilascioLicenza, targa: targaAttiva }
    : (isConsulente && clienteAttivo) ? clienteAttivo
    : null

  const currentYear = new Date().getFullYear()
  const anni = [currentYear, currentYear - 1, currentYear - 2]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-border px-4 lg:px-6">
      <div className="flex items-center justify-between h-14 relative">
        {/* Left: menu button + year selector */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-text-secondary"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Anno selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary hidden sm:block">Anno fiscale:</span>
            <select
              value={anno}
              onChange={(e) => onAnnoChange(parseInt(e.target.value))}
              className="text-sm font-semibold bg-gray-50 border border-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-light focus:border-transparent"
            >
              {anni.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: home icon (solo cliente, solo mobile) */}
        {isCliente && (
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `absolute left-1/2 -translate-x-1/2 lg:hidden p-2 rounded-lg transition-colors ${
                isActive ? 'text-primary bg-primary/5' : 'text-text-secondary hover:bg-gray-100'
              }`
            }
            title="Dashboard"
          >
            <LayoutDashboard className="w-5 h-5" />
          </NavLink>
        )}

        {/* Right: bell + user menu */}
        <div className="flex items-center gap-2">

        {/* Bell notifiche (solo consulente) */}
        {isConsulente && (
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setBellOpen(o => !o)}
              className="relative p-2 rounded-lg hover:bg-gray-100 text-text-secondary transition-colors"
              title="Notifiche"
            >
              <Bell className="w-5 h-5" />
              {nonLette > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {nonLette > 9 ? '9+' : nonLette}
                </span>
              )}
            </button>

            {bellOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-semibold text-sm text-gray-800">Notifiche</span>
                    {nonLette > 0 && (
                      <button onClick={handleSegnaLetteTutte} className="text-xs text-primary flex items-center gap-1 hover:underline">
                        <CheckCheck className="w-3.5 h-3.5" /> Segna tutte lette
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {notifiche.length === 0 ? (
                      <p className="text-center text-sm text-gray-400 py-8">Nessuna notifica</p>
                    ) : notifiche.map(n => (
                      <div key={n._id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${n.letta ? 'opacity-60' : ''}`}>
                        <div className="flex items-start gap-2">
                          {!n.letta && <span className="mt-1.5 w-2 h-2 bg-primary rounded-full shrink-0" />}
                          {n.letta && <span className="mt-1.5 w-2 h-2 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800">{n.titolo}</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.messaggio}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[10px] text-gray-300">{new Date(n.createdAt).toLocaleDateString('it-IT')}</span>
                              {!n.letta && (
                                <button onClick={() => handleSegnaLetta(n._id)} className="text-[10px] text-primary hover:underline">Segna letta</button>
                              )}
                              {n.clienteId && (
                                <button
                                  onClick={() => { navigate(`/consulente/clienti/${n.clienteId._id || n.clienteId}`); setBellOpen(false) }}
                                  className="text-[10px] text-primary hover:underline">Vai al cliente</button>
                              )}
                            </div>
                          </div>
                          <button onClick={() => handleDeleteNotifica(n._id)} className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-500 shrink-0">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.nome?.[0]}{user?.cognome?.[0]}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-text-primary leading-none">
                {user?.nome} {user?.cognome}
              </p>
              <p className="text-[11px] text-text-secondary capitalize">{user?.ruolo?.replace('_', ' ')}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-lg shadow-lg z-50 py-1">
                <button
                  onClick={() => { navigate('/profilo'); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-gray-50"
                >
                  <User className="w-4 h-4" />
                  Profilo
                </button>
                <hr className="my-1 border-border" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Esci
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info strip — cliente loggato O cliente selezionato dal consulente */}
      {stripData && (
        <div className="flex items-center justify-between pb-1.5 -mt-1 gap-4 overflow-x-auto">
          {/* Nome + codice cliente */}
          <div className="flex items-center gap-3 min-w-0">
            {isConsulente && (
              <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wide shrink-0">Cliente:</span>
            )}
            <span className="text-sm font-semibold text-gray-800 truncate">
              {stripData.nome} {stripData.cognome}
            </span>
            {stripData.codiceCliente && (
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[11px] font-mono rounded shrink-0">
                {stripData.codiceCliente}
              </span>
            )}
          </div>

          {/* Licenza + targa */}
          <div className="flex items-center gap-3 shrink-0 text-[11px] text-gray-500">
            {(stripData.numeroLicenza || stripData.comuneRilascioLicenza) && (
              <span className="flex items-center gap-1">
                <span className="text-gray-300">|</span>
                Lic.
                {stripData.numeroLicenza && <strong className="text-gray-700 ml-0.5">{stripData.numeroLicenza}</strong>}
                {stripData.comuneRilascioLicenza && <span className="ml-1">– {stripData.comuneRilascioLicenza}</span>}
              </span>
            )}
            {stripData.targa && (
              <span className="flex items-center gap-1">
                <span className="text-gray-300">|</span>
                <Car className="w-3 h-3 text-gray-400" />
                <strong className="font-mono text-gray-700">{stripData.targa}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

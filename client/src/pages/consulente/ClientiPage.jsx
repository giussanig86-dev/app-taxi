import { useState, useEffect } from 'react'
import { Plus, Search, Users, Eye, Mail, Phone, ChevronRight, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { formatEuro, cn } from '@/lib/utils'
import PageHeader from '@/components/shared/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import { useOutletContext } from 'react-router-dom'

export default function ClientiPage() {
  const { anno } = useOutletContext()
  const [clienti, setClienti] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newForm, setNewForm] = useState({
    nome: '', cognome: '', email: '', telefono: '', password: 'Taxi2026!',
  })

  useEffect(() => {
    fetchClienti()
  }, [])

  async function fetchClienti() {
    setLoading(true)
    try {
      const res = await api.get('/users/clienti')
      setClienti(res.data.data?.clienti || [])
    } catch (err) {
      console.error('Errore caricamento clienti:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleNewClient(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/users/clienti', newForm)
      setShowNew(false)
      setNewForm({ nome: '', cognome: '', email: '', telefono: '', password: 'Taxi2026!' })
      fetchClienti()
    } catch (err) {
      alert(err.response?.data?.message || 'Errore creazione cliente')
    } finally {
      setSaving(false)
    }
  }

  const filtered = clienti.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.nome?.toLowerCase().includes(q) ||
           c.cognome?.toLowerCase().includes(q) ||
           c.email?.toLowerCase().includes(q)
  })

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader
        title="I Miei Clienti"
        subtitle={`${clienti.length} clienti registrati`}
        actionLabel="Nuovo Cliente"
        actionIcon={UserPlus}
        onAction={() => setShowNew(true)}
      />

      {/* Ricerca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Cerca per nome, cognome o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Lista clienti */}
      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nessun cliente" description="Aggiungi il tuo primo cliente per iniziare." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Link
              key={c._id}
              to={`/consulente/clienti/${c._id}`}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-primary/20 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {c.nome?.charAt(0)}{c.cognome?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{c.nome} {c.cognome}</h3>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="mt-2 space-y-1">
                    {c.email && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail className="w-3.5 h-3.5" /> {c.email}
                      </p>
                    )}
                    {c.telefono && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="w-3.5 h-3.5" /> {c.telefono}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-green-600">{formatEuro(c.fatturato || 0)}</p>
                      <p className="text-[10px] text-gray-400">Fatturato {anno}</p>
                    </div>
                    {c.costiPendenti > 0 && (
                      <div className="text-center ml-auto">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600">
                          {c.costiPendenti} da approvare
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal nuovo cliente */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" /> Nuovo Cliente
              </h3>
              <button onClick={() => setShowNew(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
            <form onSubmit={handleNewClient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input type="text" required value={newForm.nome}
                    onChange={(e) => setNewForm({ ...newForm, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
                  <input type="text" required value={newForm.cognome}
                    onChange={(e) => setNewForm({ ...newForm, cognome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" required value={newForm.email}
                  onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <input type="tel" value={newForm.telefono}
                  onChange={(e) => setNewForm({ ...newForm, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password iniziale</label>
                <input type="text" value={newForm.password}
                  onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                <p className="text-xs text-gray-400 mt-1">Il cliente potrà cambiarla al primo accesso</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Annulla</button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving ? 'Creazione...' : 'Crea Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

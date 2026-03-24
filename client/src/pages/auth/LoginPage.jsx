import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Car, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await login(email, password)

      // Redirect in base al ruolo
      if (user.ruolo === 'consulente') {
        navigate('/consulente')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.messaggio || 'Errore durante il login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-2xl mb-4">
            <Car className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CalcoloTaxi</h1>
          <p className="text-blue-200/70 text-sm mt-1">Calcolatore Forfettario SaaS</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-7 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Accedi</h2>
            <p className="text-sm text-text-secondary">Inserisci le tue credenziali</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@esempio.it"
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-light focus:border-transparent outline-none"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary-light focus:border-transparent outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Accesso in corso...
              </span>
            ) : (
              'Accedi'
            )}
          </button>
        </form>

        {/* Dev credentials hint */}
        <div className="mt-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
          <p className="text-xs text-blue-200/80 font-medium mb-2">Credenziali demo:</p>
          <div className="space-y-1 text-xs text-blue-200/60">
            <p><span className="text-blue-200/80">Tassista:</span> mario.rossi@taxi.it / Cliente123!</p>
            <p><span className="text-blue-200/80">Consulente:</span> consulente@studio.it / Consulente123!</p>
          </div>
        </div>
      </div>
    </div>
  )
}

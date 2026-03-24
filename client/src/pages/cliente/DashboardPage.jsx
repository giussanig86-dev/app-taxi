import { useOutletContext } from 'react-router-dom'
import { useFetch } from '@/hooks/useFetch'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { formatEuro, formatData, giorniDaOggi } from '@/lib/utils'
import { TIPI_VERSAMENTO, COLORI_GRAFICO, CATEGORIE_COSTI } from '@/lib/constants'
import { Receipt, Wallet, Calculator, TrendingUp, AlertTriangle, Calendar } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

export default function DashboardPage() {
  const { anno } = useOutletContext()
  const { data, loading, error } = useFetch('/dashboard/cliente', {
    params: { anno },
    deps: [anno],
  })

  if (loading) return <LoadingSpinner size="lg" />
  if (error) return <div className="text-center text-danger py-8">{error}</div>

  const d = data?.data
  if (!d) return null

  const r = d.riepilogoAnnuale

  // Prepara dati grafici
  const andamentoData = (d.andamentoMensile || []).map(item => ({
    mese: MESI_BREVI[item.mese - 1],
    totale: Math.round(item.totale),
    corse: item.count,
  }))

  const metodiData = (d.breakdownMetodiPagamento || []).map(item => ({
    name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
    value: Math.round(item.totale),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Riepilogo fiscale ${anno}`}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Corrispettivi"
          value={formatEuro(r.totaleCorrispettivi)}
          subtitle={`${r.numeroCorrispettivi || 0} corse`}
          icon={Receipt}
        />
        <StatCard
          title="Costi"
          value={formatEuro(r.totaleCosti)}
          icon={Wallet}
        />
        <StatCard
          title="Stima Imposta"
          value={formatEuro(r.regimeFiscale === 'ordinario' ? r.irpefLorda : r.impostaSostitutiva)}
          subtitle={`Aliquota eff. ${r.aliquotaEffettiva || 0}%`}
          icon={Calculator}
        />
        <StatCard
          title="Netto Stimato"
          value={formatEuro(r.nettoStimato)}
          subtitle={`Reddito ${formatEuro(r.redditoImponibile)}`}
          icon={TrendingUp}
        />
      </div>

      {/* Grafici */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Andamento mensile */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Andamento Corrispettivi Mensile</h3>
          {andamentoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={andamentoData}>
                <XAxis dataKey="mese" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => [formatEuro(value), 'Totale']}
                  contentStyle={{ fontSize: 13, borderRadius: 8 }}
                />
                <Bar dataKey="totale" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-secondary text-center py-12">Nessun dato disponibile</p>
          )}
        </div>

        {/* Metodi pagamento */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Metodi Pagamento</h3>
          {metodiData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={metodiData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {metodiData.map((_, i) => (
                    <Cell key={i} fill={COLORI_GRAFICO[i % COLORI_GRAFICO.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatEuro(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-secondary text-center py-12">Nessun dato</p>
          )}
        </div>
      </div>

      {/* Scadenze e dettagli fiscali */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Prossime scadenze */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Prossime Scadenze
          </h3>
          {(d.prossimeScadenze || []).length > 0 ? (
            <div className="space-y-3">
              {d.prossimeScadenze.slice(0, 5).map((s, i) => {
                const giorni = giorniDaOggi(s.dataScadenza)
                return (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{TIPI_VERSAMENTO[s.tipoVersamento] || s.tipoVersamento}</p>
                      <p className="text-xs text-text-secondary">{formatData(s.dataScadenza)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatEuro(s.importo)}</p>
                      <p className={`text-xs ${giorni <= 7 ? 'text-danger font-medium' : 'text-text-secondary'}`}>
                        {giorni <= 0 ? 'Scaduto!' : `${giorni} giorni`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-text-secondary text-center py-6">Nessuna scadenza imminente</p>
          )}
        </div>

        {/* Dettaglio fiscale */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Dettaglio Calcolo Fiscale
            <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${r.regimeFiscale === 'ordinario' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {r.regimeFiscale === 'ordinario' ? 'Ordinario' : 'Forfettario'}
            </span>
          </h3>

          {r.regimeFiscale === 'ordinario' ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Ricavo lordo</span>
                <span className="font-medium">{formatEuro(r.ricavoLordo)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Costi deducibili</span>
                <span className="font-medium text-danger">- {formatEuro(r.totaleCosti)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Reddito lordo</span>
                <span className="font-medium">{formatEuro(r.redditoLordo)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Contributi INPS (24,48%)</span>
                <span className="font-medium text-danger">- {formatEuro(r.contributiINPS)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Reddito imponibile IRPEF</span>
                <span className="font-medium">{formatEuro(r.redditoImponibile)}</span>
              </div>
              {(r.dettaglioScaglioni || []).map((s, i) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-dashed border-gray-100 text-xs">
                  <span className="text-text-secondary pl-3">
                    Scaglione {(s.aliquota * 100).toFixed(0)}% ({formatEuro(s.da)} – {s.a >= 1e9 ? '∞' : formatEuro(s.a)})
                  </span>
                  <span className="text-danger">{formatEuro(s.imposta)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">IRPEF lorda</span>
                <span className="font-medium text-danger">{formatEuro(r.irpefLorda)}</span>
              </div>
              <div className="flex justify-between py-2 bg-green-50 -mx-5 px-5 rounded-lg">
                <span className="font-semibold text-success">Netto stimato</span>
                <span className="font-bold text-success">{formatEuro(r.nettoStimato)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Ricavo lordo</span>
                <span className="font-medium">{formatEuro(r.ricavoLordo)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Reddito imponibile (67%)</span>
                <span className="font-medium">{formatEuro(r.redditoImponibile)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Contributi INPS (24,48%)</span>
                <span className="font-medium text-danger">{formatEuro(r.contributiINPS)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Base imponibile fiscale</span>
                <span className="font-medium">{formatEuro(r.baseImponibileFiscale)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Imposta sostitutiva</span>
                <span className="font-medium text-danger">{formatEuro(r.impostaSostitutiva)}</span>
              </div>
              <div className="flex justify-between py-2 bg-green-50 -mx-5 px-5 rounded-lg">
                <span className="font-semibold text-success">Netto stimato</span>
                <span className="font-bold text-success">{formatEuro(r.nettoStimato)}</span>
              </div>
            </div>
          )}


          {/* Alert scaduti */}
          {(d.versamentiScaduti || []).length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-danger">
                  {d.versamentiScaduti.length} versament{d.versamentiScaduti.length === 1 ? 'o' : 'i'} scadut{d.versamentiScaduti.length === 1 ? 'o' : 'i'}
                </p>
                <p className="text-xs text-red-600">Contatta il tuo consulente</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

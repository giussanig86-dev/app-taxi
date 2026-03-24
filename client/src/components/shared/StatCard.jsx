import { cn } from '@/lib/utils'

export default function StatCard({ title, value, subtitle, icon: Icon, trend, className }) {
  return (
    <div className={cn('bg-white rounded-xl border border-border p-5 hover:shadow-sm transition-shadow', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          {subtitle && (
            <p className="text-xs text-text-secondary">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          <span className={cn(
            'text-xs font-medium',
            trend >= 0 ? 'text-success' : 'text-danger'
          )}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-text-secondary">rispetto mese prec.</span>
        </div>
      )}
    </div>
  )
}

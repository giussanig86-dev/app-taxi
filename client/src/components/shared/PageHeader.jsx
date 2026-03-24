import { cn } from '@/lib/utils'

export default function PageHeader({ title, subtitle, action, actionLabel, actionIcon: ActionIcon, onAction, className }) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6', className)}>
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {!action && actionLabel && onAction && (
        <button
          onClick={onAction}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          {actionLabel}
        </button>
      )}
    </div>
  )
}

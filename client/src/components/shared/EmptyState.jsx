import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'Nessun dato', description, icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-text-secondary" />
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      {description && <p className="text-sm text-text-secondary max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

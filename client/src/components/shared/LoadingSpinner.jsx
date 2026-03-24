import { cn } from '@/lib/utils'

export default function LoadingSpinner({ size = 'md', className }) {
  const sizes = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  }

  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizes[size]
      )} />
    </div>
  )
}

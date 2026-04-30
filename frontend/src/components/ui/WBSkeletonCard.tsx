/**
 * WBSkeletonCard — Loading skeleton placeholder for cards.
 *
 * Displays a shimmer animation while data is loading. Replaces
 * the generic spinner-only loading states.
 */

interface Props {
  lines?: number
  className?: string
}

export default function WBSkeletonCard({ lines = 3, className = '' }: Props) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-4 ${className}`}>
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full skeleton-shimmer" />
        <div className="h-3 w-24 rounded-pill skeleton-shimmer" />
        <div className="h-3 w-12 rounded-pill skeleton-shimmer ms-auto" />
      </div>
      {/* Line skeletons */}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded-pill skeleton-shimmer mb-2 last:mb-0"
          style={{ width: `${90 - i * 15}%` }}
        />
      ))}
    </div>
  )
}

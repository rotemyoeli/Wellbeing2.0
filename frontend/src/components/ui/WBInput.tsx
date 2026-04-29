import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  mono?: boolean
}

export default function WBInput({
  label,
  error,
  hint,
  mono = false,
  className = '',
  ...rest
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-caption font-medium text-ink-700">{label}</label>
      )}
      <input
        className={`
          h-11 rounded-md border bg-surface px-3.5 text-body text-ink-900
          outline-none transition-shadow
          focus:shadow-focus focus:border-accent-700
          ${error ? 'border-alert-low-fg' : 'border-line'}
          ${mono ? 'font-mono tracking-[0.4em] text-center' : ''}
          ${className}
        `}
        {...rest}
      />
      {error && <p className="text-caption text-alert-low-fg">{error}</p>}
      {hint && !error && <p className="text-caption text-ink-400">{hint}</p>}
    </div>
  )
}

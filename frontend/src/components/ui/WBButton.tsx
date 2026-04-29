import type { ButtonHTMLAttributes } from 'react'

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: Kind
  size?: Size
  full?: boolean
}

const kindStyles: Record<Kind, string> = {
  primary: 'bg-accent-700 text-white hover:bg-accent-900',
  secondary: 'bg-surface text-ink-900 border border-line hover:bg-sunken',
  ghost: 'bg-transparent text-ink-700 hover:bg-sunken',
  danger: 'bg-alert-low-bg text-alert-low-fg hover:opacity-90',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-caption',
  md: 'h-10 px-4 text-[14px]',
  lg: 'h-12 px-5 text-[15px]',
}

export default function WBButton({
  kind = 'primary',
  size = 'md',
  full = false,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-pill font-medium
        tracking-wide transition-all duration-100 outline-none
        focus-visible:shadow-focus focus-visible:ring-2 focus-visible:ring-accent-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${kindStyles[kind]} ${sizeStyles[size]}
        ${full ? 'w-full' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  )
}

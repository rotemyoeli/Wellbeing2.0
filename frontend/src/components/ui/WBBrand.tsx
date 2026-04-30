interface Props {
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { logo: 28, text: 'text-[13px]' },
  md: { logo: 36, text: 'text-[15px]' },
  lg: { logo: 48, text: 'text-[18px]' },
}

export default function WBBrand({ size = 'md' }: Props) {
  const s = sizes[size]
  return (
    <div className="flex items-center gap-2.5">
      <img src="/mehva-logo.svg" alt="Mehva" style={{ height: s.logo }} className="w-auto" />
      <span className={`font-bold text-ink-900 tracking-tight ${s.text}`}>
        Wellbeing2.0
      </span>
    </div>
  )
}

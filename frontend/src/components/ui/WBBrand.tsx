import { t } from '../../lib/i18n'

interface Props {
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { logo: 18, text: 'text-micro' },
  md: { logo: 24, text: 'text-caption' },
  lg: { logo: 36, text: 'text-body' },
}

export default function WBBrand({ size = 'md' }: Props) {
  const s = sizes[size]
  return (
    <div className="flex items-center gap-2">
      {/* Mehva logo placeholder — accent circle */}
      <div
        className="rounded-full bg-accent-700 flex items-center justify-center"
        style={{ width: s.logo, height: s.logo }}
      >
        <span className="text-white font-bold" style={{ fontSize: s.logo * 0.45 }}>W</span>
      </div>
      <div className="w-px bg-line-bold self-stretch mx-1" />
      <span className={`font-semibold text-ink-900 ${s.text}`}>
        {t('productName')}
      </span>
    </div>
  )
}

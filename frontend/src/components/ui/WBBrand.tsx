import { t } from '../../lib/i18n'
import WBPulseLine from './WBPulseLine'
import WBPulseLogo from './WBPulseLogo'

interface Props {
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { logo: 16, text: 'text-micro', line: 40 },
  md: { logo: 22, text: 'text-caption', line: 60 },
  lg: { logo: 28, text: 'text-body', line: 80 },
}

export default function WBBrand({ size = 'md' }: Props) {
  const s = sizes[size]
  return (
    <div className="flex items-center gap-2">
      <WBPulseLogo size={s.logo} />
      <div className="flex flex-col">
        <span className={`font-semibold text-ink-900 ${s.text}`}>
          {t('productName')}
        </span>
        <WBPulseLine w={s.line} />
      </div>
    </div>
  )
}

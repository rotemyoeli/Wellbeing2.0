import { t } from '../../lib/i18n'

interface Props {
  anon: boolean
  onToggle: () => void
}

export default function WBAnonToggle({ anon, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={anon}
      className={`
        flex items-center gap-3 rounded-lg border-2 px-4 py-3 w-full
        transition-colors no-tap-highlight
        ${anon ? 'border-ink-900 bg-[var(--wb-anonymous-bg)]' : 'border-ink-200 bg-surface'}
      `}
    >
      {/* Toggle track */}
      <div className={`relative w-9 h-[22px] rounded-full transition-colors ${anon ? 'bg-accent-700' : 'bg-ink-300'}`}>
        <div
          className={`absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all ${
            anon ? 'inset-inline-start-[3px]' : 'inset-inline-end-[3px]'
          }`}
        />
      </div>
      <div className="flex flex-col items-start text-start">
        <span className={`text-caption font-semibold ${anon ? 'text-[var(--wb-anonymous-fg)]' : 'text-ink-900'}`}>
          {anon ? t('b1_anonymous') : t('b1_identified')}
        </span>
        <span className={`text-micro ${anon ? 'text-ink-400' : 'text-ink-500'}`}>
          {anon ? t('b1_toggleHelpOn') : t('b1_toggleHelpOff')}
        </span>
      </div>
      {/* Colored dot */}
      <div className="ms-auto">
        <div className={`w-2 h-2 rounded-full ${anon ? 'bg-accent-300' : 'bg-accent-700'}`} />
      </div>
    </button>
  )
}

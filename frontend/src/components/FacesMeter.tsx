/**
 * 5 Faces mood meter — Pulse v5 variant C (from checkin-pulse.jsx).
 * Color-coded moods: lavender→plum→neutral→teal spectrum.
 */
import { t } from '../lib/i18n'

interface Props {
  value: number
  onChange?: (v: number) => void
}

const FACES = [
  { energy: 10, mouth: 'sad', color: '#9676CC' },
  { energy: 30, mouth: 'meh', color: '#8866BB' },
  { energy: 50, mouth: 'neutral', color: '#7752BC' },
  { energy: 70, mouth: 'smile', color: '#55A89E' },
  { energy: 90, mouth: 'beam', color: '#3DB6A8' },
]

function FaceGlyph({ type, color, active }: { type: string; color: string; active: boolean }) {
  const stroke = active ? color : 'var(--wb-ink-400)'
  let mouth
  if (type === 'sad') mouth = <path d="M12 26 Q18 22, 24 26" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
  else if (type === 'meh') mouth = <line x1="12" y1="25" x2="24" y2="25" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
  else if (type === 'neutral') mouth = <line x1="13" y1="25" x2="23" y2="24" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
  else if (type === 'smile') mouth = <path d="M12 24 Q18 28, 24 24" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
  else mouth = <path d="M12 23 Q18 29, 24 23" stroke={stroke} strokeWidth="2.5" fill={active ? stroke : 'none'} strokeLinecap="round" />

  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" stroke={stroke} strokeWidth="2" fill={active ? `${color}18` : 'none'} />
      <circle cx="13" cy="15" r="2" fill={stroke} />
      <circle cx="23" cy="15" r="2" fill={stroke} />
      {mouth}
    </svg>
  )
}

export default function FacesMeter({ value, onChange }: Props) {
  const selectedIdx = FACES.reduce((best, f, i) =>
    Math.abs(f.energy - value) < Math.abs(FACES[best].energy - value) ? i : best, 0)

  return (
    <div className="flex flex-col gap-2.5 w-full max-w-sm" role="radiogroup" aria-label="Energy level">
      {FACES.map((f, i) => {
        const active = i === selectedIdx
        const feeling = t(`feeling_${i}` as string) || ''
        return (
          <button
            key={f.energy}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange?.(f.energy)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all
              ${active ? 'shadow-md' : ''}
            `}
            style={{
              borderColor: active ? f.color : 'var(--wb-line)',
              backgroundColor: active ? `${f.color}12` : 'var(--wb-surface)',
            }}
          >
            <FaceGlyph type={f.mouth} color={f.color} active={active} />
            <span className={`text-body font-medium ${active ? '' : 'text-ink-700'}`} style={active ? { color: f.color } : undefined}>
              {feeling}
            </span>
            {active && (
              <div className="ms-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: f.color }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * 5 Faces mood meter — qualitative variant (B1Alt4 from extra-screens.jsx).
 * Maps 5 faces to energy ranges: 0-20, 21-40, 41-60, 61-80, 81-100.
 */
import { getLang } from '../lib/i18n'

interface Props {
  value: number
  onChange?: (v: number) => void
}

const FACES = [
  { energy: 10, mouth: 'sad', labelEn: 'Exhausted', labelHe: 'תשושה לגמרי' },
  { energy: 30, mouth: 'meh', labelEn: 'Tired', labelHe: 'עייפות גוברת' },
  { energy: 50, mouth: 'neutral', labelEn: 'Okay', labelHe: 'בסדר' },
  { energy: 70, mouth: 'smile', labelEn: 'Energised', labelHe: 'עם כוחות' },
  { energy: 90, mouth: 'beam', labelEn: 'At my best', labelHe: 'במיטבי' },
]

function FaceGlyph({ type, active }: { type: string; active: boolean }) {
  const color = active ? 'var(--wb-accent-700)' : 'var(--wb-ink-400)'
  let mouth
  if (type === 'sad') mouth = <path d="M12 26 Q18 22, 24 26" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
  else if (type === 'meh') mouth = <line x1="12" y1="25" x2="24" y2="25" stroke={color} strokeWidth="2" strokeLinecap="round" />
  else if (type === 'neutral') mouth = <line x1="13" y1="25" x2="23" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round" />
  else if (type === 'smile') mouth = <path d="M12 24 Q18 28, 24 24" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
  else mouth = <path d="M12 23 Q18 29, 24 23" stroke={color} strokeWidth="2.5" fill={active ? color : 'none'} strokeLinecap="round" />

  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" stroke={color} strokeWidth="2" fill="none" />
      <circle cx="13" cy="15" r="2" fill={color} />
      <circle cx="23" cy="15" r="2" fill={color} />
      {mouth}
    </svg>
  )
}

export default function FacesMeter({ value, onChange }: Props) {
  const isHe = getLang() === 'he'
  // Find closest face index
  const selectedIdx = FACES.reduce((best, f, i) =>
    Math.abs(f.energy - value) < Math.abs(FACES[best].energy - value) ? i : best, 0)

  return (
    <div className="flex flex-col gap-2.5 w-full max-w-sm" role="radiogroup" aria-label="Energy level">
      {FACES.map((f, i) => {
        const active = i === selectedIdx
        return (
          <button
            key={f.energy}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange?.(f.energy)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all
              ${active ? 'border-accent-700 bg-accent-100' : 'border-line bg-surface'}
            `}
          >
            <FaceGlyph type={f.mouth} active={active} />
            <span className={`text-body font-medium ${active ? 'text-accent-700' : 'text-ink-700'}`}>
              {isHe ? f.labelHe : f.labelEn}
            </span>
            {active && (
              <div className="ms-auto w-5 h-5 rounded-full bg-accent-700 flex items-center justify-center">
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

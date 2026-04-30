import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

interface Props {
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { mehva: 24, org: 20, text: 'text-[13px]' },
  md: { mehva: 32, org: 26, text: 'text-[15px]' },
  lg: { mehva: 44, org: 36, text: 'text-[18px]' },
}

// Cache org logo across components (avoid refetching on every render)
let cachedOrgLogo: string | null | undefined = undefined

export default function WBBrand({ size = 'md' }: Props) {
  const s = sizes[size]
  const [orgLogo, setOrgLogo] = useState<string | null>(cachedOrgLogo ?? null)

  useEffect(() => {
    if (cachedOrgLogo !== undefined) return
    cachedOrgLogo = null
    api.adminGetOrg()
      .then(r => {
        const url = r.organization?.logo_url as string | undefined
        if (url) { cachedOrgLogo = url; setOrgLogo(url) }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="flex items-center gap-2">
      {/* Org logo (if set) */}
      {orgLogo && (
        <>
          <img src={orgLogo} alt="" style={{ height: s.org }} className="w-auto rounded-sm" />
          <span className="text-ink-200">|</span>
        </>
      )}
      {/* Mehva logo + product name */}
      <img src="/mehva-logo.svg" alt="Mehva" style={{ height: s.mehva }} className="w-auto" />
      <span className={`font-bold text-ink-900 tracking-tight ${s.text}`}>
        Wellbeing2.0
      </span>
    </div>
  )
}

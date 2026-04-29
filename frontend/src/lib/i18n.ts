/**
 * i18n — bilingual strings (HE/EN) loaded from design pack JSON files.
 * 193 strings per language. Hebrew is the production default.
 */

import heStrings from './strings.he.json'
import enStrings from './strings.en.json'

export type Lang = 'he' | 'en'

const catalogs: Record<Lang, Record<string, string>> = {
  he: heStrings as Record<string, string>,
  en: enStrings as Record<string, string>,
}

let currentLang: Lang = 'he'

export function setLang(lang: Lang) {
  currentLang = lang
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
  localStorage.setItem('wellbeing.lang', lang)
}

export function getLang(): Lang {
  return currentLang
}

export function t(key: string, replacements?: Record<string, string>): string {
  const catalog = catalogs[currentLang]
  let text = catalog[key] ?? catalogs.en[key] ?? key
  if (replacements) {
    for (const [k, v] of Object.entries(replacements)) {
      text = text.replace(`{${k}}`, v)
      text = text.replace(`{{${k}}}`, v) // support both {x} and {{x}}
    }
  }
  return text
}

export function isRtl(): boolean {
  return currentLang === 'he'
}

// Initialize on load
const saved = localStorage.getItem('wellbeing.lang') as Lang | null
setLang(saved || 'he')

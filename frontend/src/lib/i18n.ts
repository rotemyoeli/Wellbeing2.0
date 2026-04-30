/**
 * i18n — multilingual strings (HE/EN/AR) loaded from JSON files.
 * Hebrew is the production default. Arabic (RTL) added for hospital staff diversity.
 */

import heStrings from './strings.he.json'
import enStrings from './strings.en.json'
import arStrings from './strings.ar.json'

export type Lang = 'he' | 'en' | 'ar'

const catalogs: Record<Lang, Record<string, string>> = {
  he: heStrings as Record<string, string>,
  en: enStrings as Record<string, string>,
  ar: arStrings as Record<string, string>,
}

let currentLang: Lang = 'he'

export function setLang(lang: Lang) {
  currentLang = lang
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl'
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
      text = text.replace(`{{${k}}}`, v)
    }
  }
  return text
}

export function isRtl(): boolean {
  return currentLang !== 'en'
}

// Initialize on load
const saved = localStorage.getItem('wellbeing.lang') as Lang | null
setLang(saved || 'he')

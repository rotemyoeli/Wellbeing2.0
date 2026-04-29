/**
 * i18n — bilingual strings (HE/EN) from design pack tokens.jsx.
 * Hebrew is the production default per HANDOFF.md §0.
 */

export type Lang = 'he' | 'en'

const strings = {
  // Product
  productName: { en: 'Wellbeing', he: 'אכפת' },

  // Auth — A1
  a1_title: { en: 'Sign in', he: 'התחברות' },
  a1_subtitle: { en: 'We\'ll send a one-time code to your email', he: 'נשלח לך קוד חד-פעמי למייל' },
  a1_emailLabel: { en: 'Work email', he: 'מייל עבודה' },
  a1_emailPlaceholder: { en: 'name@hospital.org.il', he: 'name@hospital.org.il' },
  a1_send: { en: 'Send code', he: 'שלח קוד' },
  // Fix #4: privacy copy aligned to actual architecture — no client-side hashing claim
  a1_privacyReminder: {
    en: 'Your reports are never used for HR decisions, performance reviews, or pay. In anonymous mode, your identity is separated from your report on the server and cannot be recovered.',
    he: 'הדיווחים שלך לא משמשים להחלטות משאבי אנוש, הערכות ביצוע או שכר. במצב אנונימי, הזהות שלך מופרדת מהדיווח בשרת ולא ניתנת לשחזור.',
  },
  a1_errRate: { en: 'Too many attempts. Try again in a few minutes.', he: 'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות.' },
  a1_errEmail: { en: 'Please enter a valid email address.', he: 'אנא הזן כתובת מייל תקינה.' },
  a1_errNet: { en: 'Network error. Check your connection.', he: 'שגיאת רשת. בדוק את החיבור שלך.' },

  // Auth — A2
  a2_subtitle: { en: 'Enter the 6-digit code sent to', he: 'הזן את הקוד בן 6 הספרות שנשלח אל' },
  a2_codeLabel: { en: 'Verification code', he: 'קוד אימות' },
  a2_signIn: { en: 'Sign in', he: 'התחבר' },
  a2_useDifferent: { en: 'Use a different email', he: 'השתמש במייל אחר' },
  a2_resend: { en: 'Resend code', he: 'שלח קוד מחדש' },
  a2_errInvalid: { en: 'Invalid or expired code. Try again.', he: 'קוד לא תקין או פג תוקף. נסה שוב.' },
  a2_submitting: { en: 'Verifying…', he: 'מאמת…' },

  // Auth — A3
  a3_title: { en: 'Privacy Notice', he: 'מדיניות פרטיות' },
  a3_intro: { en: 'Before you begin, please review how we handle your data.', he: 'לפני שמתחילים, קרא כיצד אנחנו מטפלים במידע שלך.' },
  a3_what: { en: 'What we collect', he: 'מה אנחנו אוספים' },
  a3_whatBody: {
    en: 'Energy score (0–100), optional follow-up answers, and optional free-text comments. Timestamps are rounded to the minute.',
    he: 'ציון אנרגיה (0–100), תשובות מעקב אופציונליות, והערות טקסט חופשי. חותמות זמן מעוגלות לדקה.',
  },
  a3_use: { en: 'How we use it', he: 'כיצד אנחנו משתמשים' },
  a3_useBody: {
    en: 'Aggregated trends are shown to your ward manager so they can improve working conditions. Individual identified reports are visible only if you choose identified mode.',
    he: 'מגמות מצטברות מוצגות למנהל המחלקה כדי שיוכל לשפר את תנאי העבודה. דיווחים מזוהים נראים רק אם בחרת במצב מזוהה.',
  },
  a3_notUse: { en: 'What we never do', he: 'מה אנחנו לעולם לא עושים' },
  a3_notUseBody: {
    en: 'We never use your data for HR decisions, performance reviews, disciplinary action, or pay. We never sell or share individual data with third parties.',
    he: 'אנחנו לעולם לא משתמשים במידע שלך להחלטות משאבי אנוש, הערכות ביצוע, פעולות משמעת או שכר. אנחנו לעולם לא מוכרים או משתפים מידע אישי עם צדדים שלישיים.',
  },
  a3_anon: { en: 'Anonymity guarantee', he: 'ערובת אנונימיות' },
  // Fix #4: truthful anonymity description — server-side separation, not client-side hashing
  a3_anonBody: {
    en: 'In anonymous mode, the server uses a one-way hash to separate your identity from your report. Your user ID is never stored alongside anonymous reports. This separation is irreversible by design.',
    he: 'במצב אנונימי, השרת משתמש בפונקציית גיבוב חד-כיוונית כדי להפריד את הזהות שלך מהדיווח. מזהה המשתמש שלך לעולם לא נשמר לצד דיווחים אנונימיים. הפרדה זו בלתי הפיכה מעצם התכנון.',
  },
  a3_erasure: { en: 'Your right to erasure', he: 'זכותך למחיקה' },
  a3_erasureBody: {
    en: 'You can request deletion of all your identified data at any time. Anonymous data cannot be deleted because it cannot be linked back to you.',
    he: 'תוכל לבקש מחיקה של כל המידע המזוהה שלך בכל עת. מידע אנונימי לא ניתן למחיקה כי לא ניתן לקשר אותו אליך.',
  },
  a3_agree: { en: 'I agree', he: 'אני מסכים' },
  a3_decline: { en: 'I do not agree', he: 'אני לא מסכים' },
  a3_declined: { en: 'You must accept the privacy notice to use this service.', he: 'עליך לאשר את מדיניות הפרטיות כדי להשתמש בשירות.' },
  // Fix #6: consent checkboxes
  a3_check1: {
    en: 'I understand what data is collected and how it is used.',
    he: 'אני מבין אילו נתונים נאספים וכיצד הם משמשים.',
  },
  a3_check2: {
    en: 'I understand this data is never used for HR, pay, performance, or disciplinary decisions.',
    he: 'אני מבין שהנתונים לעולם לא משמשים להחלטות משאבי אנוש, שכר, ביצוע או משמעת.',
  },
  a3_check3: {
    en: 'I understand the difference between anonymous and identified reporting, and that anonymous data cannot be deleted.',
    he: 'אני מבין את ההבדל בין דיווח אנונימי למזוהה, ושמידע אנונימי לא ניתן למחיקה.',
  },

  // Employee — B1
  b1_title: { en: 'How are you, right now?', he: 'איך אתה מרגיש, עכשיו?' },
  b1_hint: { en: 'Drag or tap to set your energy level', he: 'גרור או לחץ כדי להגדיר את רמת האנרגיה שלך' },
  b1_identified: { en: 'Identified', he: 'מזוהה' },
  b1_anonymous: { en: 'Anonymous', he: 'אנונימי' },
  b1_toggleLabel: { en: 'Reporting mode', he: 'מצב דיווח' },
  b1_toggleHelpOn: { en: 'Your identity is hidden from your manager', he: 'הזהות שלך מוסתרת מהמנהל שלך' },
  b1_toggleHelpOff: { en: 'Your manager can see this is from you', he: 'המנהל שלך יכול לראות שזה ממך' },
  b1_submit: { en: 'Submit', he: 'שלח' },
  b1_submitting: { en: 'Sending…', he: 'שולח…' },

  // Employee — B2
  b2_thanks: { en: 'Thank you', he: 'תודה' },
  b2_body: { en: 'Your check-in has been recorded.', he: 'הצ\'ק-אין שלך נרשם.' },
  b2_time: { en: 'Submitted at', he: 'נשלח בשעה' },

  // Employee — B3
  b3_heading: { en: 'Two quick questions', he: 'שתי שאלות קצרות' },
  b3_q1: { en: 'Did you feel supported by your manager this week?', he: 'האם הרגשת תמיכה מהמנהל שלך השבוע?' },
  b3_q2: { en: 'Was your workload manageable today?', he: 'האם עומס העבודה היום היה סביר?' },
  b3_yes: { en: 'Yes', he: 'כן' },
  b3_no: { en: 'No', he: 'לא' },
  b3_skip: { en: 'Skip', he: 'דלג' },
  b3_done: { en: 'Done', he: 'סיום' },
  b3_skipAll: { en: 'Skip all', he: 'דלג על הכל' },

  // Employee — B4
  b4_heading: { en: 'Anything to add?', he: 'רוצה להוסיף משהו?' },
  b4_placeholder: { en: 'Optional. Up to 300 characters.', he: 'אופציונלי. עד 300 תווים.' },
  b4_counter: { en: 'of 300', he: 'מתוך 300' },
  b4_save: { en: 'Save and finish', he: 'שמור וסיים' },
  b4_skip: { en: 'Skip', he: 'דלג' },
  b4_anonCaveat: {
    en: 'You are in anonymous mode. If you describe a unique situation, your manager could still recognise you.',
    he: 'אתה במצב אנונימי. אם תתאר מצב ייחודי, המנהל שלך עדיין עלול לזהות אותך.',
  },

  // Employee — B5
  b5_greeting: { en: 'Good {{timeOfDay}}', he: '{{timeOfDay}} טוב' },
  b5_fromTeam: { en: 'From your team', he: 'מהצוות שלך' },
  b5_seePast: { en: 'See past updates', he: 'ראה עדכונים קודמים' },
  b5_emptyUpdates: { en: 'No team updates yet.', he: 'אין עדכוני צוות עדיין.' },
  b5_checkInCta: { en: 'Begin check-in', he: 'התחל צ\'ק-אין' },

  // Universal — F1-F3
  f1_netErr: { en: 'We can\'t reach our servers', he: 'אין אפשרות להגיע לשרתים' },
  f1_netErrSub: { en: 'Check your connection and try again.', he: 'בדוק את החיבור שלך ונסה שוב.' },
  f1_retry: { en: 'Retry', he: 'נסה שוב' },
  f2_authExpired: { en: 'Session timed out', he: 'הפגישה פגה' },
  f2_authExpiredSub: { en: 'For your privacy, sessions expire after a short period.', he: 'לשמירה על פרטיותך, הפגישות פגות לאחר זמן קצר.' },
  f2_signInAgain: { en: 'Sign in again', he: 'התחבר שוב' },
  f3_notFound: { en: 'Page not found', he: 'הדף לא נמצא' },
  f3_notFoundSub: { en: 'The page you\'re looking for doesn\'t exist.', he: 'הדף שאתה מחפש לא קיים.' },
  f3_home: { en: 'Back to home', he: 'חזרה לדף הבית' },
  // Fix #5: no offline queue exists — do not claim check-in is saved
  offline: { en: 'You\'re offline. Please reconnect to submit your check-in.', he: 'אתה לא מחובר. התחבר מחדש כדי לשלוח את הצ\'ק-אין שלך.' },

  // Manager — C1
  c1_title: { en: 'Ward Dashboard', he: 'לוח בקרה מחלקתי' },
  c1_openAlerts: { en: 'Open alerts', he: 'התראות פתוחות' },
  c1_emptyAlerts: { en: 'No open alerts', he: 'אין התראות פתוחות' },
  c1_kpiAvgEnergy: { en: 'Avg energy', he: 'אנרגיה ממוצעת' },
  c1_kpiReportingRate: { en: 'Reporting rate', he: 'שיעור דיווח' },
  c1_kpiCheckIns: { en: 'Check-ins', he: 'צ\'ק-אינים' },
  c1_kpiPublishRate: { en: 'Closure publish rate', he: 'שיעור פרסום סגירות' },
  c1_byRole: { en: 'By role', he: 'לפי תפקיד' },
  c1_belowThreshold: { en: 'Below threshold', he: 'מתחת לסף' },
  c1_thresholdFootnote: { en: 'Roles with fewer than {{n}} reports do not show averages to protect individual privacy.', he: 'תפקידים עם פחות מ-{{n}} דיווחים לא מציגים ממוצעים כדי להגן על פרטיות אישית.' },
  c1_dailyTrend: { en: 'Daily trend', he: 'מגמה יומית' },
  c1_emptyDashboard: { en: 'No check-ins yet for this period.', he: 'אין צ\'ק-אינים עדיין לתקופה זו.' },

  // Manager — C2
  c2_typeLow: { en: 'Low energy', he: 'אנרגיה נמוכה' },
  c2_typeHigh: { en: 'High energy', he: 'אנרגיה גבוהה' },
  c2_anonHeader: { en: 'Anonymous {{type}} alert', he: 'התראת {{type}} אנונימית' },
  c2_statusOpen: { en: 'Open', he: 'פתוח' },
  c2_statusSeen: { en: 'Seen', he: 'נצפה' },
  c2_statusContacted: { en: 'Contacted', he: 'יצרו קשר' },
  c2_statusClosed: { en: 'Closed', he: 'סגור' },
  c2_actionMarkSeen: { en: 'Mark seen', he: 'סמן כנצפה' },
  c2_actionMarkContacted: { en: 'Mark contacted', he: 'סמן כיצרו קשר' },
  c2_actionClose: { en: 'Close alert', he: 'סגור התראה' },
  c2_closureLabel: { en: 'Corrective action', he: 'פעולה מתקנת' },
  c2_closureHint: { en: 'Describe what was done or will be done.', he: 'תאר מה נעשה או מה ייעשה.' },
  c2_publishCheckbox: { en: 'Publish as team update', he: 'פרסם כעדכון צוות' },
  c2_confirmClose: { en: 'Close and save', he: 'סגור ושמור' },
  c2_cancel: { en: 'Cancel', he: 'ביטול' },

  // Manager — C7
  c7_title: { en: 'Team Update', he: 'עדכון צוות' },
  c7_hint: { en: 'Tell your team what was done. This appears in their home feed.', he: 'ספר לצוות שלך מה נעשה. זה מופיע בעדכונים שלהם.' },
  c7_placeholder: { en: 'We heard your feedback and…', he: 'שמענו את המשוב שלכם ו…' },
  c7_counter: { en: '/ 500', he: '/ 500' },
  c7_publish: { en: 'Publish to team', he: 'פרסם לצוות' },

  // Manager — C8
  c8_title: { en: 'Review closures', he: 'סקירת סגירות' },
  c8_subtitle: { en: 'Closed alerts from the last 14 days', he: 'התראות שנסגרו ב-14 הימים האחרונים' },
  c8_unpublished: { en: 'Unpublished', he: 'לא פורסם' },
  c8_published: { en: 'Published', he: 'פורסם' },
  c8_publish: { en: 'Publish update', he: 'פרסם עדכון' },

  // Roles
  role_nurse: { en: 'Nurse', he: 'אחות' },
  role_doctor: { en: 'Doctor', he: 'רופא' },
  role_paramedic: { en: 'Paramedic', he: 'פרמדיק' },
  role_support: { en: 'Support', he: 'תמיכה' },
  role_anon: { en: 'Anonymous', he: 'אנונימי' },
  role_employee: { en: 'Employee', he: 'עובד' },
  role_manager: { en: 'Manager', he: 'מנהל' },
  role_social_worker: { en: 'Social worker', he: 'עובד סוציאלי' },
  role_admin: { en: 'Admin', he: 'מנהל מערכת' },

  // Check-in variants
  variant_label: { en: 'Check-in metaphor', he: 'מטאפורת דיווח' },
  variant_a: { en: 'Battery', he: 'סוללה' },
  variant_b: { en: 'Orb', he: 'כדור' },
  variant_c: { en: '5 Faces', he: '5 פנים' },

  // UI
  signOut: { en: 'Sign out', he: 'התנתק' },
  devMode: { en: 'DEV MODE', he: 'מצב פיתוח' },
} as const

export type StringKey = keyof typeof strings

let currentLang: Lang = 'he'

export function setLang(lang: Lang) {
  currentLang = lang
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
}

export function getLang(): Lang {
  return currentLang
}

export function t(key: StringKey, replacements?: Record<string, string>): string {
  const entry = strings[key]
  if (!entry) return key
  let text: string = entry[currentLang] || entry.en
  if (replacements) {
    for (const [k, v] of Object.entries(replacements)) {
      text = text.replace(`{{${k}}}`, v)
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

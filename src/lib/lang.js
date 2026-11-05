import moment from 'moment-timezone'
import { ref } from 'vue'

// Moment locales matching src/locales/ (English is built-in).
import 'moment/locale/da'
import 'moment/locale/de'
import 'moment/locale/es'
import 'moment/locale/fa'
import 'moment/locale/fr'
import 'moment/locale/hu'
import 'moment/locale/it'
import 'moment/locale/ja'
import 'moment/locale/ko'
import 'moment/locale/nl'
import 'moment/locale/pl'
import 'moment/locale/pt'
import 'moment/locale/ru'
import 'moment/locale/zh-cn'
import 'moment/locale/zh-tw'

import { applyLocale } from '@/lib/i18n'

// The dates sent to the API are formatted with moment, and Zou rejects the
// Persian digits of the fa locale: print Latin ones (Persian ones still parse).
moment.updateLocale('fa', { postformat: string => string })

// Importing or updating a locale activates it; default back to English.
moment.locale('en')

const LOCALE_MAP = {
  zh_Hans_CN: { language: 'zh', code: 'zh-cn' },
  zh_Hant_TW: { language: 'zh_tw', code: 'zh-tw' }
}

// Reactive, Intl-safe formatting code for the active language ('en', 'zh-tw', …).
export const localeCode = ref('en')

/**
 * Language and moment code of a user locale ('fr_FR', 'zh_Hant_TW', …).
 * @param {string} locale
 */
const resolveLocaleCodes = locale => {
  const fallback = locale?.substring(0, 2) || 'en'
  return LOCALE_MAP[locale] || { language: fallback, code: fallback }
}

export const languageOf = locale => resolveLocaleCodes(locale).language

export default {
  /**
   * Set the locale for the application (vue-i18n + moment.js). Translation
   * chunks load on demand, so the vue-i18n locale flips once the messages
   * are registered; the returned promise resolves at that point. The
   * vocabulary of the open production style stays.
   * @param {string} locale
   */
  setLocale(locale) {
    const { language, code } = resolveLocaleCodes(locale)

    moment.locale(code)
    localeCode.value = code

    return applyLocale(language)
  }
}

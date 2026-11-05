import { createI18n } from 'vue-i18n'

import locales, { localeLoaders, variantLoaders } from '@/locales'

// vue-i18n 11 makes any decimal count plural, whatever the language. Its
// language decides here: "0.5 days", but "0,5 jour" and "1,5 jour". Intl
// rejects keys such as en_nft or zh_tw, so it gets the part before the "_".
const decimalPluralRule = locale => {
  const rules = new Intl.PluralRules(locale.split('_')[0])
  return (choice, choicesLength, defaultRule) => {
    if (choicesLength !== 2 || Number.isInteger(choice)) {
      return defaultRule(choice, choicesLength)
    }
    return rules.select(Math.abs(choice)) === 'one' ? 0 : 1
  }
}

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: locales,
  pluralRules: Object.fromEntries(
    [
      ...Object.keys(locales),
      ...Object.keys(localeLoaders),
      ...Object.keys(variantLoaders)
    ].map(locale => [locale, decimalPluralRule(locale)])
  ),
  warnHtmlMessage: false
})

const loadedLocales = new Set(Object.keys(locales))

// Raw messages of the translated languages: an overlay is merged on top of
// them.
const baseMessages = new Map()

const mergeMessages = (base, overlay) =>
  Object.entries(overlay).reduce(
    (merged, [key, value]) => ({
      ...merged,
      [key]:
        value && typeof value === 'object'
          ? mergeMessages(base[key] ?? {}, value)
          : value
    }),
    base
  )

/**
 * Load a locale chunk on demand and register its messages. Resolves
 * immediately when the locale is already available (the English variants
 * ship with the main bundle). A variant such as ja_2d loads its language
 * first, then registers the language with the overlay merged on top.
 */
export const loadLocaleMessages = async locale => {
  if (loadedLocales.has(locale)) return
  const variant = variantLoaders[locale]
  if (variant) {
    await loadLocaleMessages(variant.base)
    // The locale JSON files nest their messages under a "default" key.
    const overlay = (await variant.load()).default.default
    i18n.global.setLocaleMessage(
      locale,
      mergeMessages(baseMessages.get(variant.base), overlay)
    )
  } else if (localeLoaders[locale]) {
    const messages = (await localeLoaders[locale]()).default.default
    baseMessages.set(locale, messages)
    i18n.global.setLocaleMessage(locale, messages)
  } else {
    return
  }
  loadedLocales.add(locale)
}

// Production styles whose Japanese reads the vocabulary of 2D animation. A
// production with no style is a 2d3d one, the default.
const JAPANESE_2D_STYLES = ['2d', '2dpaper', '2d3d']
const ENGLISH_OVERLAY_STYLES = ['nft', 'video-game']

/**
 * Locale to read for a language and the style of the open production.
 */
export const resolveLocale = (language, style) => {
  if (language === 'en' && ENGLISH_OVERLAY_STYLES.includes(style)) {
    return `en_${style}`
  }
  if (language === 'ja' && (!style || JAPANESE_2D_STYLES.includes(style))) {
    return 'ja_2d'
  }
  return language
}

let currentStyle = null
let pendingLocale = null

const switchLocale = locale => {
  // The English overlays are partial: a key they leave out is not a miss.
  i18n.global.fallbackWarn = !ENGLISH_OVERLAY_STYLES.some(
    style => locale === `en_${style}`
  )
  i18n.global.locale.value = locale
}

/**
 * Read a language with the vocabulary of the production style, and remember
 * the style so that a later language switch keeps it. The locale flips once
 * its messages are registered, at once when they already are; the returned
 * promise resolves at that point.
 * @param {string} language
 * @param {string} [style] defaults to the style of the last call
 */
export const applyLocale = (language, style = currentStyle) => {
  currentStyle = style
  const locale = resolveLocale(language, style)
  // Guards against an older locale chunk landing after a newer switch and
  // flipping the UI back.
  pendingLocale = locale
  if (loadedLocales.has(locale)) {
    switchLocale(locale)
    return Promise.resolve()
  }
  return loadLocaleMessages(locale).then(() => {
    if (pendingLocale === locale) switchLocale(locale)
  })
}

/*
 * Enable HMR for locales
 */
if (import.meta.hot) {
  import.meta.hot.accept('@/locales', mod => {
    const updatedMessages = mod.default
    for (const locale of Object.keys(updatedMessages)) {
      i18n.global.setLocaleMessage(locale, updatedMessages[locale])
    }
  })
}

export default i18n

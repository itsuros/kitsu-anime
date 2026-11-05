// @vitest-environment node

import moment from 'moment-timezone'
import lang, { languageOf, localeCode } from '@/lib/lang'
import timezone from '@/lib/timezone'

import i18n, { applyLocale } from '@/lib/i18n'
import store from '@/store'

class ColorHash {
  constructor () {
  }

  hex (str) {
    return str
  }
}

globalThis.ColorHash = ColorHash

describe('lang', () => {
  store.commit('USER_LOGIN', {
    id: 'user-1',
    locale: 'fr_FR',
    timezone: 'Europe/Paris'
  })
  test('setLocale', async () => {
    await lang.setLocale('french')
    expect(moment.locale()).toEqual('fr')
    expect(i18n.global.locale.value).toEqual('fr')
    // The lazily loaded chunk registered actual French messages.
    expect(i18n.global.t('main.cancel', {}, { locale: 'fr' })).toEqual('Annuler')
  })

  test('setLocale keeps the last requested language on rapid switches', async () => {
    const first = lang.setLocale('fr_FR')
    const second = lang.setLocale('de_DE')
    await Promise.all([first, second])
    expect(i18n.global.locale.value).toEqual('de')
  })

  // The Japanese of a 2D production reads the overlay, and a language switch
  // keeps the style of the production that is open.
  test('setLocale reads the Japanese 2D vocabulary by default', async () => {
    await applyLocale('en', null)
    await lang.setLocale('ja_JP')
    expect(i18n.global.locale.value).toEqual('ja_2d')
    expect(i18n.global.t('shots.title')).toEqual('カット')
  })

  test('setLocale keeps the style of the open production', async () => {
    await applyLocale('en', '3d')
    await lang.setLocale('ja_JP')
    expect(i18n.global.locale.value).toEqual('ja')
    expect(i18n.global.t('shots.title')).toEqual('ショット')

    await applyLocale('ja', '2d')
    await lang.setLocale('en_US')
    await lang.setLocale('ja_JP')
    expect(i18n.global.locale.value).toEqual('ja_2d')
    await applyLocale('en', null)
  })

  test('languageOf maps the locale of the user to a language', () => {
    expect(languageOf('ja_JP')).toEqual('ja')
    expect(languageOf('zh_Hant_TW')).toEqual('zh_tw')
    expect(languageOf('zh_Hans_CN')).toEqual('zh')
    expect(languageOf(undefined)).toEqual('en')
  })

  test('localeCode tracks the active language with an Intl-safe code', () => {
    lang.setLocale('en_US')
    expect(localeCode.value).toEqual('en')

    // Mapped locale keeps its region (Traditional Chinese).
    lang.setLocale('zh_Hant_TW')
    expect(localeCode.value).toEqual('zh-tw')

    lang.setLocale('fr_FR')
    expect(localeCode.value).toEqual('fr')
  })

  // Dates formatted with moment go to the API, which rejects Persian digits.
  test('setLocale keeps Latin digits in Persian dates', async () => {
    await lang.setLocale('fa_IR')
    const date = moment.utc('2026-08-05T09:30:00')
    expect(moment.locale()).toEqual('fa')
    expect(date.format('YYYY-MM-DD')).toEqual('2026-08-05')
    expect(date.format('D MMMM YYYY HH:mm')).toEqual('5 اوت 2026 09:30')
    const parsed = moment.utc('۲۰۲۶-۰۸-۰۵', 'YYYY-MM-DD')
    expect(parsed.format('YYYY-MM-DD')).toEqual('2026-08-05')
    await lang.setLocale('en_US')
  })
})

describe('timezone', () => {
  test('setTimezone', () => {
    expect(moment().tz()).toBeUndefined()
    timezone.setTimezone()
    expect(moment().tz()).toEqual('Europe/Paris')
  })
})

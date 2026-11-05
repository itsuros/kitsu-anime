import i18n, {
  applyLocale,
  loadLocaleMessages,
  resolveLocale
} from '@/lib/i18n'

import { mountWithI18n } from '../fixtures/i18n'

describe('lib/i18n', () => {
  test('$t stays available in templates', () => {
    const wrapper = mountWithI18n({ template: "<p>{{ $t('main.unknown') }}</p>" })
    expect(wrapper.text()).toBe('Unknown')
    wrapper.unmount()
  })

  // vue-i18n 11 makes any decimal count plural, whatever the language: half a
  // day spent read "jours passés".
  describe('plurals', () => {
    afterEach(() => {
      i18n.global.locale.value = 'en'
    })

    test.each([
      [0, 'days spent'],
      [0.5, 'days spent'],
      [1, 'day spent'],
      [1.5, 'days spent'],
      [2, 'days spent']
    ])('reads a count of %s in English', (count, expected) => {
      expect(i18n.global.t('main.days_spent', { count })).toBe(expected)
    })

    test.each([
      [0, 'jours passés'],
      [0.5, 'jour passé'],
      [1, 'jour passé'],
      [1.5, 'jour passé'],
      [2, 'jours passés']
    ])(
      'reads a count of %s in French, a locale loaded later',
      async (count, expected) => {
        await loadLocaleMessages('fr')
        i18n.global.locale.value = 'fr'

        expect(i18n.global.t('main.days_spent', { count })).toBe(expected)
      }
    )

    test('reads a decimal count in English for an NFT production', () => {
      expect(
        i18n.global.t('shots.number', { count: 0.5 }, { locale: 'en_nft' })
      ).toBe('NFTs')
    })
  })

  // The vocabulary follows the language of the user and the style of the
  // production: English has NFT and video-game overlays, Japanese a 2D one.
  describe('locale variants', () => {
    afterEach(async () => {
      await applyLocale('en', null)
    })

    test.each([
      ['en', 'nft', 'en_nft'],
      ['en', 'video-game', 'en_video-game'],
      ['en', '2d', 'en'],
      ['en', null, 'en'],
      ['ja', '2d', 'ja_2d'],
      ['ja', '2dpaper', 'ja_2d'],
      ['ja', '2d3d', 'ja_2d'],
      ['ja', undefined, 'ja_2d'],
      ['ja', null, 'ja_2d'],
      ['ja', '3d', 'ja'],
      ['ja', 'vfx', 'ja'],
      ['ja', 'nft', 'ja'],
      ['fr', 'nft', 'fr'],
      ['fr', '2d', 'fr']
    ])('reads %s with the style %s as %s', (language, style, expected) => {
      expect(resolveLocale(language, style)).toBe(expected)
    })

    test('merges the Japanese 2D overlay on top of the Japanese messages', async () => {
      await loadLocaleMessages('ja_2d')

      const t = key => i18n.global.t(key, {}, { locale: 'ja_2d' })
      expect(t('shots.title')).toBe('カット')
      expect(t('breakdown.title')).toBe('香盤表')
      // A key the overlay leaves alone still reads the Japanese translation.
      expect(t('assets.title')).toBe('アセット')
      expect(t('main.cancel')).toBe(
        i18n.global.t('main.cancel', {}, { locale: 'ja' })
      )
    })

    test('keeps the base Japanese untouched by the overlay', async () => {
      await loadLocaleMessages('ja_2d')

      expect(i18n.global.t('shots.title', {}, { locale: 'ja' })).toBe('ショット')
    })

    test('switches the locale with the style of the production', async () => {
      await applyLocale('ja', '2d3d')
      expect(i18n.global.locale.value).toBe('ja_2d')

      await applyLocale('ja', '3d')
      expect(i18n.global.locale.value).toBe('ja')
    })

    test('warns about missing keys only outside the English overlays', async () => {
      await applyLocale('en', 'nft')
      expect(i18n.global.fallbackWarn).toBe(false)

      await applyLocale('ja', '2d')
      expect(i18n.global.fallbackWarn).toBe(true)
    })

    test('keeps the last requested locale on rapid switches', async () => {
      const first = applyLocale('ja', '2d')
      const second = applyLocale('fr', '2d')
      await Promise.all([first, second])

      expect(i18n.global.locale.value).toBe('fr')
    })

    test('reads a decimal count of the Japanese 2D overlay', async () => {
      await loadLocaleMessages('ja_2d')

      expect(
        i18n.global.t('shots.number', { count: 0.5 }, { locale: 'ja_2d' })
      ).toBe('カット')
    })
  })
})

// @vitest-environment node

import { beforeAll, describe, expect, it } from 'vitest'

import en from '@/locales/en'
import { localeLoaders, variantLoaders } from '@/locales'

// ja_2d is a partial overlay merged on top of ja.json for 2D productions: it
// swaps the CG vocabulary of the base translation for the one of Japanese
// animation studios.
const flatten = (messages, prefix = '') =>
  Object.entries(messages).flatMap(([key, value]) =>
    value && typeof value === 'object'
      ? flatten(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value]]
  )

// Terms of the base translation the overlay replaces. A term stays when it is
// the tail of a longer katakana word, such as スナップショット (snapshot).
const REPLACED_TERMS = [
  'ブレイクダウン',
  'タスクタイプ',
  'シーケンス',
  'エピソード',
  'ショット',
  'エディット',
  'プロダクション'
]
const COMPOUND_WORDS = ['スナップショット']

const placeholders = value => (value.match(/\{\w+\}/g) ?? []).sort()
const pluralSegments = value => value.split('|').length

let base
let overlay
let enMessages

describe('ja_2d overlay', () => {
  beforeAll(async () => {
    base = new Map(
      flatten((await localeLoaders.ja()).default.default)
    )
    overlay = new Map(
      flatten((await variantLoaders.ja_2d.load()).default.default)
    )
    enMessages = new Map(flatten(en))
  })

  it('is merged on top of the Japanese translation', () => {
    expect(variantLoaders.ja_2d.base).toBe('ja')
  })

  it('overrides only keys that en.js has', () => {
    expect([...overlay.keys()].filter(key => !enMessages.has(key))).toEqual([])
  })

  it('never copies a value identical to the base', () => {
    expect([...overlay].filter(([key, value]) => base.get(key) === value)).toEqual(
      []
    )
  })

  it('keeps the plural segments of the base', () => {
    expect(
      [...overlay]
        .filter(
          ([key, value]) =>
            typeof value === 'string' &&
            pluralSegments(value) !== pluralSegments(base.get(key))
        )
        .map(([key]) => key)
    ).toEqual([])
  })

  it('keeps the placeholders of the base', () => {
    expect(
      [...overlay]
        .filter(
          ([key, value]) =>
            typeof value === 'string' &&
            placeholders(value).join() !== placeholders(base.get(key)).join()
        )
        .map(([key]) => key)
    ).toEqual([])
  })

  // Catches the key a new upstream sync adds to ja.json with the CG wording.
  it('leaves no CG term of the base without an override', () => {
    const withoutCompounds = value =>
      COMPOUND_WORDS.reduce((text, word) => text.replaceAll(word, ''), value)
    const merged = key => overlay.get(key) ?? base.get(key)
    const leftovers = [...base.keys()]
      .filter(key => typeof merged(key) === 'string')
      .filter(key =>
        REPLACED_TERMS.some(term => withoutCompounds(merged(key)).includes(term))
      )
    expect(leftovers).toEqual([])
  })

  it('names the entities as Japanese animation studios do', () => {
    const merged = key => overlay.get(key) ?? base.get(key)
    expect({
      shots: merged('shots.title'),
      episodes: merged('episodes.title'),
      sequences: merged('sequences.title'),
      edits: merged('edits.title'),
      breakdown: merged('breakdown.title'),
      productions: merged('productions.title')
    }).toEqual({
      shots: 'カット',
      episodes: '話数',
      sequences: 'シーン',
      edits: '編集',
      breakdown: '香盤表',
      productions: '作品'
    })
  })

  it('leaves the terms kept as they are', () => {
    const merged = key => overlay.get(key) ?? base.get(key)
    expect(merged('assets.title')).toBe(base.get('assets.title'))
    expect(merged('assets.title')).toBe('アセット')
  })
})

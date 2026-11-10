import { describe, expect, it } from 'vitest'
import { isSelectedZipkiwiBrand } from '../zipkiwiBrand'

describe('isSelectedZipkiwiBrand', () => {
  it('uses the selected brand for Zipkiwi defaults', () => {
    expect(isSelectedZipkiwiBrand('Zipkiwi', '')).toBe(true)
    expect(isSelectedZipkiwiBrand('zipkiwi', '/zipkiwi-bird-blue.svg')).toBe(true)
    expect(isSelectedZipkiwiBrand('迅奇', '/zipkiwi-bird-blue.svg')).toBe(true)
    expect(isSelectedZipkiwiBrand('迅奇（ZipKiwi）', '/zipkiwi-bird-blue.svg')).toBe(true)
    for (const logo of ['/zipkiwi-icon.svg', '/zipkiwi-icon.png', '/zipkiwi-bird-blue.png', '/zipkiwi-symbol-primary.svg', '/zipkiwi-symbol-white.svg']) {
      expect(isSelectedZipkiwiBrand('迅奇Zipkiwi', logo)).toBe(true)
    }
  })

  it('preserves explicitly configured logos and other site names', () => {
    expect(isSelectedZipkiwiBrand('Zipkiwi', '/custom.svg')).toBe(false)
    expect(isSelectedZipkiwiBrand('迅奇', '/custom.svg')).toBe(false)
    expect(isSelectedZipkiwiBrand('迅奇（ZipKiwi）', '/custom.svg')).toBe(false)
    expect(isSelectedZipkiwiBrand('Other site', '')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { isSelectedZipkiwiBrand } from '../zipkiwiBrand'

describe('isSelectedZipkiwiBrand', () => {
  it('uses the selected brand for Zipkiwi defaults', () => {
    expect(isSelectedZipkiwiBrand('Zipkiwi', '')).toBe(true)
    expect(isSelectedZipkiwiBrand('zipkiwi', '/zipkiwi-bird-blue.svg')).toBe(true)
    expect(isSelectedZipkiwiBrand('迅奇', '/zipkiwi-bird-blue.svg')).toBe(true)
    expect(isSelectedZipkiwiBrand('迅奇（ZipKiwi）', '/zipkiwi-bird-blue.svg')).toBe(true)
  })

  it('preserves explicitly configured logos and other site names', () => {
    expect(isSelectedZipkiwiBrand('Zipkiwi', '/custom.svg')).toBe(false)
    expect(isSelectedZipkiwiBrand('迅奇', '/custom.svg')).toBe(false)
    expect(isSelectedZipkiwiBrand('迅奇（ZipKiwi）', '/custom.svg')).toBe(false)
    expect(isSelectedZipkiwiBrand('Other site', '')).toBe(false)
  })
})

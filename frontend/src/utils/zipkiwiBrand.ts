export function isSelectedZipkiwiBrand(siteName: string, siteLogo: string): boolean {
  return ['zipkiwi', '迅奇', '迅奇（zipkiwi）', '迅奇zipkiwi'].includes(siteName.trim().toLowerCase()) &&
    (!siteLogo || ['/zipkiwi-bird-blue.svg', '/zipkiwi-bird-blue.png', '/zipkiwi-icon.svg', '/zipkiwi-icon.png', '/zipkiwi-symbol-primary.svg', '/zipkiwi-symbol-white.svg'].includes(siteLogo))
}

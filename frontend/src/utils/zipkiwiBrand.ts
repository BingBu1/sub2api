export function isSelectedZipkiwiBrand(siteName: string, siteLogo: string): boolean {
  return ['zipkiwi', '迅奇', '迅奇（zipkiwi）'].includes(siteName.trim().toLowerCase()) &&
    (!siteLogo || siteLogo === '/zipkiwi-bird-blue.svg')
}

export function isSelectedZipkiwiBrand(siteName: string, siteLogo: string): boolean {
  return siteName.trim().toLowerCase() === 'zipkiwi' &&
    (!siteLogo || siteLogo === '/zipkiwi-bird-blue.svg')
}

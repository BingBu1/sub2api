import { inject, type InjectionKey, type Ref } from 'vue'

export interface PublicSiteContext {
  isDark: Ref<boolean>
  toggleTheme: () => void
  openContact: () => void
}

export const publicSiteKey: InjectionKey<PublicSiteContext> = Symbol('public-site')

export function usePublicSite() {
  const site = inject(publicSiteKey)
  if (!site) throw new Error('Public pages must render inside PublicSiteLayout')
  return site
}

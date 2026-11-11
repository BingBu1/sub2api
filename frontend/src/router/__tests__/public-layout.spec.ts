import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { createI18n } from 'vue-i18n'
import { reactive } from 'vue'
import applicationRouter from '..'
import PublicHeader from '@/components/layout/PublicHeader.vue'
import { getModelPlaza } from '@/api/modelPlaza'
import { getPublicTelemetry } from '@/api/publicTelemetry'
import zh from '@/i18n/locales/zh'

const { appState, authState } = vi.hoisted(() => ({
  appState: {
    siteName: 'ZipKiwi', siteLogo: '', apiBaseUrl: '', contactInfo: '', publicSettingsLoaded: true,
    cachedPublicSettings: { site_name: 'ZipKiwi', model_plaza_enabled: true, home_content: '', compact_home_enabled: false },
    fetchPublicSettings: vi.fn()
  },
  authState: { isAuthenticated: false, isAdmin: false, checkAuth: vi.fn() }
}))
vi.mock('@/stores/app', async () => {
  const { reactive } = await import('vue')
  return { useAppStore: () => reactive(appState) }
})
vi.mock('@/stores/auth', async () => {
  const { reactive } = await import('vue')
  return { useAuthStore: () => reactive(authState) }
})
vi.mock('@/api/modelPlaza', () => ({ getModelPlaza: vi.fn() }))
vi.mock('@/api/publicTelemetry', () => ({ getPublicTelemetry: vi.fn() }))

const mounted: ReturnType<typeof mount>[] = []
async function render(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: applicationRouter.options.routes })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(RouterView, {
    attachTo: document.body,
    global: {
      plugins: [router, createI18n({ legacy: false, locale: 'zh', messages: { zh } })],
      stubs: { LocaleSwitcher: true, AppLayout: { template: '<div data-testid="app-layout"><slot /></div>' } }
    }
  })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}
beforeEach(() => {
  vi.mocked(getModelPlaza).mockResolvedValue({ description: '', groups: [] })
  vi.mocked(getPublicTelemetry).mockRejectedValue(new Error('offline'))
  appState.cachedPublicSettings.home_content = ''
  appState.cachedPublicSettings.compact_home_enabled = false
  authState.isAuthenticated = false
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList)
})
afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  document.documentElement.classList.remove('dark')
})

describe('shared public route layout', () => {
  it('takes Core features to the hero from other pages and scrolls home to the top', async () => {
    const { wrapper, router } = await render('/tutorials')
    const navigation = new Promise<void>(resolve => {
      const stop = router.afterEach(() => { stop(); resolve() })
    })
    await wrapper.get('#main-navigation a[href="/home#hero"]').trigger('click')
    await navigation
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/home')
    expect(router.currentRoute.value.hash).toBe('#hero')
    expect(wrapper.get('#hero').classes()).toContain('hero')
    await wrapper.get('#main-navigation a[href="#hero"]').trigger('click')
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('keeps the same header and theme while routing between home, plaza and article deep links', async () => {
    const { wrapper, router } = await render('/home')
    const header = wrapper.getComponent(PublicHeader).vm.$.uid
    const headerElement = wrapper.get('.public-header').element
    const menu = wrapper.get('.public-menu-toggle')
    await wrapper.get('.public-theme-toggle').trigger('click')
    expect(wrapper.get('[data-testid="gateway-landing"]').classes()).toContain('is-dark')
    await menu.trigger('click')
    await router.push('/model-plaza')
    await flushPromises()
    expect(wrapper.getComponent(PublicHeader).vm.$.uid).toBe(header)
    expect(wrapper.get('.public-header').element).toBe(headerElement)
    expect(wrapper.findAll('.public-header')).toHaveLength(1)
    expect(menu.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe('模型广场')
    expect(wrapper.get('.public-lockup').attributes('src')).toBe('/zipkiwi-lockup-white.svg')
    await router.push('/tutorials?guide=codex#configure')
    await flushPromises()
    expect(wrapper.getComponent(PublicHeader).vm.$.uid).toBe(header)
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe('教程文档')
    expect(router.currentRoute.value.query.guide).toBe('codex')
    expect(router.currentRoute.value.hash).toBe('#configure')
    expect(wrapper.get('.docs-article h1').text()).toContain('Codex')
    await wrapper.get('.public-theme-toggle').trigger('click')
    await router.push('/home#integration')
    await flushPromises()
    expect(wrapper.getComponent(PublicHeader).vm.$.uid).toBe(header)
    expect(wrapper.get('[data-testid="gateway-landing"]').classes()).not.toContain('is-dark')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
    expect(wrapper.get('a[href="#integration"]').exists()).toBe(true)
  })

  it('preserves root redirects, route names and public metadata under one parent', async () => {
    const { router } = await render('/')
    expect(router.currentRoute.value.name).toBe('Home')
    const parent = router.resolve('/home').matched[0]
    for (const [path, name] of [['/home', 'Home'], ['/model-plaza', 'ModelPlaza'], ['/tutorials', 'Tutorials']] as const) {
      const route = router.resolve(path)
      expect(route.name).toBe(name)
      expect(route.meta.requiresAuth).toBe(false)
      expect(route.matched).toHaveLength(2)
      expect(route.matched[0]).toBe(parent)
    }
  })

  it('keeps the authenticated embedded plaza in the console and falls back to public navigation for guests', async () => {
    authState.isAuthenticated = true
    const { wrapper, router } = await render('/model-plaza?embedded=1')
    expect(wrapper.find('.public-header').exists()).toBe(false)
    expect(wrapper.find('[data-testid="app-layout"]').exists()).toBe(true)
    await router.push('/tutorials')
    await flushPromises()
    expect(wrapper.findAll('.public-header')).toHaveLength(1)
    reactive(authState).isAuthenticated = false
    await router.push('/model-plaza?embedded=1')
    await flushPromises()
    expect(wrapper.findAll('.public-header')).toHaveLength(1)
    expect(wrapper.find('[data-testid="app-layout"]').exists()).toBe(false)
  })

  it('preserves full page custom home content and restores the shared header on public pages', async () => {
    appState.cachedPublicSettings.home_content = '<section id="custom-home">Custom home</section>'
    const { wrapper, router } = await render('/home')
    expect(wrapper.get('#custom-home').text()).toBe('Custom home')
    expect(wrapper.find('.public-header').exists()).toBe(false)
    await router.push('/tutorials')
    await flushPromises()
    expect(wrapper.findAll('.public-header')).toHaveLength(1)
    expect(wrapper.find('.public-nav-chapters').exists()).toBe(false)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { RouterView } from 'vue-router'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'
import zh from '@/i18n/locales/zh'
import { i18n } from '@/i18n'

const state = vi.hoisted(() => ({
  auth: { checkAuth: vi.fn(), isAuthenticated: true, isAdmin: true, isObserver: false, canManageAccounts: true, isSimpleMode: false, hasPendingAuthSession: false },
  app: { siteName: 'Test', publicSettingsLoaded: true, cachedPublicSettings: { risk_control_enabled: true }, backendModeEnabled: false, showError: vi.fn(), showSuccess: vi.fn() },
  prompt: { getConfig: vi.fn(), getRuntime: vi.fn(), listGroups: vi.fn(), listEvents: vi.fn() },
  listIPAudit: vi.fn(),
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => state.auth }))
vi.mock('@/stores/app', () => ({ useAppStore: () => state.app }))
vi.mock('@/stores/adminSettings', () => ({ useAdminSettingsStore: () => ({ customMenuItems: [] }) }))
vi.mock('@/stores/adminCompliance', () => ({ useAdminComplianceStore: () => ({ initialized: true }) }))
vi.mock('@/composables/useNavigationLoading', () => ({ useNavigationLoadingState: () => ({ startNavigation: vi.fn(), endNavigation: vi.fn() }) }))
vi.mock('@/composables/useRoutePrefetch', () => ({ useRoutePrefetch: () => ({ triggerPrefetch: vi.fn() }) }))
vi.mock('@/features/prompt-audit/api', () => ({ default: state.prompt }))
vi.mock('@/features/ip-audit/api', async () => ({ ...await vi.importActual('@/features/ip-audit/api'), listIPAudit: state.listIPAudit }))
vi.mock('@/components/layout/AppLayout.vue', () => ({ default: defineComponent({ template: '<main><slot /></main>' }) }))
// Keep unrelated landing pages out of this focused route integration test.
vi.mock('@/views/user/DashboardView.vue', () => ({ default: defineComponent({ template: '<div>Dashboard</div>' }) }))
vi.mock('@/views/admin/SettingsView.vue', () => ({ default: defineComponent({ template: '<div>Settings</div>' }) }))
vi.mock('@/views/auth/LoginView.vue', () => ({ default: defineComponent({ template: '<div>Login</div>' }) }))
import router from '@/router'

let wrapper: ReturnType<typeof mount> | undefined
async function open(url: string, locale: 'en' | 'zh' = 'en') {
  i18n.global.setLocaleMessage(locale, locale === 'en' ? en : zh)
  i18n.global.locale.value = locale
  await router.push(url)
  await router.isReady()
  wrapper = mount(RouterView, { global: { plugins: [router, createI18n({ legacy: false, locale, messages: { en, zh } })], stubs: { RuntimeOverview: true, EndpointPool: true, PolicyPanel: true, PenaltyPolicyPanel: true, EventWorkspace: true, EventDetailDialog: true, FilterDeleteDialog: true, ConfirmDialog: true } } })
  await flushPromises()
  return wrapper
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('scrollTo', vi.fn())
  Object.assign(state.auth, { isAuthenticated: true, isAdmin: true, isObserver: false })
  state.app.cachedPublicSettings.risk_control_enabled = true
  state.prompt.getConfig.mockRejectedValue(new Error('prompt offline'))
  state.prompt.getRuntime.mockResolvedValue(null)
  state.prompt.listGroups.mockResolvedValue([])
  state.prompt.listEvents.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20, pages: 0 })
  state.listIPAudit.mockResolvedValue({ items: [], sources: [], has_more: false, next_cursor: 0, unrestricted: false })
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined })

describe('security audit real routes', () => {
  it('redirects the old IP tab before mounting prompt code and keeps other query/hash values', async () => {
    const page = await open('/admin/prompt-audit?tab=ip&source=login_failures#retained')
    expect(router.currentRoute.value.fullPath).toBe('/admin/ip-audit?source=login_failures#retained')
    expect(page.find('[data-testid="ip-audit-panel"]').exists()).toBe(true)
    expect(state.prompt.getConfig).not.toHaveBeenCalled()
    expect(page.text()).not.toContain(en.admin.promptAudit.description)
  })
  it.each(['en', 'zh'] as const)('renders separate full-width %s pages and active navigation', async locale => {
    const messages = locale === 'en' ? en : zh
    const page = await open('/admin/ip-audit', locale)
    expect(page.get('h1').text()).toBe(messages.ipAudit.title)
    expect(document.title).toBe(`${messages.ipAudit.title} - Test`)
    expect(page.get('a[href="/admin/ip-audit"]').attributes('aria-current')).toBe('page')
    expect(page.html()).not.toContain('max-w-[1600px]')
    await page.get('a[href="/admin/prompt-audit"]').trigger('click'); await flushPromises()
    await vi.waitFor(() => expect(page.get('h1').text()).toBe(messages.admin.promptAudit.title))
    expect(page.find('[data-testid="ip-audit-panel"]').exists()).toBe(false)
    expect(page.find('[data-test="tab-ip"]').exists()).toBe(false)
    expect(page.get('a[href="/admin/prompt-audit"]').attributes('aria-current')).toBe('page')
    expect(page.html()).not.toContain('max-w-[1600px]')
  })
  it('restores configuration/events deep links and browser back/forward without rewriting history', async () => {
    const page = await open('/admin/prompt-audit?tab=config&keep=1')
    expect(page.get('[data-test="tab-config"]').attributes('aria-selected')).toBe('true')
    await page.get('[data-test="tab-events"]').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ tab: 'events', keep: '1' })
    router.back()
    await vi.waitFor(() => expect(router.currentRoute.value.query.tab).toBe('config'))
    expect(page.get('[data-test="tab-config"]').attributes('aria-selected')).toBe('true')
    router.forward()
    await vi.waitFor(() => expect(router.currentRoute.value.query.tab).toBe('events'))
    await router.push('/admin/prompt-audit?tab=ip')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/ip-audit')
    expect(page.find('[data-test="tab-panel-config"]').exists()).toBe(false)
  })
  it.each(['observer', 'user'] as const)('keeps %s roles out of direct and legacy pages without sensitive requests', async role => {
    Object.assign(state.auth, { isAdmin: false, isObserver: role === 'observer' })
    for (const url of ['/admin/prompt-audit?tab=config', '/admin/ip-audit', '/admin/prompt-audit?tab=ip']) {
      await open(url)
      expect(router.currentRoute.value.path).toBe('/dashboard')
      expect(state.prompt.getConfig).not.toHaveBeenCalled()
      expect(state.listIPAudit).not.toHaveBeenCalled()
      wrapper?.unmount()
      wrapper = undefined
    }
  })
  it('keeps anonymous deep links behind login with a canonical return URL', async () => {
    state.auth.isAuthenticated = false; state.auth.isAdmin = false
    await open('/admin/prompt-audit?tab=ip')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/admin/ip-audit')
    expect(state.prompt.getConfig).not.toHaveBeenCalled()
    expect(state.listIPAudit).not.toHaveBeenCalled()
  })
  it('keeps prompt feature gating without preventing IP-only audit access', async () => {
    state.app.cachedPublicSettings.risk_control_enabled = false
    const page = await open('/admin/ip-audit')
    expect(router.currentRoute.value.path).toBe('/admin/ip-audit')
    expect(page.find('a[href="/admin/prompt-audit"]').exists()).toBe(false)
    await router.push('/admin/prompt-audit?tab=config')
    expect(router.currentRoute.value.path).toBe('/admin/settings')
    expect(state.prompt.getConfig).not.toHaveBeenCalled()
  })
})

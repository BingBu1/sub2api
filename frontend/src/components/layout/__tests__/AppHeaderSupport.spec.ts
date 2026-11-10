import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { enableAutoUnmount, shallowMount } from '@vue/test-utils'
import AppHeader from '../AppHeader.vue'
import HeaderSupportContact from '../HeaderSupportContact.vue'
import zh from '@/i18n/locales/zh'

enableAutoUnmount(afterEach)
const appState = reactive({ siteName: 'ZipKiwi', contactInfo: '前台联系方式', backendSupportContact: '', docUrl: '', cachedPublicSettings: null })
vi.mock('@/stores', () => ({
  useAppStore: () => appState,
  useAuthStore: () => ({ user: { username: 'test', email: 'test@example.com', role: 'user', balance: 0 }, isSimpleMode: false }),
  useOnboardingStore: () => ({ replay: vi.fn() }),
}))
vi.mock('@/stores/adminSettings', () => ({ useAdminSettingsStore: () => ({ customMenuItems: [] }) }))
vi.mock('@/utils/featureFlags', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/utils/featureFlags')>(),
  isFeatureFlagEnabled: () => false,
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }), useRoute: () => ({ name: 'Dashboard', meta: {}, params: {} }) }))

beforeEach(() => { appState.backendSupportContact = '' })

describe('console dedicated support configuration', () => {
  it('uses only dedicated support and hides the entry when it is cleared or blank', async () => {
    const wrapper = shallowMount(AppHeader, {
      global: { plugins: [createI18n({ legacy: false, locale: 'zh', messages: { zh } })], stubs: { RouterLink: true } },
    })
    expect(wrapper.findComponent(HeaderSupportContact).exists()).toBe(false)
    appState.backendSupportContact = '后台专属客服'
    await nextTick()
    expect(wrapper.getComponent(HeaderSupportContact).props('contactInfo')).toBe('后台专属客服')
    for (const value of ['', '  \t ']) {
      appState.backendSupportContact = value
      await nextTick()
      expect(wrapper.findComponent(HeaderSupportContact).exists()).toBe(false)
    }
    expect(appState.contactInfo).toBe('前台联系方式')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ModelPlazaContent from '../ModelPlazaContent.vue'
import PlazaBillingCurrency from '../PlazaBillingCurrency.vue'
import PlazaFilterBar from '../PlazaFilterBar.vue'
const auth = vi.hoisted(() => ({ isAdmin: false, isAuthenticated: true }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))
vi.mock('vue-i18n', async () => ({
  ...await vi.importActual<typeof import('vue-i18n')>('vue-i18n'),
  useI18n: () => ({ t: (key: string) => key })
}))
const render = () => mount(ModelPlazaContent, {
  props: { response: { description: '', groups: [] }, loading: false },
  global: { stubs: { Icon: true, PlazaFilterBar: true, PlazaBillingCurrency: true } }
})
describe('model plaza billing permissions and refresh', () => {
  it('shows billing settings only to administrators and refreshes after save', async () => {
    auth.isAdmin = false
    const user = render()
    expect(user.findComponent(PlazaBillingCurrency).exists()).toBe(false)
    user.unmount()
    auth.isAdmin = true
    const admin = render()
    expect(admin.getComponent(PlazaBillingCurrency).props('platform')).toBe('all')
    admin.getComponent(PlazaFilterBar).vm.$emit('update:platform', 'openai')
    await admin.vm.$nextTick()
    expect(admin.getComponent(PlazaBillingCurrency).props('platform')).toBe('openai')
    admin.getComponent(PlazaBillingCurrency).vm.$emit('saved')
    expect(admin.emitted('refresh')).toHaveLength(1)
    admin.unmount()
    auth.isAdmin = false
  })
})

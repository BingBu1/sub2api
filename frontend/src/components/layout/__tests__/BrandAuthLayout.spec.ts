import { describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import BrandAuthLayout from '../BrandAuthLayout.vue'
import zh from '@/i18n/locales/zh'

vi.mock('@/stores', () => ({
  useAppStore: () => ({ siteName: 'Zipkiwi', siteLogo: '', fetchPublicSettings: vi.fn() })
}))

describe('authentication branding', () => {
  it('shows the standalone sign-in brand link and preserves the form slots', () => {
    const wrapper = mount(BrandAuthLayout, {
      props: { standalone: true },
      slots: { default: '<form>登录</form>', footer: '<a>注册</a>' },
      global: {
        plugins: [createI18n({ legacy: false, locale: 'zh', messages: { zh } })],
        stubs: { RouterLink: RouterLinkStub, PublicSiteHeader: true }
      }
    })
    expect(wrapper.find('public-site-header-stub').exists()).toBe(false)
    expect(wrapper.getComponent('.brand-auth-corner-logo').props('to')).toBe('/home')
    expect(wrapper.get('.brand-auth-page').classes()).toContain('brand-auth-standalone')
    expect(wrapper.get('.brand-auth-form').text()).toBe('登录')
    expect(wrapper.get('.brand-auth-form-footer').text()).toBe('注册')
    wrapper.unmount()
  })
})

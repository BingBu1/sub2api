import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'
import PublicHeader from '../PublicHeader.vue'
import zh from '@/i18n/locales/zh'

const mounted: ReturnType<typeof mount>[] = []
function render(overrides = {}) {
  const wrapper = mount(PublicHeader, {
    attachTo: document.body,
    props: { siteName: '迅奇（ZipKiwi）', destination: '/login', isDark: false, showModelPlaza: true, ...overrides },
    global: {
      plugins: [createPinia(), createI18n({ legacy: false, locale: 'zh', messages: { zh } })],
      stubs: { RouterLink: RouterLinkStub, LocaleSwitcher: true }
    }
  })
  mounted.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn()
  } as unknown as MediaQueryList)
})
afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()); vi.restoreAllMocks() })

describe('public navigation', () => {
  it('uses a readable brand lockup in each theme', async () => {
    const wrapper = render()
    expect(wrapper.get('.public-lockup').attributes('src')).toBe('/zipkiwi-lockup-primary.svg')
    await wrapper.setProps({ isDark: true })
    expect(wrapper.get('.public-lockup').attributes('src')).toBe('/zipkiwi-lockup-white.svg')
  })

  it('keeps the same menu on home and model plaza with working cross-page destinations', () => {
    const home = render({ home: true, activeChapter: 'integration' })
    const plaza = render({ modelPlaza: true })
    expect(home.get('nav').text()).toBe(plaza.get('nav').text())
    expect(plaza.findAll('nav a, nav button').map(link => link.text())).toEqual([
      '核心功能', '快速接入', '企业服务', '模型广场', '教程文档', '联系我们'
    ])
    expect(home.get('a[href="#integration"]').attributes('aria-current')).toBe('location')
    const destinations = plaza.findAllComponents(RouterLinkStub).map(link => link.props('to'))
    expect(destinations).toEqual(expect.arrayContaining(['/home', '/model-plaza', '/home#hero', '/home#integration', '/home#enterprise', '/login']))
    expect(home.get('a[href="#hero"]').text()).toBe('核心功能')
    expect(plaza.get('nav [aria-current="page"]').text()).toBe('模型广场')
    expect(home.get('.public-nav-chapters').text()).toBe('核心功能快速接入企业服务')
    expect(home.get('.public-nav-resources').text()).toBe('模型广场教程文档联系我们')
  })
  it('closes mobile navigation on Escape, outside click and contact, restoring keyboard focus', async () => {
    const wrapper = render()
    const toggle = wrapper.get('.public-menu-toggle')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toggle.element)
    await toggle.trigger('click')
    document.body.click()
    await wrapper.vm.$nextTick()
    expect(toggle.attributes('aria-expanded')).toBe('false')
    const dialog = wrapper.get('dialog').element as HTMLDialogElement
    dialog.showModal = vi.fn()
    await toggle.trigger('click')
    wrapper.get<HTMLButtonElement>('nav button').element.focus()
    await wrapper.get('nav button').trigger('click')
    expect(dialog.showModal).toHaveBeenCalledOnce()
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toggle.element)
  })
  it('respects catalog visibility and supports pages without homepage sections', async () => {
    const wrapper = render({ showModelPlaza: false, showChapters: false, destination: '/admin/dashboard' })
    expect(wrapper.get('nav').text()).toBe('教程文档联系我们')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/home')
    expect(wrapper.findAllComponents(RouterLinkStub).at(-1)?.props('to')).toBe('/admin/dashboard')
    await wrapper.get('.public-theme-toggle').trigger('click')
    expect(wrapper.emitted('toggleTheme')).toHaveLength(1)
  })
  it('places the tutorials page after Model Plaza and marks it active', () => {
    const wrapper = render({ tutorialDocs: true })
    const links = wrapper.findAll('nav a, nav button')
    expect(links.at(-2)?.text()).toBe('教程文档')
    expect(links.at(-1)?.text()).toBe('联系我们')
    expect(wrapper.findAllComponents(RouterLinkStub).find(link => link.text() === '教程文档')?.props('to')).toBe('/tutorials')
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe('教程文档')
  })
})

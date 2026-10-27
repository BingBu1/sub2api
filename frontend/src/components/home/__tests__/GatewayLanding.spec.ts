import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'
import GatewayLanding from '../GatewayLanding.vue'
import en from '@/i18n/locales/en'
import zh from '@/i18n/locales/zh'

const mounted: ReturnType<typeof mount>[] = []
function render(
  overrides: Partial<InstanceType<typeof GatewayLanding>['$props']> = {},
  locale = 'zh'
) {
  const i18n = createI18n({ legacy: false, locale, messages: { en, zh } })
  const wrapper = mount(GatewayLanding, {
    attachTo: document.body,
    props: {
      siteName: 'zipkiwi',
      docUrl: '',
      isDark: false,
      isAuthenticated: false,
      dashboardPath: '/dashboard',
      registrationEnabled: true,
      showModelPlaza: false,
      ...overrides
    },
    global: {
      plugins: [createPinia(), i18n],
      stubs: { RouterLink: RouterLinkStub, LocaleSwitcher: true }
    }
  })
  mounted.push(wrapper)
  return { wrapper, i18n }
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  } as unknown as MediaQueryList)
})
afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  Reflect.deleteProperty(document.documentElement, 'scrollHeight')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('GatewayLanding', () => {
  it('opens the shared contact dialog, copies current settings and handles empty contact details', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('isSecureContext', true)
    const { wrapper } = render({ contactInfo: 'QQ群号123456789' })
    const dialog = wrapper.get('dialog').element as HTMLDialogElement
    dialog.showModal = vi.fn()
    await wrapper.get('.contact-trigger').trigger('click')
    expect(dialog.showModal).toHaveBeenCalledOnce()
    expect(wrapper.emitted('openContact')).toHaveLength(1)
    expect(wrapper.get('.contact-details').text()).toContain('QQ群号123456789')
    await wrapper.get('.contact-copy').trigger('click')
    expect(writeText).toHaveBeenLastCalledWith('123456789')
    await wrapper.setProps({ contactInfo: 'help@example.com\n微信：zipkiwi' })
    expect(wrapper.get('.contact-details p').text()).toBe('help@example.com\n微信：zipkiwi')
    expect(wrapper.find('.contact-copy').exists()).toBe(false)
    await wrapper.setProps({ contactInfo: 'QQ群号：123 456 789（客服）' })
    await wrapper.get('.contact-copy').trigger('click')
    expect(writeText).toHaveBeenLastCalledWith('123456789')
    await wrapper.setProps({ contactInfo: '   ' })
    expect(wrapper.find('.contact-details').exists()).toBe(false)
    expect(wrapper.find('.contact-copy').exists()).toBe(false)
    expect(wrapper.get('.contact-empty').text()).toContain('客服联系方式暂未配置')
  })

  it('shows back to top after scrolling and respects the reduced motion setting', async () => {
    vi.stubGlobal('scrollY', 0)
    const { wrapper } = render()
    expect(wrapper.find('.backtop-trigger').exists()).toBe(false)
    vi.stubGlobal('scrollY', 700)
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame')
    window.dispatchEvent(new Event('scroll'))
    requestFrame.mock.calls.at(-1)![0](0)
    await wrapper.vm.$nextTick()
    await wrapper.get('.backtop-trigger').trigger('click')
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'smooth' })
    const onChange = vi.mocked(window.matchMedia).mock.results[0]!.value.addEventListener.mock.calls[0][1]
    onChange({ matches: true })
    await wrapper.get('.backtop-trigger').trigger('click')
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' })
  })

  it('marks the visible chapter while scrolling and scrolls menu links without changing the URL', async () => {
    vi.stubGlobal('innerHeight', 1000)
    vi.stubGlobal('scrollY', 0)
    const scrollTo = vi.mocked(window.scrollTo)
    const { wrapper } = render()
    const sections = ['platform', 'value', 'audiences', 'integration', 'faq']
      .map((id) => wrapper.get<HTMLElement>(`#${id}`).element)
    const bounds = sections.map((section, index) =>
      vi.spyOn(section, 'getBoundingClientRect')
        .mockReturnValue(new DOMRect(0, index === 0 ? 100 : 1000 + index * 500, 100, 200))
    )
    const links = wrapper.findAll('#main-navigation a')
    window.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => expect(links[0]!.attributes('aria-current')).toBe('location'))
    expect(links[1]!.attributes('aria-current')).toBeUndefined()

    bounds[0]!.mockReturnValue(new DOMRect(0, -600, 100, 200))
    bounds[1]!.mockReturnValue(new DOMRect(0, 100, 100, 200))
    window.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => expect(links[1]!.attributes('aria-current')).toBe('location'))
    expect(links[0]!.classes()).not.toContain('is-current')

    bounds[3]!.mockReturnValue(new DOMRect(0, 600, 100, 200))
    const url = window.location.href
    await links[3]!.trigger('click')
    expect(scrollTo).toHaveBeenCalledWith({ top: 580, behavior: 'smooth' })
    expect(window.location.href).toBe(url)
  })

  it('connects value hover and keyboard focus to the orbit illustration', async () => {
    const { wrapper } = render()
    const values = wrapper.findAll('.value-list > div')
    expect(wrapper.get('#value').attributes('data-active-value')).toBe('0')
    await values[1]!.trigger('mouseenter')
    expect(wrapper.get('#value').attributes('data-active-value')).toBe('1')
    await values[2]!.trigger('focus')
    expect(wrapper.get('#value').attributes('data-active-value')).toBe('2')
    expect(values.every((value) => value.attributes('tabindex') === '0')).toBe(true)
    expect(wrapper.find('.motion-toggle').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('暂停动效')
  })

  it('updates the header reading progress on scroll and resize and cleans up pending work', async () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 3000
    })
    vi.stubGlobal('innerHeight', 1000)
    vi.stubGlobal('scrollY', 0)
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame')
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame')
    const removeListener = vi.spyOn(window, 'removeEventListener')
    const { wrapper } = render()
    const header = wrapper.get<HTMLElement>('.site-header').element
    expect(header.style.getPropertyValue('--page-progress')).toBe('0')

    vi.stubGlobal('scrollY', 1000)
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    expect(requestFrame).toHaveBeenCalledTimes(1)
    await vi.waitFor(() =>
      expect(header.style.getPropertyValue('--page-progress')).toBe('0.5')
    )

    vi.stubGlobal('scrollY', 3000)
    window.dispatchEvent(new Event('resize'))
    await vi.waitFor(() =>
      expect(header.style.getPropertyValue('--page-progress')).toBe('1')
    )

    window.dispatchEvent(new Event('scroll'))
    const pendingFrame = requestFrame.mock.results.at(-1)!.value
    wrapper.unmount()
    expect(cancelFrame).toHaveBeenCalledWith(pendingFrame)
    expect(removeListener).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('connects theme controls and translates the full page reactively', async () => {
    const { wrapper, i18n } = render()
    expect(wrapper.get('h1').text()).toContain('让好用的 AI')
    await wrapper.get('.theme-toggle').trigger('click')
    expect(wrapper.emitted('toggleTheme')).toHaveLength(1)
    await wrapper.setProps({ isDark: true })
    expect(wrapper.classes()).toContain('is-dark')
    expect(wrapper.get('.theme-toggle').attributes('aria-label')).toBe(
      '切换到浅色模式'
    )
    i18n.global.locale.value = 'en'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('h1').text()).toContain('Bring great AI')
    expect(wrapper.text()).not.toContain('gateway.')
    expect(wrapper.text()).not.toContain('让好用的 AI')
  })

  it('uses configured documentation and keeps disabled model links out of navigation', async () => {
    const { wrapper } = render({ docUrl: 'https://docs.example.com/start' })
    const docs = wrapper.get('.hero-cta .secondary')
    expect(docs.attributes('href')).toBe('https://docs.example.com/start')
    expect(docs.attributes('rel')).toBe('noopener noreferrer')
    expect(
      wrapper
        .findAllComponents(RouterLinkStub)
        .some((link) => link.props('to') === '/model-plaza')
    ).toBe(false)
    await wrapper.setProps({ docUrl: '', showModelPlaza: true })
    expect(docs.attributes('href')).toBe('#integration')
    expect(docs.attributes('target')).toBeUndefined()
    expect(wrapper.getComponent('.catalog-model').props('to')).toBe(
      '/model-plaza'
    )
  })

  it('supports keyboard navigation between audience panels', async () => {
    const { wrapper } = render()
    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[0]!.trigger('keydown', { key: 'End' })
    expect(tabs[2]!.attributes('aria-selected')).toBe('true')
    expect(wrapper.get('#audience-panel-0').attributes('hidden')).toBeDefined()
    expect(
      wrapper.get('#audience-panel-2').attributes('hidden')
    ).toBeUndefined()
    expect(document.activeElement?.id).toBe('audience-tab-2')
    await tabs[2]!.trigger('keydown', { key: 'ArrowRight' })
    expect(tabs[0]!.attributes('tabindex')).toBe('0')
    await tabs[1]!.trigger('click')
    expect(
      wrapper.get('#audience-panel-1').attributes('hidden')
    ).toBeUndefined()
  })

  it('closes mobile navigation on selection, outside click and Escape', async () => {
    const { wrapper } = render()
    const toggle = wrapper.get('.mobile-menu-toggle')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await wrapper.get('nav a').trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    document.body.click()
    await wrapper.vm.$nextTick()
    expect(toggle.attributes('aria-expanded')).toBe('false')
  })

  it('copies the configured endpoint without duplicating /v1 and reports failure', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const { wrapper } = render({ apiBaseUrl: 'https://api.example.com/v1/' })
    expect(wrapper.get('pre').text()).toContain(
      'base_url="https://api.example.com/v1"'
    )
    await wrapper.get('.copy').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.get('[role="status"]').text()).toBe('已复制 ✓')
    )
    expect(writeText).toHaveBeenCalledWith(wrapper.get('code').text())
    writeText.mockRejectedValueOnce(new Error('clipboard denied'))
    await wrapper.get('.copy').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.get('[role="status"]').text()).toBe('请选中代码复制')
    )
  })

  it('respects reduced motion changes and removes its listeners on unmount', async () => {
    const add = vi.fn()
    const remove = vi.fn()
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: add,
      removeEventListener: remove
    } as unknown as MediaQueryList)
    const { wrapper } = render()
    expect(wrapper.classes()).toContain('motion-paused')
    expect(wrapper.find('.motion-toggle').exists()).toBe(false)
    add.mock.calls[0]![1]({ matches: false })
    await wrapper.vm.$nextTick()
    expect(wrapper.classes()).not.toContain('motion-paused')
    wrapper.unmount()
    expect(remove).toHaveBeenCalledWith('change', add.mock.calls[0]![1])
  })
})

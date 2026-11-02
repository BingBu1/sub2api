import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'
import GatewayLanding from '../GatewayLanding.vue'
import en from '@/i18n/locales/en'
import zh from '@/i18n/locales/zh'
import { getPublicTelemetry } from '@/api/publicTelemetry'
import { getModelPlaza, type ModelPlazaResponse } from '@/api/modelPlaza'

vi.mock('@/api/publicTelemetry', () => ({ getPublicTelemetry: vi.fn() }))
vi.mock('@/api/modelPlaza', () => ({ getModelPlaza: vi.fn() }))

const sampleTelemetry = {
  total_tokens: 683_130_000,
  success_rate: 99.5,
  average_output_tps: 42.3,
  updated_at: '2026-11-02T00:00:00Z'
}
const samplePlaza = {
  description: '',
  groups: [{
    id: 1, name: 'Standard', description: '', platform: 'openai', subscription_type: 'standard',
    rate_multiplier: 0.2, peak_rate_enabled: false, peak_start: '', peak_end: '', peak_rate_multiplier: 1,
    is_exclusive: false, image_rate_independent: false, image_rate_multiplier: 1,
    video_rate_independent: false, video_rate_multiplier: 1, long_context_pricing_enabled: true,
    models: [
      { name: 'gpt-5.6-luna', platform: 'openai', pricing: { billing_mode: 'token', input_price: 2e-7, output_price: 1.2e-6,
        intervals: [{ min_tokens: 0, max_tokens: 272000, input_price: null, output_price: null, input_multiplier: 1.5, output_multiplier: 2 }] } },
      { name: 'gpt-5.6-sol', platform: 'openai', pricing: { billing_mode: 'token', input_price: 1e-6, output_price: 5e-6, intervals: [] } },
      { name: 'claude-sonnet-4-6', platform: 'anthropic', pricing: { billing_mode: 'token', input_price: 3e-6, output_price: 15e-6, intervals: [] } }
    ]
  }]
} as unknown as ModelPlazaResponse

const mounted: ReturnType<typeof mount>[] = []
function render(overrides: Partial<InstanceType<typeof GatewayLanding>['$props']> = {}) {
  const i18n = createI18n({ legacy: false, locale: 'zh', messages: { en, zh } })
  const wrapper = mount(GatewayLanding, {
    attachTo: document.body,
    props: {
      siteName: 'zipkiwi', docUrl: '', isDark: false, isAuthenticated: false,
      dashboardPath: '/dashboard', registrationEnabled: true, showModelPlaza: true,
      ...overrides
    },
    global: { plugins: [createPinia(), i18n], stubs: { RouterLink: RouterLinkStub, LocaleSwitcher: true } }
  })
  mounted.push(wrapper)
  return { wrapper, i18n }
}
beforeEach(() => {
  vi.mocked(getPublicTelemetry).mockResolvedValue(sampleTelemetry)
  vi.mocked(getModelPlaza).mockResolvedValue(samplePlaza)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn()
  } as unknown as MediaQueryList)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})
afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('GatewayLanding final handoff', () => {
  it('connects each network route to the facing edge of its model card', () => {
    const boxes = [
      [400, 240, 100, 50], [660, 320, 100, 50], [660, 540, 100, 50],
      [400, 600, 100, 50], [120, 540, 100, 50], [120, 320, 100, 50]
    ]
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      const box = this.classList.contains('network-scene')
        ? [100, 200, 700, 495]
        : boxes.find((_, index) => this.classList.contains(`n${index + 1}`))
      const [left, top, width, height] = box ?? [0, 0, 0, 0]
      return { left, top, width, height, right: left + width, bottom: top + height } as DOMRect
    })
    const quadraticCurveTo = vi.fn()
    const context = {
      clearRect: vi.fn(), setTransform: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(),
      moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn(),
      quadraticCurveTo, createRadialGradient: () => ({ addColorStop: vi.fn() })
    } as unknown as CanvasRenderingContext2D
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    render()
    expect(quadraticCurveTo.mock.calls.map(([, , x, y]) => [x, y])).toEqual([
      [350, 90], [560, 145], [560, 365], [350, 400], [120, 365], [120, 145]
    ])
  })

  it('renders the screenshot modules in the intended sequence', async () => {
    const { wrapper } = render()
    await flushPromises()
    expect(wrapper.find('canvas.network-canvas').exists()).toBe(true)
    expect(wrapper.findAll('.network-core-platform')).toHaveLength(3)
    expect(wrapper.find('.network-core-label').text()).toContain('zipkiwi')
    expect(wrapper.find('.telemetry-metrics').exists()).toBe(true)
    expect(wrapper.find('.telemetry-ranking').text()).toContain('Claude Sonnet 4.6')
    expect(wrapper.get('[data-testid="telemetry-tokens"]').text()).toBe('683,130,000')
    expect(wrapper.find('.telemetry-success').text()).toContain('99.50%')
    expect(wrapper.find('.price-table tbody').findAll('tr')).toHaveLength(3)
    expect(wrapper.find('.feature-grid').findAll('.feature-item')).toHaveLength(4)
    expect(wrapper.findAll('.product-visual')).toHaveLength(4)
    expect(wrapper.find('.route-model-three').text()).toBe('Gemini')
    expect(wrapper.findAll('.trace-row')).toHaveLength(3)
    expect(wrapper.findAll('.usage-bars i')).toHaveLength(12)
    expect(wrapper.findAll('.connection-path')).toHaveLength(3)
    expect(wrapper.find('.connection-paths details').exists()).toBe(false)
    expect(wrapper.find('.request-window').exists()).toBe(true)
    expect(wrapper.find('.enterprise-blueprint').exists()).toBe(true)
    expect(wrapper.find('.faq-list').exists()).toBe(true)
    expect(wrapper.find('.home-float-actions').exists()).toBe(false)
  })

  it('moves token totals only when a new backend value arrives', async () => {
    let poll: (() => void) | undefined
    vi.spyOn(globalThis, 'setInterval').mockImplementation((callback, interval) => {
      if (interval === 15_000) poll = callback as () => void
      return interval as ReturnType<typeof setInterval>
    })
    vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {})
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(performance.now() + 2000)
      return 1
    })
    const { wrapper } = render()
    await flushPromises()
    expect(wrapper.get('[data-testid="telemetry-tokens"]').text()).toBe('683,130,000')
    vi.mocked(getPublicTelemetry).mockResolvedValue({ ...sampleTelemetry, total_tokens: 683_130_120 })
    poll?.()
    await flushPromises()
    expect(wrapper.get('[data-testid="telemetry-tokens"]').text()).toBe('683,130,120')
    poll?.()
    await flushPromises()
    expect(wrapper.get('[data-testid="telemetry-tokens"]').text()).toBe('683,130,120')
    wrapper.unmount()
    expect(clearInterval).toHaveBeenCalledWith(15_000)
  })

  it('does not substitute demo metrics when telemetry fails', async () => {
    vi.mocked(getPublicTelemetry).mockRejectedValue(new Error('offline'))
    const { wrapper } = render()
    await flushPromises()
    expect(wrapper.get('[data-testid="telemetry-tokens"]').text()).toBe('—')
    expect(wrapper.find('.telemetry-demo').text()).toContain('统计暂不可用')
    expect(wrapper.find('.telemetry-ranking ol').findAll('li')).toHaveLength(3)
    expect(wrapper.find('.telemetry-ranking p').text()).toContain('展示示意')
  })

  it('filters live Model Plaza prices and updates after the next poll', async () => {
    let poll: (() => void) | undefined
    vi.spyOn(globalThis, 'setInterval').mockImplementation((callback, interval) => {
      if (interval === 60_000) poll = callback as () => void
      return interval as ReturnType<typeof setInterval>
    })
    const { wrapper } = render()
    await flushPromises()
    expect(wrapper.find('.price-snapshot').text()).toContain('每 60 秒更新')
    expect(wrapper.find('.price-table tbody').text()).toContain('$0.06')
    expect(wrapper.find('.price-table tbody').text()).toContain('$0.48')
    const filters = wrapper.findAll('.model-guide button')
    await filters[1]!.trigger('click')
    expect(filters[1]!.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('.price-table tbody').findAll('tr')).toHaveLength(1)
    expect(wrapper.find('.price-table tbody').text()).toContain('gpt-5.6-luna')
    await filters[2]!.trigger('click')
    expect(wrapper.find('.price-table tbody').text()).toContain('gpt-5.6-sol')
    await filters[3]!.trigger('click')
    expect(wrapper.find('.price-table tbody').text()).toContain('claude-sonnet-4-6')
    await filters[0]!.trigger('click')
    expect(wrapper.find('.price-table tbody').findAll('tr')).toHaveLength(3)
    vi.mocked(getModelPlaza).mockResolvedValue({ ...samplePlaza, groups: [{ ...samplePlaza.groups[0]!, rate_multiplier: 0.3 }] })
    poll?.()
    await flushPromises()
    expect(wrapper.find('.price-table tbody').text()).toContain('$0.09')
    expect(wrapper.find('.price-table tbody').text()).toContain('$0.72')
  })

  it('does not show stale or invented prices when the catalog becomes unavailable', async () => {
    let poll: (() => void) | undefined
    vi.spyOn(globalThis, 'setInterval').mockImplementation((callback, interval) => {
      if (interval === 60_000) poll = callback as () => void
      return interval as ReturnType<typeof setInterval>
    })
    const { wrapper } = render()
    await flushPromises()
    expect(wrapper.find('.price-table tbody').text()).toContain('$0.06')
    vi.mocked(getModelPlaza).mockRejectedValue(new Error('offline'))
    poll?.()
    await flushPromises()
    expect(wrapper.find('.price-snapshot').text()).toContain('价格暂不可用')
    expect(wrapper.findAll('.price-table tbody tr')).toHaveLength(3)
    expect(wrapper.find('.price-table tbody').text()).not.toContain('$')
  })

  it('switches code languages and uses the configured endpoint', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const { wrapper } = render({ apiBaseUrl: 'https://api.example.com/v1/' })
    expect(wrapper.find('pre').text()).toContain('base_url="https://api.example.com/v1"')
    const tabs = wrapper.findAll('.request-tabs button')
    await tabs[1]!.trigger('click')
    expect(wrapper.find('pre').text()).toContain('baseURL: "https://api.example.com/v1"')
    await tabs[2]!.trigger('click')
    expect(wrapper.find('pre').text()).toContain('curl https://api.example.com/v1/chat/completions')
    await wrapper.get('.request-toolbar .copy').trigger('click')
    expect(writeText).toHaveBeenCalledWith(wrapper.find('pre').text())
  })

  it('prepares contact requirements locally and opens via the navigation', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('isSecureContext', true)
    const { wrapper } = render({ contactInfo: 'QQ群号123456789' })
    const dialog = wrapper.get('dialog').element as HTMLDialogElement
    dialog.showModal = vi.fn()
    await wrapper.get('#main-navigation button').trigger('click')
    expect(dialog.showModal).toHaveBeenCalledOnce()
    await wrapper.get('.contact-copy').trigger('click')
    expect(writeText).toHaveBeenCalledWith('123456789')
    const inputs = wrapper.findAll('.contact-request-panel input')
    await inputs[0]!.setValue('Alice')
    await inputs[1]!.setValue('alice@example.com')
    await wrapper.get('.contact-request-panel textarea').setValue('需要模型接入')
    await wrapper.get('.contact-request-panel').trigger('submit')
    expect(writeText).toHaveBeenLastCalledWith(expect.stringContaining('Alice'))
    expect(wrapper.get('.contact-request-panel [role="status"]').text()).toContain('需求已整理并复制')
  })

  it('preserves routing, configured documentation and reactive translation', async () => {
    const { wrapper, i18n } = render({ docUrl: 'https://docs.example.com/start' })
    expect(wrapper.get('.hero-cta .secondary').attributes('href')).toBe('https://docs.example.com/start')
    expect(wrapper.findAllComponents(RouterLinkStub).some(link => link.props('to') === '/model-plaza')).toBe(true)
    await wrapper.setProps({ showModelPlaza: false })
    expect(wrapper.findAllComponents(RouterLinkStub).some(link => link.props('to') === '/model-plaza')).toBe(false)
    i18n.global.locale.value = 'en'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('h1').text()).toContain('Bring intelligence closer')
    expect(wrapper.text()).not.toContain('gateway.')
  })

  it('respects reduced motion and cleans up listeners', async () => {
    const add = vi.fn(), remove = vi.fn()
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true, addEventListener: add, removeEventListener: remove
    } as unknown as MediaQueryList)
    const { wrapper } = render()
    expect(wrapper.classes()).toContain('motion-paused')
    add.mock.calls[0]![1]({ matches: false })
    await wrapper.vm.$nextTick()
    expect(wrapper.classes()).not.toContain('motion-paused')
    wrapper.unmount()
    expect(remove).toHaveBeenCalledWith('change', add.mock.calls[0]![1])
  })
})

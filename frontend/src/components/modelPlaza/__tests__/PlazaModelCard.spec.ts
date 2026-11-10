import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlazaModelCard from '../PlazaModelCard.vue'
import type { ModelPlazaGroup, PlazaModel } from '@/api/modelPlaza'

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return { ...actual, useI18n: () => ({ t: (key: string, params?: { currency?: string }) => params?.currency ? `${key}:${params.currency}` : key }) }
})
vi.mock('@/composables/useClipboard', () => ({
  useClipboard: () => ({ copyToClipboard: vi.fn() })
}))

const model: PlazaModel = {
  name: 'gpt-example',
  platform: 'openai',
  pricing: {
    billing_mode: 'token',
    input_price: 0.000001,
    output_price: 0.000002,
    cache_write_price: null,
    cache_read_price: null,
    image_input_price: null,
    image_output_price: null,
    per_request_price: null,
    intervals: []
  },
  official_pricing: null
}
const group: ModelPlazaGroup = {
  id: 1,
  name: 'standard',
  description: '',
  platform: 'openai',
  subscription_type: 'standard',
  rate_multiplier: 0.5,
  peak_rate_enabled: false,
  peak_start: '',
  peak_end: '',
  peak_rate_multiplier: 1,
  is_exclusive: false,
  image_rate_independent: false,
  image_rate_multiplier: 1,
  video_rate_independent: false,
  video_rate_multiplier: 1,
  long_context_pricing_enabled: true,
  models: [model]
}
function render(g = group, m = model) {
  return mount(PlazaModelCard, { props: { group: g, model: m }, global: { stubs: { Icon: true, PlatformIcon: true } } })
}

describe('PlazaModelCard', () => {
  it('uses the backend currency for both token and media quotes', () => {
    const cny = { ...group, billing_currency: 'CNY' as const }
    const token = render(cny)
    expect(token.find('.plaza-card-prices').text()).toContain('¥0.50')
    expect(token.find('.plaza-card-prices').text()).not.toContain('$')
    expect(token.get('.plaza-card-unit').text()).toBe('modelPlaza.card.tokenUnit:CNY')
    token.unmount()
    const image = render(cny, { ...model, pricing: { ...model.pricing!, billing_mode: 'image', per_request_price: 0.7 } })
    expect(image.find('.plaza-card-prices').text()).toContain('¥0.35')
    expect(image.get('.plaza-card-unit').text()).toBe('modelPlaza.card.requestUnit:CNY')
    image.unmount()
  })

  it('preserves CNY for tiered media prices after combining currency and card updates', () => {
    const wrapper = render({ ...group, billing_currency: 'CNY' }, {
      ...model,
      pricing: { ...model.pricing!, billing_mode: 'image', per_request_price: 0.7, intervals: [
        { min_tokens: 0, max_tokens: null, tier_label: '', input_price: null, output_price: null, cache_write_price: null, cache_read_price: null, per_request_price: 0.2 }
      ] }
    })
    expect(wrapper.get('.plaza-card-prices').text()).toContain('¥0.10')
    expect(wrapper.get('.plaza-card-unit').text()).toBe('modelPlaza.card.requestUnit:CNY')
    wrapper.unmount()
  })

  it('shows real base token prices with the group rate', () => {
    const wrapper = render()
    expect(wrapper.find('.plaza-card-prices').text()).toContain('$0.50')
    expect(wrapper.find('.plaza-card-prices').text()).toContain('$1.00')
    expect(wrapper.find('.plaza-card-meta').text()).toContain('0.5x')
  })

  it('uses the user-specific rate when returned by the API', () => {
    const wrapper = render({ ...group, user_rate_multiplier: 0.2 })
    expect(wrapper.find('.plaza-card-prices').text()).toContain('$0.20')
    expect(wrapper.find('.plaza-card-meta').text()).toContain('0.2x')
  })

  it('uses an independent image rate for per-image prices', () => {
    const wrapper = render(
      { ...group, image_rate_independent: true, image_rate_multiplier: 2 },
      { ...model, pricing: { ...model.pricing!, billing_mode: 'image', per_request_price: 0.1 } }
    )
    expect(wrapper.find('.plaza-card-prices').text()).toContain('$0.20')
    expect(wrapper.find('.plaza-card-prices').text()).toContain('modelPlaza.table.perImage')
  })

  it('uses the independent video rate instead of the user-specific rate', () => {
    const wrapper = render(
      { ...group, user_rate_multiplier: 0.2, video_rate_independent: true, video_rate_multiplier: 1.5 },
      { ...model, pricing: { ...model.pricing!, billing_mode: 'video', per_request_price: 0.1 } }
    )
    expect(wrapper.find('.plaza-card-prices').text()).toContain('$0.15')
    expect(wrapper.find('.plaza-card-meta').text()).toContain('1.5x')
  })

  it('keeps missing pricing visibly unavailable and opens details', async () => {
    const wrapper = render(group, { ...model, pricing: null })
    expect(wrapper.find('.plaza-card-prices').text()).toContain('-')
    await wrapper.find('.plaza-card-bottom button').trigger('click')
    expect(wrapper.emitted('showDetails')).toHaveLength(1)
  })

  it('summarizes the first context tier with resolved multipliers and exposes its billing rules', () => {
    const wrapper = render(group, { ...model, pricing: { ...model.pricing!, intervals: [
      { min_tokens: 100_000, max_tokens: null, tier_label: '', input_price: 0.00001, output_price: 0.00002, cache_write_price: null, cache_read_price: null, per_request_price: null },
      { min_tokens: 0, max_tokens: 100_000, tier_label: '', input_price: null, output_price: null, input_multiplier: 2, output_multiplier: 3, cache_write_price: null, cache_read_price: null, per_request_price: null }
    ] } })
    expect(wrapper.get('.plaza-card-prices').text()).toContain('$1.00')
    expect(wrapper.get('.plaza-card-prices').text()).toContain('$3.00')
    expect(wrapper.get('.plaza-card-bottom').text()).toContain('modelPlaza.card.variablePricing')
  })

  it('keeps zero cache prices visible and distinguishes USD per million from per-call prices', () => {
    const wrapper = render(group, { ...model, pricing: { ...model.pricing!, cache_read_price: 0 } })
    expect(wrapper.get('.plaza-card-cache').text()).toContain('$0.00')
    expect(wrapper.get('.plaza-card-unit').text()).toBe('modelPlaza.card.tokenUnit:USD')
    const perCall = render(group, { ...model, pricing: { ...model.pricing!, billing_mode: 'per_request', per_request_price: 0.001 } })
    expect(perCall.get('.plaza-card-unit').text()).toBe('modelPlaza.card.requestUnit:USD')
    expect(perCall.get('.plaza-card-prices').text()).toContain('$0.0005')
  })

  it('discloses time and peak adjustments without advertising them as a flat price', () => {
    const wrapper = render(group, { ...model, time_pricing: { timezone: 'Asia/Shanghai', periods: [{ start_time: '00:00', end_time: '08:00', multiplier: 0.5 }] } })
    expect(wrapper.get('.plaza-card-bottom').text()).toContain('modelPlaza.card.variablePricing')
  })
})

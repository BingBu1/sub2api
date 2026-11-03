import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlazaModelCard from '../PlazaModelCard.vue'
import type { ModelPlazaGroup, PlazaModel } from '@/api/modelPlaza'

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
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
  it('shows real base token prices with the group rate', () => {
    const wrapper = render()
    expect(wrapper.find('.plaza-card-prices').text()).toContain('$0.50')
    expect(wrapper.find('.plaza-card-prices').text()).toContain('$1.00')
    expect(wrapper.find('.plaza-card-bottom').text()).toContain('0.5x')
  })

  it('uses the user-specific rate when returned by the API', () => {
    const wrapper = render({ ...group, user_rate_multiplier: 0.2 })
    expect(wrapper.find('.plaza-card-prices').text()).toContain('$0.20')
    expect(wrapper.find('.plaza-card-bottom').text()).toContain('0.2x')
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
    expect(wrapper.find('.plaza-card-bottom').text()).toContain('1.5x')
  })

  it('keeps missing pricing visibly unavailable and opens details', async () => {
    const wrapper = render(group, { ...model, pricing: null })
    expect(wrapper.find('.plaza-card-prices').text()).toContain('-')
    await wrapper.find('.plaza-card-bottom button').trigger('click')
    expect(wrapper.emitted('showDetails')).toHaveLength(1)
  })
})

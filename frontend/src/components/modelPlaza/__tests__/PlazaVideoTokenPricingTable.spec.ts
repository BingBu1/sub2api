import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlazaVideoTokenPricingTable from '../PlazaVideoTokenPricingTable.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

describe('Seedance estimated token pricing', () => {
  it('discloses estimates and applies the sales rate to CNY prices', () => {
    const wrapper = mount(PlazaVideoTokenPricingTable, {
      props: {
        rateMultiplier: 0.83,
        models: [{
          name: 'Seedance2.0', platform: 'openai', pricing: null, official_pricing: null,
          video_token_tiers: [
            { resolution: '720p', reference_video: false, output_price: 46e-6, source_price_cny: 46e-6, estimated: true },
            { resolution: '720p', reference_video: true, output_price: 28e-6, source_price_cny: 28e-6, estimated: true }
          ]
        }]
      }
    })
    expect(wrapper.text()).toContain('videoTokenEstimatedNote')
    expect(wrapper.text()).not.toContain('modelPlaza.table.videoTokenNote')
    expect(wrapper.text()).toContain('38.18')
    expect(wrapper.text()).toContain('23.24')
    expect(wrapper.text()).toContain('0.83x')
    expect(wrapper.text()).not.toContain('$')
    wrapper.unmount()
  })
})

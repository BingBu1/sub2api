import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ModelPlazaContent from '../ModelPlazaContent.vue'
import PlazaGroupSection from '../PlazaGroupSection.vue'
import type { ModelPlazaGroup, ModelPlazaResponse } from '@/api/modelPlaza'
import zh from '@/i18n/locales/zh'

const auth = vi.hoisted(() => ({ isAdmin: false, isAuthenticated: false }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ cachedPublicSettings: null }) }))

function group(id: number, platform: string, rate: number, names: string[]): ModelPlazaGroup {
  return {
    id, name: `Group ${id}`, description: '', platform,
    billing_currency: platform === 'deepseek' ? 'CNY' : 'USD',
    subscription_type: 'standard', rate_multiplier: rate,
    peak_rate_enabled: false, peak_start: '', peak_end: '', peak_rate_multiplier: 1,
    is_exclusive: false, image_rate_independent: false, image_rate_multiplier: 1,
    video_rate_independent: false, video_rate_multiplier: 1, long_context_pricing_enabled: true,
    models: names.map(name => ({
      name, platform,
      pricing: {
        billing_mode: 'token', input_price: 1e-6, output_price: 2e-6,
        cache_write_price: null, cache_read_price: null, image_input_price: null,
        image_output_price: null, per_request_price: null, intervals: []
      },
      official_pricing: { input_price: 2e-6, output_price: 4e-6, cache_write_price: null, cache_read_price: null }
    }))
  }
}

function render(response: ModelPlazaResponse = {
  description: '',
  groups: [group(1, 'openai', 0.5, ['gpt-alpha', 'gpt-beta']), group(2, 'deepseek', 0.25, ['deepseek-chat'])]
}, embedded = false) {
  return mount(ModelPlazaContent, {
    props: { response, loading: false, embedded },
    global: { plugins: [createI18n({ legacy: false, locale: 'zh', messages: { zh } })] }
  })
}

beforeEach(() => { auth.isAdmin = false; auth.isAuthenticated = false })

describe('grouped model plaza', () => {
  it('shows complete grouped tables with both paid and official prices by effective rate', () => {
    const wrapper = render()
    expect(wrapper.get('h1').text()).toBe('模型广场')
    expect(wrapper.findAll('table')).toHaveLength(2)
    expect(wrapper.findAllComponents(PlazaGroupSection).map(section => section.props('group').id)).toEqual([2, 1])
    const tables = wrapper.findAll('table')
    expect(tables[0]!.text()).toContain('CNY / 1M token')
    expect(tables[0]!.text()).toContain('¥0.25')
    expect(tables[1]!.text()).toContain('USD / 1M token')
    expect(tables[1]!.text()).toContain('官方原价')
    wrapper.unmount()
  })

  it('combines platform, group, rate and case-insensitive model search and clears search', async () => {
    const wrapper = render()
    const rows = wrapper.findAll('.plaza-filter-row')
    await rows[0]!.findAll('button')[2]!.trigger('click')
    expect(wrapper.findAll('table')).toHaveLength(1)
    await rows[1]!.findAll('button')[1]!.trigger('click')
    await rows[2]!.findAll('button')[2]!.trigger('click')
    await wrapper.get('input[type="search"]').setValue('GPT-BETA')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.get('tbody').text()).toContain('gpt-beta')
    await wrapper.get('button[aria-label="清除"]').trigger('click')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    wrapper.unmount()
  })

  it('uses the user rate for sorting and resets a selected rate removed by refresh', async () => {
    const dedicated = { ...group(1, 'openai', 1, ['gpt-alpha']), user_rate_multiplier: 0.1 }
    const wrapper = render({ description: '', groups: [group(2, 'deepseek', 0.5, ['deepseek-chat']), dedicated] })
    expect(wrapper.findAllComponents(PlazaGroupSection)[0]!.props('group').id).toBe(1)
    await wrapper.findAll('.plaza-filter-row')[2]!.findAll('button')[1]!.trigger('click')
    expect(wrapper.findAll('table')).toHaveLength(1)
    await wrapper.setProps({ response: { description: '', groups: [group(2, 'deepseek', 0.5, ['deepseek-chat'])] } })
    expect(wrapper.findAll('table')).toHaveLength(1)
    expect(wrapper.get('tbody').text()).toContain('deepseek-chat')
    wrapper.unmount()
  })

  it('distinguishes no groups, no search matches and groups with no models', async () => {
    const empty = render({ description: '', groups: [] })
    expect(empty.get('.plaza-empty').text()).toContain('暂无可展示的分组')
    empty.unmount()
    const noModels = render({ description: '', groups: [group(1, 'openai', 1, [])] })
    expect(noModels.text()).toContain('暂未配置模型')
    noModels.unmount()
    const wrapper = render()
    await wrapper.get('input[type="search"]').setValue('does-not-exist')
    expect(wrapper.get('.plaza-empty').text()).toContain('没有匹配的模型')
    wrapper.unmount()
  })

  it('keeps embedded tables without a second page heading or anonymous notice after login', () => {
    auth.isAuthenticated = true
    const wrapper = render(undefined, true)
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.find('.plaza-anonymous').exists()).toBe(false)
    expect(wrapper.findAll('table')).toHaveLength(2)
    wrapper.unmount()
  })
})

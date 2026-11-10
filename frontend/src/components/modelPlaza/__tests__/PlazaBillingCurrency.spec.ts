import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PlazaBillingCurrency from '../PlazaBillingCurrency.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }))
vi.mock('@/api/modelPlaza', () => ({ getPlatformBillingCurrency: mocks.get, updatePlatformBillingCurrency: mocks.update }))
vi.mock('vue-i18n', async () => ({ ...await vi.importActual<typeof import('vue-i18n')>('vue-i18n'), useI18n: () => ({ t: (key: string, params?: Record<string, unknown>) => key + (params ? JSON.stringify(params) : '') }) }))
const policy = (platform = 'deepseek') => ({ platform, currency: 'USD', usd_to_cny: 7 })
beforeEach(() => { mocks.get.mockReset().mockImplementation(async (platform: string) => policy(platform)); mocks.update.mockReset().mockImplementation(async (value) => value) })

describe('platform billing control', () => {
  it('requires a concrete platform and never writes all platforms', async () => {
    const wrapper = mount(PlazaBillingCurrency, { props: { platform: 'all' } })
    await flushPromises()
    expect(mocks.get).not.toHaveBeenCalled()
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.text()).toContain('selectPlatform')
  })

  it('saves the selected platform, currency and rate and refreshes prices', async () => {
    const wrapper = mount(PlazaBillingCurrency, { props: { platform: 'deepseek' } })
    await flushPromises()
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    await wrapper.get('input[value="CNY"]').setValue()
    await wrapper.get('input[type="number"]').setValue('6.8')
    expect(wrapper.text()).toContain('cnyExample')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith({ platform: 'deepseek', currency: 'CNY', usd_to_cny: 6.8, deepseek_peak_enabled: false })
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.get('[role="status"]').text()).toContain('"currency":"CNY"')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })

  it('rejects empty or invalid rates and keeps edits after failed save', async () => {
    const wrapper = mount(PlazaBillingCurrency, { props: { platform: 'openai' } })
    await flushPromises()
    await wrapper.get('input[value="CNY"]').setValue()
    for (const value of ['', '0', '-1', '101']) {
      await wrapper.get('input[type="number"]').setValue(value)
      expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    }
    await wrapper.get('input[type="number"]').setValue('7')
    mocks.update.mockRejectedValue(new Error('offline'))
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('saveFailed')
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
  })

  it('ignores a stale response after switching platform', async () => {
    let resolve!: (value: ReturnType<typeof policy>) => void
    mocks.get.mockImplementationOnce(() => new Promise((r) => { resolve = r }))
    const wrapper = mount(PlazaBillingCurrency, { props: { platform: 'deepseek' } })
    await wrapper.setProps({ platform: 'openai' })
    await flushPromises()
    resolve({ ...policy('deepseek'), usd_to_cny: 9 })
    await flushPromises()
    await wrapper.get('input[value="CNY"]').setValue()
    expect((wrapper.get('input[type="number"]').element as HTMLInputElement).value).toBe('7')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(mocks.update).toHaveBeenCalledWith({ platform: 'openai', currency: 'CNY', usd_to_cny: 7 })
  })

  it('prevents duplicate submission and a late save from changing a new platform', async () => {
    let resolve!: (value: ReturnType<typeof policy>) => void
    mocks.update.mockImplementation(() => new Promise((r) => { resolve = r }))
    const wrapper = mount(PlazaBillingCurrency, { props: { platform: 'deepseek' } })
    await flushPromises()
    await wrapper.get('input[value="CNY"]').setValue()
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ platform: 'openai' })
    await flushPromises()
    resolve(policy())
    await flushPromises()
    expect(wrapper.text()).not.toContain('currency.saved')
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(mocks.update).toHaveBeenCalledTimes(1)
  })
})

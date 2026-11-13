import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PlazaPrice from '../PlazaPrice.vue'

describe('PlazaPrice', () => {
  it.each([
    [0.3773529282e-6, '$0.3774', '$0.3773529282'],
    [0.05660293923e-6, '$0.0566', '$0.05660293923'],
    [0.0000000123456e-6, '$1.235e-8', '$1.23456e-8'],
    [0.00000123456e-6, '$0.000001235', '$0.00000123456']
  ])('shortens %s without losing the full quote', (value, display, full) => {
    const wrapper = mount(PlazaPrice, { props: { value } })
    expect(wrapper.text()).toBe(display)
    expect(wrapper.get('span').attributes('title')).toBe(full)
    expect(wrapper.get('span').attributes('aria-label')).toBe(full)
  })

  it.each([
    [null, '-'], [undefined, '-'], [0, '$0.00'], [1.4e-6, '$1.40'], [0.0832e-6, '$0.0832']
  ])('retains ordinary prices for %s', (value, display) => {
    const wrapper = mount(PlazaPrice, { props: { value } })
    expect(wrapper.text()).toBe(display)
    expect(wrapper.get('span').attributes('title')).toBeUndefined()
  })

  it('uses the selected currency and per-request scale', () => {
    const wrapper = mount(PlazaPrice, { props: { value: 0.123456, scale: 1, currency: 'CNY' } })
    expect(wrapper.text()).toBe('¥0.1235')
    expect(wrapper.get('span').attributes('title')).toBe('¥0.123456')
  })
})

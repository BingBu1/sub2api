import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import PublicContactDialog from '../PublicContactDialog.vue'
import zh from '@/i18n/locales/zh'

function render(contactInfo = '') {
  return mount(PublicContactDialog, {
    props: { siteName: '迅奇', contactInfo },
    global: { plugins: [createPinia(), createI18n({ legacy: false, locale: 'zh', messages: { zh } })] }
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('public contact details', () => {
  it('displays each contact separately, copies only its value and reflects updated settings', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('isSecureContext', true)
    const details = '微信：Bzhuzhi\r\n\nQQ：3755821761'
    const wrapper = render(details)
    expect(wrapper.findAll('.contact-label').map(label => label.text())).toEqual(['微信', 'QQ'])
    expect(wrapper.findAll('.contact-value').map(value => value.text())).toEqual(['Bzhuzhi', '3755821761'])
    await wrapper.findAll('.contact-copy')[0]!.trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenLastCalledWith('Bzhuzhi')
    expect(wrapper.get('[role="status"]').text()).toBe('已复制')
    await wrapper.findAll('.contact-copy')[1]!.trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenLastCalledWith('3755821761')
    expect(wrapper.findAll('.contact-copy')[0]!.text()).toBe('复制')
    expect(wrapper.findAll('.contact-copy')[1]!.text()).toBe('已复制')
    await wrapper.setProps({ contactInfo: '新的客服联系方式' })
    expect(wrapper.get('.contact-value').text()).toBe('新的客服联系方式')
    wrapper.unmount()
  })

  it('keeps plain text intact and supports labeled web links', () => {
    const wrapper = render('客服请在工作时间联系\nEmail: support@example.com\nTelegram: https://example.com/support')
    expect(wrapper.findAll('.contact-value').map(value => value.text())).toEqual([
      '客服请在工作时间联系', 'support@example.com', 'https://example.com/support'
    ])
    expect(wrapper.get('.contact-open').attributes('href')).toBe('https://example.com/support')
    wrapper.unmount()
  })

  it('provides a safe link only for a configured HTTP or HTTPS address', async () => {
    const wrapper = render('https://example.com/contact')
    expect(wrapper.get('.contact-open').attributes('href')).toBe('https://example.com/contact')
    expect(wrapper.get('.contact-open').attributes('rel')).toBe('noopener noreferrer')
    await wrapper.setProps({ contactInfo: 'javascript:alert(1)' })
    expect(wrapper.find('.contact-open').exists()).toBe(false)
    expect(wrapper.get('.contact-value').text()).toBe('javascript:alert(1)')
    wrapper.unmount()
  })

  it('shows an informative empty state without a copy action', () => {
    const wrapper = render('  ')
    expect(wrapper.get('.contact-empty').text()).toContain('暂未配置')
    expect(wrapper.find('.contact-copy').exists()).toBe(false)
    wrapper.unmount()
  })
})

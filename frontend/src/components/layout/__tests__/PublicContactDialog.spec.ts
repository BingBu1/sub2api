import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import PublicContactDialog from '../PublicContactDialog.vue'
import zh from '@/i18n/locales/zh'

function render(contactInfo = '') {
  return mount(PublicContactDialog, {
    props: { siteName: '迅奇', contactInfo },
    global: { plugins: [createPinia(), createI18n({ legacy: false, locale: 'zh', messages: { zh } })] }
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('public contact details', () => {
  it('displays and copies the complete configured text and reflects updated settings', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('isSecureContext', true)
    const details = '微信：Bzhuzhi QQ：3755821761（工作时间联系）'
    const wrapper = render(details)
    expect(wrapper.findAll('.contact-account')).toHaveLength(1)
    expect(wrapper.get('.contact-value').element.textContent).toBe(details)
    expect(wrapper.findAll('.contact-copy')).toHaveLength(1)
    await wrapper.get('.contact-copy').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenLastCalledWith(details)
    expect(wrapper.get('[role="status"]').text()).toBe('已复制到剪贴板')
    expect(wrapper.get('.contact-copy').text()).toBe('已复制，去联系')
    await wrapper.setProps({ contactInfo: '新的客服联系方式' })
    expect(wrapper.get('.contact-value').text()).toBe('新的客服联系方式')
    expect(wrapper.get('.contact-copy').text()).toBe('复制联系方式')
    wrapper.unmount()
  })

  it('keeps existing multiline content together in one text block and copies it intact', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('isSecureContext', true)
    const details = '微信：Bzhuzhi\r\nQQ：3755821761'
    const wrapper = render(details)
    expect(wrapper.findAll('.contact-account')).toHaveLength(1)
    expect(wrapper.get('.contact-value').element.textContent).toBe(details)
    await wrapper.get('.contact-copy').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(details)
    expect(wrapper.find('.contact-open').exists()).toBe(false)
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

  it('resets copy feedback after three seconds and whenever the dialog closes or opens', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    vi.stubGlobal('isSecureContext', true)
    const wrapper = render('QQ：3755821761')
    const dialog = wrapper.get('dialog').element
    Object.defineProperty(dialog, 'showModal', { value: vi.fn() })
    await wrapper.get('.contact-copy').trigger('click')
    await flushPromises()
    expect(wrapper.get('.contact-copy').classes()).toContain('is-copied')
    await vi.advanceTimersByTimeAsync(3000)
    expect(wrapper.get('.contact-copy').text()).toBe('复制联系方式')
    await wrapper.get('.contact-copy').trigger('click')
    await flushPromises()
    await wrapper.get('dialog').trigger('close')
    expect(wrapper.get('[role="status"]').text()).toBe('复制联系方式，期待收到你的消息。')
    await wrapper.get('.contact-copy').trigger('click')
    await flushPromises()
    wrapper.vm.open()
    await nextTick()
    expect(dialog.showModal).toHaveBeenCalledOnce()
    expect(wrapper.get('.contact-copy').classes()).not.toContain('is-copied')
    wrapper.unmount()
  })

  it('shows a manual-copy hint when both clipboard methods fail', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    vi.stubGlobal('isSecureContext', true)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) })
    const wrapper = render('QQ：3755821761')
    await wrapper.get('.contact-copy').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('手动复制')
    expect(wrapper.get('[role="status"]').classes()).toContain('is-error')
    expect(wrapper.get('.contact-copy').classes()).not.toContain('is-copied')
    expect(wrapper.get('.contact-copy').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
    Reflect.deleteProperty(document, 'execCommand')
  })

  it('prevents duplicate copies and ignores a result completed after closing', async () => {
    let finishCopy!: () => void
    const writeText = vi.fn(() => new Promise<void>(resolve => { finishCopy = resolve }))
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal('isSecureContext', true)
    const wrapper = render('QQ：3755821761')
    await wrapper.get('.contact-copy').trigger('click')
    expect(wrapper.get('.contact-copy').attributes('disabled')).toBeDefined()
    await wrapper.get('.contact-copy').trigger('click')
    expect(writeText).toHaveBeenCalledOnce()
    await wrapper.get('dialog').trigger('close')
    finishCopy()
    await flushPromises()
    expect(wrapper.get('.contact-copy').classes()).not.toContain('is-copied')
    expect(wrapper.get('[role="status"]').text()).toBe('复制联系方式，期待收到你的消息。')
    wrapper.unmount()
  })
})

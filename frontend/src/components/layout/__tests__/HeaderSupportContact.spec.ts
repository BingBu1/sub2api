import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import HeaderSupportContact from '../HeaderSupportContact.vue'
import zh from '@/i18n/locales/zh'

const { copyToClipboard } = vi.hoisted(() => ({ copyToClipboard: vi.fn().mockResolvedValue(true) }))
vi.mock('@/composables/useClipboard', async () => {
  const { ref } = await import('vue')
  return { useClipboard: () => ({ copied: ref(false), copyToClipboard }) }
})

const mounted: ReturnType<typeof mount>[] = []
function render(contactInfo: string) {
  const wrapper = mount(HeaderSupportContact, {
    props: { contactInfo, siteName: '迅奇（ZipKiwi）' },
    global: { plugins: [createI18n({ legacy: false, locale: 'zh', messages: { zh } })] }
  })
  mounted.push(wrapper)
  return wrapper
}
afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()); vi.clearAllMocks() })

describe('header dedicated support', () => {
  it('displays and copies the configured content intact', async () => {
    const details = '微信：Bzhuzhi QQ：3755821761'
    const wrapper = render(details)
    expect(wrapper.get('.header-support-text').text()).toContain('专属客服')
    expect(wrapper.get('.header-support-text strong').text()).toBe(details)
    await wrapper.get('.header-support-copy').trigger('click')
    expect(copyToClipboard).toHaveBeenCalledWith(details)
  })

  it('opens the shared contact dialog from the support entry', async () => {
    const wrapper = render('我的客服内容')
    const dialog = wrapper.get('dialog').element as HTMLDialogElement
    dialog.showModal = vi.fn()
    await wrapper.get('button[aria-label="专属客服"]').trigger('click')
    expect(dialog.showModal).toHaveBeenCalledOnce()
    expect(wrapper.get('.contact-value').text()).toBe('我的客服内容')
  })

  it('uses updated settings for display and copy and hides an empty contact', async () => {
    const wrapper = render('旧的联系方式')
    await wrapper.setProps({ contactInfo: '新的内容，保持完整' })
    await wrapper.get('.header-support-copy').trigger('click')
    expect(copyToClipboard).toHaveBeenLastCalledWith('新的内容，保持完整')
    await wrapper.setProps({ contactInfo: '  ' })
    expect(wrapper.find('.header-support').exists()).toBe(false)
  })
})

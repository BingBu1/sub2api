import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ModelPlazaContent from '../ModelPlazaContent.vue'
import PlazaModelCard from '../PlazaModelCard.vue'
import PlazaGroupSection from '../PlazaGroupSection.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import type { ModelPlazaGroup, PlazaModel } from '@/api/modelPlaza'
import zh from '@/i18n/locales/zh'

vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ isAuthenticated: true }) }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ cachedPublicSettings: null }) }))
vi.mock('@/composables/useClipboard', async () => {
  const { ref } = await import('vue')
  return { useClipboard: () => ({ copied: ref(false), copyToClipboard: vi.fn() }) }
})

const models: PlazaModel[] = ['model-a', 'model-b'].map(name => ({ name, platform: 'openai', pricing: null, official_pricing: null }))
const group: ModelPlazaGroup = {
  id: 1, name: '常用分组', description: '', platform: 'openai', subscription_type: 'standard',
  rate_multiplier: 0.5, peak_rate_enabled: false, peak_start: '', peak_end: '', peak_rate_multiplier: 1,
  is_exclusive: false, image_rate_independent: false, image_rate_multiplier: 1,
  video_rate_independent: false, video_rate_multiplier: 1, long_context_pricing_enabled: true, models
}
const mounted: ReturnType<typeof mount>[] = []
function render(embedded = false) {
  const wrapper = mount(ModelPlazaContent, {
    attachTo: document.body,
    props: { response: { description: '', groups: [group] }, loading: false, embedded },
    global: { plugins: [createI18n({ legacy: false, locale: 'zh', messages: { zh } })], stubs: { Icon: true, PlatformIcon: true, GroupBadge: true } }
  })
  mounted.push(wrapper)
  return wrapper
}
afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()) })

describe('model plaza catalog', () => {
  it.each([false, true])('starts with readable model cards when embedded=%s', embedded => {
    const wrapper = render(embedded)
    expect(wrapper.findAllComponents(PlazaModelCard)).toHaveLength(2)
    expect(wrapper.get('.plaza-results-summary').text()).toContain('2 个模型报价')
  })

  it('opens the selected model in a dialog and keeps the search and card view', async () => {
    const wrapper = render()
    await wrapper.get('input[type="search"]').setValue('model-a')
    await wrapper.get('.plaza-card-bottom button').trigger('click')
    const dialog = wrapper.getComponent(BaseDialog)
    expect(dialog.props('show')).toBe(true)
    expect(dialog.getComponent(PlazaGroupSection).props('group').models.map(model => model.name)).toEqual(['model-a'])
    expect(wrapper.findAllComponents(PlazaModelCard)).toHaveLength(1)
    dialog.vm.$emit('close')
    await wrapper.vm.$nextTick()
    expect(dialog.props('show')).toBe(false)
    expect(wrapper.get<HTMLInputElement>('input[type="search"]').element.value).toBe('model-a')
  })

  it('keeps the detailed price list available without losing filters', async () => {
    const wrapper = render()
    await wrapper.get('input[type="search"]').setValue('model-b')
    await wrapper.findAll('.plaza-view-switch button')[1].trigger('click')
    const section = wrapper.getComponent(PlazaGroupSection)
    expect(section.props('group').models.map(model => model.name)).toEqual(['model-b'])
    expect(section.get('.plaza-reference-toggle').attributes('aria-pressed')).toBe('false')
  })
})

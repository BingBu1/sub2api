import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import UsageConnections from '../UsageConnections.vue'
import type { ConnectionTrace } from '@/api/admin/usageConnections'
import en from '@/i18n/locales/en'
const list = vi.hoisted(() => vi.fn())
vi.mock('@/api/admin/usageConnections', () => ({ listConnections: list }))
function render(filters = {}) {
  return mount(UsageConnections, { props: { filters, refreshKey: 0 }, global: { plugins: [createI18n({ legacy: false, locale: 'en', messages: { en } })], stubs: { OpsErrorDetailModal: true, BaseDialog: { props: ['show'], template: '<div v-if="show"><slot /></div>' }, DataTable: { props: ['data'], template: '<div><div v-for="row in data" :key="row.trace_id"><slot name="cell-state" :row="row" /><slot name="cell-user" :row="row" /><slot name="cell-actions" :row="row" /></div></div>' } } } })
}
const edge = { trace_id: 'edge-id', source: 'nginx', state: 'edge_failed', user_id: 0, api_key_id: 0, host: 'relay.example.com', path: '/v1/responses', detail: { status: 502, version: 1, events: {}, attempts: [] } } as unknown as ConnectionTrace
beforeEach(() => list.mockReset().mockResolvedValue({ items: [edge], has_more: false }))
describe('connection diagnostics', () => {
  it('queries by shared user filters and retains unidentified edge entries', async () => {
    const wrapper = render({ user_id: 7, model: 'example-model' })
    await flushPromises()
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ user_id: 7, model: 'example-model', page: 1, source: 'all' }), expect.anything())
    expect(wrapper.text()).toContain('Unidentified user')
    expect(wrapper.text()).toContain('Edge failure')
    expect(wrapper.text()).not.toContain('Client received')
  })
  it('refreshes without retaining stale rows after a failed query', async () => {
    const wrapper = render()
    await flushPromises()
    expect(wrapper.text()).toContain('Edge failure')
    list.mockRejectedValueOnce(new Error('offline'))
    await wrapper.setProps({ refreshKey: 1 })
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Edge failureHTTP')
    expect(wrapper.findAll('button').find(button => button.text() === 'Connection details')).toBeUndefined()
  })
  it('aborts an old query when shared filters change', async () => {
    let firstSignal: AbortSignal | undefined
    list.mockImplementationOnce((_: unknown, signal: AbortSignal) => { firstSignal = signal; return new Promise(() => {}) })
    const wrapper = render({ user_id: 7 })
    await wrapper.setProps({ filters: { user_id: 8 } })
    await flushPromises()
    expect(firstSignal?.aborted).toBe(true)
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ user_id: 8 }), expect.anything())
    wrapper.unmount()
  })
})

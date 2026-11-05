import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import TutorialDocsView from '../TutorialDocsView.vue'
import zh from '@/i18n/locales/zh'
import en from '@/i18n/locales/en'
import { tutorialContent, tutorialSearchText } from '@/components/tutorialDocs/tutorialContent'
import { tutorialEndpoints, tutorialExamples } from '@/components/tutorialDocs/tutorialExamples'

const { appStore } = vi.hoisted(() => ({ appStore: { apiBaseUrl: '', cachedPublicSettings: { api_base_url: 'https://zipkiwi.example/v1/' }, fetchPublicSettings: vi.fn() } }))
vi.mock('@/stores/app', () => ({ useAppStore: () => appStore }))

async function render(path = '/tutorials', locale = 'zh') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tutorials', component: TutorialDocsView }, { path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(TutorialDocsView, { global: { plugins: [router, createI18n({ legacy: false, locale, messages: { zh, en } })], stubs: { PublicSiteHeader: true } } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  appStore.fetchPublicSettings.mockClear()
  appStore.cachedPublicSettings = { api_base_url: 'https://zipkiwi.example/v1/' }
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('tutorial document center', () => {
  it('renders a grouped directory and switches articles through shareable URLs', async () => {
    const { wrapper, router } = await render()
    expect(wrapper.get('h1').text()).toBe('快速开始')
    expect(wrapper.findAll('.docs-nav-group')).toHaveLength(6)
    expect(wrapper.findAll('.docs-nav-group > a')).toHaveLength(24)
    await wrapper.get('.docs-nav-group a[href="/tutorials?guide=codex"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.guide).toBe('codex')
    expect(wrapper.get('h1').text()).toBe('Codex')
    expect(wrapper.get('pre').text()).toContain('base_url = "https://zipkiwi.example/v1"')
    expect(wrapper.get('.docs-nav-group [aria-current="page"]').text()).toBe('Codex')
    wrapper.unmount()
  })

  it('searches article bodies and handles no results and clearing', async () => {
    const { wrapper } = await render()
    await wrapper.get('input[type="search"]').setValue('429')
    expect(wrapper.find('.docs-nav-group a[href="/tutorials?guide=errors"]').exists()).toBe(true)
    await wrapper.get('input[type="search"]').setValue('nothing-matches-123456')
    expect(wrapper.get('.docs-no-results').text()).toContain('没有找到相关文档')
    await wrapper.get('.docs-no-results button').trigger('click')
    expect(wrapper.findAll('.docs-nav-group > a')).toHaveLength(24)
    wrapper.unmount()
  })

  it('switches shell commands, copies exact code, and reports clipboard failure', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const { wrapper } = await render('/tutorials?guide=claude-code')
    expect(wrapper.get('pre').text()).toContain('$env:ANTHROPIC_BASE_URL')
    await wrapper.findAll('.tutorial-segmented button')[1]!.trigger('click')
    expect(wrapper.get('pre').text()).toContain('export ANTHROPIC_BASE_URL')
    await wrapper.get('.tutorial-code-toolbar button').trigger('click')
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('export ANTHROPIC_BASE_URL'))
    writeText.mockRejectedValueOnce(new Error('denied'))
    await wrapper.get('.tutorial-code-toolbar button').trigger('click')
    await flushPromises()
    expect(wrapper.get('.tutorial-copy-error').text()).toContain('复制失败')
    wrapper.unmount()
  })

  it('supports the mobile directory, unknown articles, and legacy article links', async () => {
    const { wrapper } = await render('/tutorials?guide=missing')
    expect(wrapper.get('.docs-note[role="status"]').text()).toContain('暂不存在')
    await wrapper.get('.docs-mobile-bar button').trigger('click')
    expect(wrapper.get('.docs-sidebar').classes()).toContain('is-open')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(wrapper.get('.docs-sidebar').classes()).not.toContain('is-open')
    wrapper.unmount()
    const legacy = await render('/tutorials#codex')
    expect(legacy.router.currentRoute.value.query.guide).toBe('codex')
    expect(legacy.wrapper.get('h1').text()).toBe('Codex')
    legacy.wrapper.unmount()
  })

  it('provides English articles and safe external reference links', async () => {
    const { wrapper } = await render('/tutorials?guide=workbuddy', 'en')
    expect(wrapper.text()).toContain('Add a custom model')
    for (const link of wrapper.findAll('a[target="_blank"]')) expect(link.attributes('rel')).toBe('noopener noreferrer')
    wrapper.unmount()
  })
})

describe('tutorial content and generated examples', () => {
  it('normalizes configured URLs and quotes them safely for each format', () => {
    expect(tutorialEndpoints('https://example.com/v1/', 'https://fallback.test')).toEqual({ root: 'https://example.com', api: 'https://example.com/v1' })
    expect(tutorialEndpoints('javascript:alert(1)', 'https://fallback.test')).toEqual({ root: 'https://fallback.test', api: 'https://fallback.test/v1' })
    expect(tutorialEndpoints('https://user:secret@example.com/v1?key=private#x', 'https://fallback.test').root).toBe('https://example.com')
    const examples = tutorialExamples("https://example.com/a'b", "https://example.com/a'b/v1", 'powershell')
    expect(examples.models).toContain("'https://example.com/a''b/v1/models'")
    expect(JSON.parse(examples.opencode).provider.zipkiwi.options.baseURL).toBe("https://example.com/a'b/v1")
    expect(tutorialExamples('https://example.com', 'https://example.com/v1', 'bash').responses).toContain('curl')
  })

  it('keeps all translated article links and section identifiers valid', () => {
    for (const locale of ['zh', 'en']) {
      const articles = tutorialContent(locale, 'https://zipkiwi.example', 'https://zipkiwi.example/v1', 'bash')
      const ids = articles.map(article => article.id)
      expect(new Set(ids).size).toBe(24)
      for (const article of articles) {
        expect(new Set(article.sections.map(section => section.id)).size).toBe(article.sections.length)
        expect(tutorialSearchText(article)).not.toMatch(/yoshub|api2\.yoshub/)
        for (const section of article.sections) for (const block of section.blocks) {
          if (block.type !== 'links') continue
          for (const link of block.items) {
            const destination = new URL(link.href, 'https://zipkiwi.example')
            const guide = destination.searchParams.get('guide')
            if (destination.pathname === '/tutorials' && guide) expect(ids).toContain(guide)
          }
        }
      }
    }
  })
})

<template>
  <div class="tutorial-page">
    <PublicSiteHeader />
    <a class="docs-skip-link" href="#docs-article">{{ t('tutorials.skipToArticle') }}</a>
    <div class="docs-toolbar">
      <div class="docs-toolbar-inner">
        <RouterLink class="docs-name" to="/tutorials"><Icon name="document" size="md" /><strong>{{ t('tutorials.pageTitle') }}</strong></RouterLink>
        <div class="docs-search">
          <Icon name="search" size="sm" />
          <input ref="searchInput" v-model="search" type="search" :aria-label="t('tutorials.searchLabel')" :placeholder="t('tutorials.searchPlaceholder')" aria-controls="docs-navigation" @input="sidebarOpen = true" @keydown.esc="clearSearch" />
          <button v-if="search" type="button" :aria-label="t('tutorials.clearSearch')" @click="clearSearch"><Icon name="x" size="sm" /></button><kbd v-else aria-hidden="true">/</kbd>
        </div>
        <RouterLink class="docs-console-link" to="/keys">{{ t('tutorials.createKey') }}<Icon name="arrowRight" size="sm" /></RouterLink>
      </div>
    </div>
    <div class="docs-mobile-bar"><button ref="sidebarToggle" type="button" aria-controls="docs-navigation" :aria-expanded="sidebarOpen" @click="sidebarOpen = !sidebarOpen"><Icon :name="sidebarOpen ? 'x' : 'menu'" size="sm" />{{ t(sidebarOpen ? 'tutorials.closeDirectory' : 'tutorials.openDirectory') }}</button><span>{{ article.title }}</span></div>
    <div class="docs-layout">
      <aside class="docs-sidebar" :class="{ 'is-open': sidebarOpen }">
        <nav id="docs-navigation" :aria-label="t('tutorials.directory')">
          <p v-if="search.trim()" class="docs-search-count" role="status">{{ t('tutorials.searchCount', { count: filteredArticles.length }) }}</p>
          <div v-if="!filteredArticles.length" class="docs-no-results"><Icon name="search" size="lg" /><strong>{{ t('tutorials.noResults') }}</strong><p>{{ t('tutorials.tryAnotherSearch') }}</p><button type="button" @click="clearSearch">{{ t('tutorials.clearSearch') }}</button></div>
          <details v-for="group in visibleGroups" :key="`${group.id}-${search.trim() ? 'search' : 'all'}`" class="docs-nav-group" open>
            <summary>{{ t(`tutorials.groups.${group.id}`) }}<Icon name="chevronDown" size="xs" /></summary>
            <RouterLink v-for="item in group.articles" :key="item.id" :to="articleLocation(item.id)" :aria-current="article.id === item.id ? 'page' : undefined" @click="selectArticle"><span>{{ item.title }}</span><Icon v-if="article.id === item.id" name="chevronRight" size="xs" /></RouterLink>
          </details>
          <div class="docs-sidebar-footer"><span>{{ t('tutorials.needHelp') }}</span><RouterLink :to="articleLocation('support')" @click="selectArticle">{{ t('tutorials.contactSupport') }}<Icon name="arrowRight" size="xs" /></RouterLink></div>
        </nav>
      </aside>
      <main id="docs-article" ref="articleElement" class="docs-article" tabindex="-1">
        <header class="docs-article-header">
          <p class="docs-breadcrumb"><RouterLink to="/tutorials">{{ t('tutorials.pageTitle') }}</RouterLink><Icon name="chevronRight" size="xs" /><span>{{ t(`tutorials.groups.${article.group}`) }}</span></p>
          <h1 ref="articleHeading" tabindex="-1">{{ article.title }}</h1><p class="docs-description">{{ article.description }}</p>
          <div class="docs-article-meta"><span><Icon name="checkCircle" size="xs" />{{ t('tutorials.userGuide') }}</span><span>{{ t('tutorials.updated') }}</span></div>
        </header>
        <p v-if="unknownArticle" class="docs-note" role="status"><Icon name="infoCircle" size="sm" /><span>{{ t('tutorials.unknownArticle') }}</span></p>
        <div v-if="article.shell" class="docs-environment"><span>{{ t('tutorials.commandEnvironment') }}</span><div class="tutorial-segmented" role="group" :aria-label="t('tutorials.commandEnvironment')"><button type="button" :aria-pressed="shell === 'powershell'" @click="shell = 'powershell'">Windows PowerShell</button><button type="button" :aria-pressed="shell === 'bash'" @click="shell = 'bash'">macOS / Linux</button></div></div>
        <details class="docs-mobile-toc"><summary>{{ t('tutorials.onThisPage') }}<Icon name="chevronDown" size="sm" /></summary><RouterLink v-for="section in article.sections" :key="section.id" :to="sectionLocation(section.id)">{{ section.title }}</RouterLink></details>
        <section v-for="section in article.sections" :id="section.id" :key="`${article.id}-${section.id}`" class="docs-section">
          <h2><RouterLink :to="sectionLocation(section.id)">{{ section.title }}<span aria-hidden="true">#</span></RouterLink></h2>
          <template v-for="(block, index) in section.blocks" :key="index">
            <p v-if="block.type === 'paragraph'">{{ block.text }}</p>
            <component :is="block.ordered ? 'ol' : 'ul'" v-else-if="block.type === 'list'" class="docs-list"><li v-for="item in block.items" :key="item">{{ item }}</li></component>
            <TutorialCodeBlock v-else-if="block.type === 'code'" :key="block.code" :label="block.label" :code="block.code" />
            <div v-else-if="block.type === 'note'" class="docs-note"><Icon name="infoCircle" size="sm" /><p>{{ block.text }}</p></div>
            <div v-else-if="block.type === 'table'" class="tutorial-table-wrap" tabindex="0" role="region" :aria-label="section.title"><table><thead><tr><th v-for="header in block.headers" :key="header" scope="col">{{ header }}</th></tr></thead><tbody><tr v-for="(row, rowIndex) in block.rows" :key="rowIndex"><td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td></tr></tbody></table></div>
            <div v-else-if="block.type === 'links'" class="docs-related-links"><template v-for="link in block.items" :key="link.href"><RouterLink v-if="link.href.startsWith('/')" :to="link.href">{{ link.label }}<Icon name="arrowRight" size="xs" /></RouterLink><a v-else :href="link.href" target="_blank" rel="noopener noreferrer">{{ link.label }}<Icon name="externalLink" size="xs" /></a></template></div>
          </template>
        </section>
        <footer class="docs-article-footer">
          <div v-if="article.sources?.length" class="docs-sources"><span>{{ t('tutorials.officialSources') }}</span><a v-for="item in article.sources" :key="item.href" :href="item.href" target="_blank" rel="noopener noreferrer">{{ item.label }}<Icon name="externalLink" size="xs" /></a></div>
          <p class="docs-live-note">{{ t('tutorials.liveInfo') }}</p>
          <nav class="docs-pagination" :aria-label="t('tutorials.articleNavigation')"><RouterLink v-if="previousArticle" :to="articleLocation(previousArticle.id)"><Icon name="arrowLeft" size="sm" /><span><small>{{ t('tutorials.previous') }}</small><strong>{{ previousArticle.title }}</strong></span></RouterLink><RouterLink v-if="nextArticle" class="docs-next" :to="articleLocation(nextArticle.id)"><span><small>{{ t('tutorials.next') }}</small><strong>{{ nextArticle.title }}</strong></span><Icon name="arrowRight" size="sm" /></RouterLink></nav>
        </footer>
      </main>
      <aside class="docs-toc"><nav :aria-label="t('tutorials.onThisPage')"><strong>{{ t('tutorials.onThisPage') }}</strong><RouterLink v-for="section in article.sections" :key="section.id" :to="sectionLocation(section.id)" :aria-current="currentSection === section.id ? 'location' : undefined">{{ section.title }}</RouterLink></nav><div class="docs-toc-help"><Icon name="key" size="md" /><strong>{{ t('tutorials.readyToConnect') }}</strong><p>{{ t('tutorials.keyHint') }}</p><RouterLink to="/keys">{{ t('tutorials.createKey') }}<Icon name="arrowRight" size="xs" /></RouterLink></div></aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import Icon from '@/components/icons/Icon.vue'
import PublicSiteHeader from '@/components/layout/PublicSiteHeader.vue'
import TutorialCodeBlock from '@/components/tutorialDocs/TutorialCodeBlock.vue'
import { tutorialContent, tutorialSearchText, type TutorialGroup } from '@/components/tutorialDocs/tutorialContent'
import { tutorialEndpoints, type TutorialShell } from '@/components/tutorialDocs/tutorialExamples'

const { t, locale } = useI18n()
const appStore = useAppStore()
const route = useRoute()
const router = useRouter()
const shell = ref<TutorialShell>('powershell')
const search = ref('')
const sidebarOpen = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const sidebarToggle = ref<HTMLButtonElement | null>(null)
const articleElement = ref<HTMLElement | null>(null)
const articleHeading = ref<HTMLHeadingElement | null>(null)
const currentSection = ref('')
const groupIds: TutorialGroup[] = ['start', 'agents', 'apps', 'api', 'advanced', 'help']
const endpoints = computed(() => tutorialEndpoints(appStore.cachedPublicSettings?.api_base_url || appStore.apiBaseUrl || '', window.location.origin))
const articles = computed(() => tutorialContent(locale.value, endpoints.value.root, endpoints.value.api, shell.value))
const requestedId = computed(() => typeof route.query.guide === 'string' ? route.query.guide : 'quickstart')
const article = computed(() => articles.value.find(item => item.id === requestedId.value) || articles.value[0]!)
const unknownArticle = computed(() => requestedId.value !== article.value.id)
const articleIndex = computed(() => articles.value.findIndex(item => item.id === article.value.id))
const previousArticle = computed(() => articles.value[articleIndex.value - 1])
const nextArticle = computed(() => articles.value[articleIndex.value + 1])
const filteredArticles = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  if (!query) return articles.value
  const terms = query.split(/\s+/)
  return articles.value.filter(item => { const text = tutorialSearchText(item); return terms.every(term => text.includes(term)) })
})
const visibleGroups = computed(() => groupIds.map(id => ({ id, articles: filteredArticles.value.filter(item => item.group === id) })).filter(group => group.articles.length))
function articleLocation(id: string) { return { path: '/tutorials', query: id === 'quickstart' ? {} : { guide: id } } }
function sectionLocation(id: string) { return { ...articleLocation(article.value.id), hash: `#${id}` } }
function clearSearch() { search.value = ''; searchInput.value?.focus() }
function selectArticle() { sidebarOpen.value = false; search.value = '' }
function onKeydown(event: KeyboardEvent) {
  const target = event.target
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !(target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select')))) { event.preventDefault(); searchInput.value?.focus() }
  if (event.key === 'Escape' && sidebarOpen.value) { sidebarOpen.value = false; sidebarToggle.value?.focus() }
}
function updateCurrentSection() {
  let active = article.value.sections[0]?.id || ''
  articleElement.value?.querySelectorAll<HTMLElement>('.docs-section').forEach(section => { if (section.getBoundingClientRect().top <= 180) active = section.id })
  currentSection.value = active
}
let scrollFrame = 0
function onScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; updateCurrentSection() }) }
watch(() => article.value.id, async () => { selectArticle(); await nextTick(); articleHeading.value?.focus({ preventScroll: true }); updateCurrentSection() })
onMounted(async () => {
  void appStore.fetchPublicSettings()
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onScroll, { passive: true })
  const legacy: Record<string, string> = { prepare: 'quickstart', choose: 'quickstart', verify: 'errors', codex: 'codex', 'claude-code': 'claude-code', 'cc-switch': 'cc-switch', opencode: 'opencode' }
  const legacyGuide = legacy[route.hash.slice(1)]
  if (!route.query.guide && legacyGuide) await router.replace(articleLocation(legacyGuide))
  updateCurrentSection()
})
onBeforeUnmount(() => { document.removeEventListener('keydown', onKeydown); window.removeEventListener('scroll', onScroll); if (scrollFrame) cancelAnimationFrame(scrollFrame) })
</script>

<style src="@/components/tutorialDocs/tutorial-docs.css"></style>

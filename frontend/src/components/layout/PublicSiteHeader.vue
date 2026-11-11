<template>
  <PublicHeader
    ref="header"
    :site-name="siteName"
    :site-logo="siteLogo"
    :destination="destination"
    :is-dark="isDark"
    :show-model-plaza="showModelPlaza"
    :show-chapters="showChapters"
    :home="isHome"
    :active-chapter="activeChapter"
    :page-progress="pageProgress"
    :model-plaza="route.path === '/model-plaza'"
    :tutorial-docs="route.path === '/tutorials'"
    :contact-info="appStore.cachedPublicSettings?.contact_info || appStore.contactInfo"
    @toggle-theme="toggleTheme"
    @open-contact="appStore.fetchPublicSettings(true)"
    @click="onAnchorClick"
  />
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { sanitizeUrl } from '@/utils/url'
import { FeatureFlags, isFeatureFlagEnabled } from '@/utils/featureFlags'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import PublicHeader from '@/components/layout/PublicHeader.vue'
import { publicChapters } from './publicNavigation'
import { usePublicSite } from './publicSiteContext'
const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()
const settings = computed(() => appStore.cachedPublicSettings)
const siteName = computed(() => settings.value?.site_name || appStore.siteName || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(settings.value?.site_logo || appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const destination = computed(() => authStore.isAuthenticated ? (authStore.isAdmin ? '/admin/dashboard' : '/dashboard') : '/login')
const showModelPlaza = computed(() => isFeatureFlagEnabled(FeatureFlags.modelPlaza) && (authStore.isAuthenticated || settings.value?.model_plaza_require_auth !== true))
const showChapters = computed(() => !settings.value?.compact_home_enabled && !settings.value?.home_content?.trim())
const { isDark, toggleTheme } = usePublicSite()
const header = ref<InstanceType<typeof PublicHeader> | null>(null)
const isHome = computed(() => route.name === 'Home')
const activeChapter = ref('')
const pageProgress = ref(0)
let scrollFrame: number | null = null
function updatePageProgress() {
  scrollFrame = null
  activeChapter.value = ''
  pageProgress.value = 0
  if (!isHome.value || !showChapters.value) return
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  pageProgress.value = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0
  for (const chapter of publicChapters) {
    const section = document.getElementById(chapter.id)
    if (section && section.getBoundingClientRect().top <= window.innerHeight * .32) activeChapter.value = chapter.id
  }
}
function queuePageProgress() {
  if (scrollFrame === null) scrollFrame = requestAnimationFrame(updatePageProgress)
}
function onAnchorClick(event: MouseEvent) {
  if (!isHome.value || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null
  const id = link?.getAttribute('href')?.slice(1)
  const section = id ? document.getElementById(id) : null
  if (!section) return
  event.preventDefault()
  window.scrollTo({
    top: Math.max(0, section.getBoundingClientRect().top + window.scrollY - (header.value?.$el.offsetHeight || 0) - 20),
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  })
}
watch(() => route.fullPath, async () => {
  header.value?.closeMenu()
  await nextTick()
  updatePageProgress()
})
onMounted(() => {
  updatePageProgress()
  window.addEventListener('scroll', queuePageProgress, { passive: true })
  window.addEventListener('resize', queuePageProgress)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', queuePageProgress)
  window.removeEventListener('resize', queuePageProgress)
  if (scrollFrame !== null) cancelAnimationFrame(scrollFrame)
})
defineExpose({ openContact: () => header.value?.openContact() })
</script>

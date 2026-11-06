<template>
  <PublicHeader
    :site-name="siteName"
    :site-logo="siteLogo"
    :destination="destination"
    :is-dark="isDark"
    :show-model-plaza="showModelPlaza"
    :show-chapters="showChapters"
    :model-plaza="route.path === '/model-plaza'"
    :tutorial-docs="route.path === '/tutorials'"
    :contact-info="appStore.cachedPublicSettings?.contact_info || appStore.contactInfo"
    @toggle-theme="toggleTheme"
    @open-contact="appStore.fetchPublicSettings(true)"
  />
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { sanitizeUrl } from '@/utils/url'
import { FeatureFlags, isFeatureFlagEnabled } from '@/utils/featureFlags'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import PublicHeader from '@/components/layout/PublicHeader.vue'
const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()
const settings = computed(() => appStore.cachedPublicSettings)
const siteName = computed(() => settings.value?.site_name || appStore.siteName || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(settings.value?.site_logo || appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const destination = computed(() => authStore.isAuthenticated ? (authStore.isAdmin ? '/admin/dashboard' : '/dashboard') : '/login')
const showModelPlaza = computed(() => isFeatureFlagEnabled(FeatureFlags.modelPlaza) && (authStore.isAuthenticated || settings.value?.model_plaza_require_auth !== true))
const showChapters = computed(() => !settings.value?.compact_home_enabled && !settings.value?.home_content?.trim())
const isDark = ref(document.documentElement.classList.contains('dark'))
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}
</script>

<template>
  <header class="plaza-nav">
    <div class="plaza-container plaza-nav-inner">
      <RouterLink to="/home" class="plaza-brand" :aria-label="siteName">
        <img v-if="siteLogo" :src="siteLogo" alt="" />
        <BirdMark v-else />
        <span>{{ siteName }}</span>
      </RouterLink>
      <nav class="plaza-nav-links" :aria-label="t('gateway.mainNavigation')">
        <RouterLink to="/home">{{ t('modelPlaza.nav.home') }}</RouterLink>
        <RouterLink to="/model-plaza" aria-current="page">{{ t('modelPlaza.title') }}</RouterLink>
        <a :href="docUrl || '/home#integration'" :target="docUrl ? '_blank' : undefined"
          :rel="docUrl ? 'noopener noreferrer' : undefined">
          {{ t('gateway.documentation') }}<Icon name="externalLink" size="sm" />
        </a>
      </nav>
      <div class="plaza-nav-actions">
        <LocaleSwitcher />
        <button type="button" class="plaza-theme-toggle"
          :aria-label="isDark ? t('home.switchToLight') : t('home.switchToDark')" @click="toggleTheme">
          <Icon :name="isDark ? 'sun' : 'moon'" size="md" />
        </button>
        <RouterLink :to="isAuthenticated ? backTarget : { path: '/login', query: { redirect: '/model-plaza' } }"
          class="plaza-primary-link">
          {{ isAuthenticated ? t('gateway.console') : t('modelPlaza.nav.login') }}
          <Icon name="arrowRight" size="sm" />
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { sanitizeUrl } from '@/utils/url'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import BirdMark from '@/components/home/BirdMark.vue'
import Icon from '@/components/icons/Icon.vue'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'

const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()
const settings = computed(() => appStore.cachedPublicSettings)
const siteName = computed(() => settings.value?.site_name || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(settings.value?.site_logo || '', { allowRelative: true, allowDataUrl: true }))
const docUrl = computed(() => sanitizeUrl(settings.value?.doc_url || appStore.docUrl || ''))
const isAuthenticated = computed(() => authStore.isAuthenticated)
const backTarget = computed(() => (authStore.isAdmin ? '/admin/dashboard' : '/dashboard'))
const isDark = ref(document.documentElement.classList.contains('dark'))
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}
</script>

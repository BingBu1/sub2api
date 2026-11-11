<template>
  <div class="public-site-layout">
    <PublicSiteHeader v-if="showHeader" ref="header" />
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import PublicSiteHeader from './PublicSiteHeader.vue'
import { publicSiteKey } from './publicSiteContext'

const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()
const header = ref<InstanceType<typeof PublicSiteHeader> | null>(null)
const showHeader = computed(() =>
  !(route.name === 'Home' && appStore.cachedPublicSettings?.home_content?.trim()) &&
  !(route.name === 'ModelPlaza' && route.query.embedded === '1' && authStore.isAuthenticated)
)
const savedTheme = localStorage.getItem('theme')
const isDark = ref(savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches))
document.documentElement.classList.toggle('dark', isDark.value)
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}
provide(publicSiteKey, { isDark, toggleTheme, openContact: () => header.value?.openContact() })
</script>

<style scoped>
.public-site-layout { --public-header-height: 76px; min-height: 100svh; }
@media (max-width: 960px) { .public-site-layout { --public-header-height: 72px; } }
@media (max-width: 650px) { .public-site-layout { --public-header-height: 64px; } }
</style>

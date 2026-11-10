<template>
  <div ref="header" class="public-header" :style="{ '--page-progress': pageProgress }">
    <header class="public-header-inner">
      <RouterLink class="public-brand" to="/home" :aria-label="siteName">
        <img v-if="selectedBrand" class="public-lockup" :src="isDark ? '/zipkiwi-lockup-white.svg' : '/zipkiwi-lockup-primary.svg'" alt="" />
        <template v-else><img v-if="siteLogo" :src="siteLogo" alt="" /><BirdMark v-else /><span>{{ siteName }}</span></template>
      </RouterLink>
      <nav id="main-navigation" :class="{ open: menuOpen }" :aria-label="t('gateway.mainNavigation')" @click="closeMenu">
        <div v-if="showChapters" class="public-nav-chapters">
          <template v-for="chapter in publicChapters" :key="chapter.id">
            <a v-if="home" :href="`#${chapter.id}`" :aria-current="activeChapter === chapter.id ? 'location' : undefined">{{ t(chapter.label) }}</a>
            <RouterLink v-else :to="`/home#${chapter.id}`">{{ t(chapter.label) }}</RouterLink>
          </template>
        </div>
        <div class="public-nav-resources">
          <RouterLink v-if="showModelPlaza" to="/model-plaza" :aria-current="modelPlaza ? 'page' : undefined">{{ t('gateway.modelHub') }}</RouterLink>
          <RouterLink to="/tutorials" :aria-current="tutorialDocs ? 'page' : undefined">{{ t('gateway.documentation') }}</RouterLink>
          <button type="button" @click="openContact">{{ t('gateway.contactUs') }}</button>
        </div>
        <div class="public-mobile-locale public-locale" @click.stop><LocaleSwitcher /></div>
      </nav>
      <div class="public-actions">
        <div class="public-desktop-locale public-locale"><LocaleSwitcher /></div>
        <button type="button" class="public-theme-toggle" :aria-label="isDark ? t('home.switchToLight') : t('home.switchToDark')" @click="emit('toggleTheme')"><Icon :name="isDark ? 'sun' : 'moon'" size="md" /></button>
        <RouterLink class="public-console" :to="destination" :aria-label="t('gateway.console')"><span>{{ t('gateway.console') }}</span><Icon name="grid" size="sm" /></RouterLink>
      </div>
      <button ref="menuToggle" type="button" class="public-menu-toggle" :aria-label="t(menuOpen ? 'gateway.closeNavigationMenu' : 'gateway.openNavigationMenu')" aria-controls="main-navigation" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen"><Icon :name="menuOpen ? 'x' : 'menu'" size="md" /></button>
    </header>
    <PublicContactDialog ref="contactDialog" :site-name="siteName" :contact-info="contactInfo" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { isSelectedZipkiwiBrand } from '@/utils/zipkiwiBrand'
import BirdMark from '@/components/home/BirdMark.vue'
import Icon from '@/components/icons/Icon.vue'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import PublicContactDialog from './PublicContactDialog.vue'
import { publicChapters } from './publicNavigation'

const props = withDefaults(defineProps<{
  siteName: string
  siteLogo?: string
  destination: string
  isDark: boolean
  showModelPlaza: boolean
  contactInfo?: string
  home?: boolean
  modelPlaza?: boolean
  tutorialDocs?: boolean
  showChapters?: boolean
  activeChapter?: string
  pageProgress?: number
}>(), { showChapters: true, pageProgress: 0 })
const emit = defineEmits<{ toggleTheme: []; openContact: [] }>()
const { t } = useI18n()
const selectedBrand = computed(() => isSelectedZipkiwiBrand(props.siteName, props.siteLogo || ''))
const menuOpen = ref(false)
const header = ref<HTMLElement | null>(null)
const menuToggle = ref<HTMLButtonElement | null>(null)
const contactDialog = ref<InstanceType<typeof PublicContactDialog> | null>(null)
const desktopPreference = window.matchMedia('(min-width: 1191px)')
function closeMenu() { menuOpen.value = false }
function openContact() {
  if (menuOpen.value) menuToggle.value?.focus({ preventScroll: true })
  closeMenu()
  emit('openContact')
  contactDialog.value?.open()
}
function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && menuOpen.value) {
    closeMenu()
    menuToggle.value?.focus()
  }
}
function onOutsideClick(event: MouseEvent) {
  if (event.target instanceof Node && !header.value?.contains(event.target)) closeMenu()
}
onMounted(() => {
  desktopPreference.addEventListener('change', closeMenu)
  document.addEventListener('keydown', onEscape)
  document.addEventListener('click', onOutsideClick)
})
onBeforeUnmount(() => {
  desktopPreference.removeEventListener('change', closeMenu)
  document.removeEventListener('keydown', onEscape)
  document.removeEventListener('click', onOutsideClick)
})
defineExpose({ openContact, closeMenu })
</script>

<style scoped src="./public-header.css"></style>

<template>
  <PublicSiteHeader v-if="!standalone" />
  <div class="brand-auth-page" :class="{ 'brand-auth-standalone': standalone }">
    <router-link v-if="standalone" to="/home" class="brand-auth-corner-logo" :aria-label="siteName">
      <template v-if="selectedBrand">
        <img class="brand-auth-lockup-light" src="/zipkiwi-lockup-primary.svg" alt="" />
        <img class="brand-auth-lockup-dark" src="/zipkiwi-lockup-white.svg" alt="" />
      </template>
      <template v-else><img :src="siteLogo || '/logo.svg'" alt="" /><strong>{{ siteName }}</strong></template>
    </router-link>
    <div class="brand-auth-shell">
      <aside class="brand-auth-showcase">
        <router-link to="/home" class="brand-auth-logo" :aria-label="siteName">
          <img v-if="selectedBrand" src="/zipkiwi-lockup-white.svg" alt="" />
          <template v-else><img :src="siteLogo || '/logo.svg'" alt="" /><strong>{{ siteName }}</strong></template>
        </router-link>
        <div class="brand-auth-copy">
          <p>{{ t('gateway.heroBadge') }}</p>
          <h2>{{ t('gateway.heroTitleFirst') }}<br />{{ t('gateway.heroTitleSecond') }}</h2>
          <span>{{ t('gateway.heroDescriptionFirst') }}</span>
        </div>
        <div class="brand-auth-earth" aria-hidden="true"><div class="brand-auth-sphere"></div></div>
        <p class="brand-auth-benefits">{{ t('gateway.unifiedEndpoint') }} · {{ t('gateway.multipleModels') }} · {{ t('gateway.usageVisibility') }}</p>
      </aside>
      <div class="brand-auth-main">
        <router-link to="/home" class="brand-auth-mobile-logo" :aria-label="siteName">
          <template v-if="selectedBrand">
            <img class="brand-auth-lockup-light" src="/zipkiwi-lockup-primary.svg" alt="" />
            <img class="brand-auth-lockup-dark" src="/zipkiwi-lockup-white.svg" alt="" />
          </template>
          <template v-else><img :src="siteLogo || '/logo.svg'" alt="" /><strong>{{ siteName }}</strong></template>
        </router-link>
        <div class="brand-auth-form"><slot /></div>
        <div class="brand-auth-form-footer"><slot name="footer" /></div>
      </div>
    </div>
    <div class="brand-auth-bottom"><span>&copy; {{ new Date().getFullYear() }} {{ siteName }}</span><router-link to="/home">{{ t('auth.backToHome') }}</router-link></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'
import { sanitizeUrl } from '@/utils/url'
import { isSelectedZipkiwiBrand } from '@/utils/zipkiwiBrand'
import PublicSiteHeader from './PublicSiteHeader.vue'

defineProps<{ standalone?: boolean }>()

const { t } = useI18n()
const appStore = useAppStore()
const siteName = computed(() => appStore.siteName || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const selectedBrand = computed(() => isSelectedZipkiwiBrand(siteName.value, siteLogo.value))
onMounted(() => { appStore.fetchPublicSettings() })
</script>

<style scoped src="./brand-auth-layout.css"></style>

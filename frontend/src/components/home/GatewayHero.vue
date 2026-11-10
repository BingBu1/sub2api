<template>
  <div id="hero" ref="root" class="gateway-hero" data-testid="gateway-hero">
    <svg class="hero-symbols" aria-hidden="true"><defs><symbol id="gateway-hero-bird" viewBox="0 0 240 210"><g transform="translate(-52 -44)"><g transform="translate(0 -14.65) scale(1 1.1)"><path fill-rule="evenodd" d="M82 84 C104 104 140 107 164 109 C177 110 182 120 177 127 C188 119 198 119 204 123 C210 127 214 131 217 135 C232 145 248 159 262 175 C245 161 230 149 216 143 C216 160 194 174 158 183 C178 185 198 178 211 173 C205 185 195 195 182 197 C155 196 123 199 91 209 C109 182 141 157 172 139 C149 140 129 136 114 128 C98 118 88 100 82 84 Z M177 127 C185 134 188 141 184 148 C184 140 179 134 174 130 Z M212 132 A3 3 0 1 0 206 132 A3 3 0 1 0 212 132 Z"/></g></g></symbol><symbol id="gateway-hero-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol><symbol id="gateway-hero-up" viewBox="0 0 24 24"><path d="M7 17 17 7M7 7h10v10"/></symbol><symbol id="gateway-hero-check" viewBox="0 0 24 24"><path d="m5 12 5 5L20 7"/></symbol></defs></svg>
    <div class="hero-visual">
      <canvas class="hero-flow" aria-hidden="true"></canvas>
      <section class="hero wrap" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="hero-intro">{{ text('intro') }}</p>
          <h1 id="hero-title">{{ t('gateway.heroTitleFirst') }}<br><span>{{ t('gateway.heroTitleSecond') }}</span></h1>
          <p class="hero-description">{{ t('gateway.heroDescriptionFirst') }}<br>{{ text('descriptionMiddle') }}<br>{{ text('descriptionLast') }}</p>
          <div class="hero-cta"><RouterLink class="button primary" :to="destination">{{ text('start') }}<svg class="icon" aria-hidden="true"><use href="#gateway-hero-arrow"/></svg></RouterLink><a class="button hero-outline secondary" :href="showModelPlaza ? '#models' : '#integration'">{{ t(showModelPlaza ? 'gateway.exploreModels' : 'gateway.viewTutorials') }}<svg class="icon" aria-hidden="true"><use href="#gateway-hero-up"/></svg></a></div>
          <div class="hero-footnote"><span><svg class="icon" aria-hidden="true"><use href="#gateway-hero-check"/></svg>{{ t('gateway.unifiedEndpoint') }}</span><span><svg class="icon" aria-hidden="true"><use href="#gateway-hero-check"/></svg>{{ t('gateway.multipleModels') }}</span><span><svg class="icon" aria-hidden="true"><use href="#gateway-hero-check"/></svg>{{ t('gateway.usageVisibility') }}</span></div>
        </div>
        <div class="hero-art orbit-scene" role="region" :aria-label="text('sceneLabel')">
          <div class="orbit-atmosphere" aria-hidden="true"></div>
          <div class="orbit-stage">
            <canvas class="orbit-canvas" aria-hidden="true"></canvas>
            <div class="orbit-core" role="img" :aria-label="text('coreLabel')"><div class="orbit-core-icon"><svg v-if="selectedBrand || !siteLogo" class="bird"><use href="#gateway-hero-bird"/></svg><img v-else class="hero-site-logo" :src="siteLogo" alt=""></div><strong>{{ siteName }}</strong><span>{{ text('coreTagline') }}</span></div>
            <div class="orbit-nodes"><button class="orbit-node" type="button" style="--node-color:#168272" :aria-label="text('showModel', { name: 'OpenAI' })" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path
      d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"
    /></svg><span><b>OpenAI</b><small>{{ text('openaiSubtitle') }}</small></span></button><button class="orbit-node" type="button" style="--node-color:#b56845" :aria-label="text('showModel', { name: 'Claude' })" aria-pressed="false"><svg viewBox="0 0 16 16" aria-hidden="true"><path
      d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z"
    /></svg><span><b>Claude</b><small>{{ text('claudeSubtitle') }}</small></span></button><button class="orbit-node" type="button" style="--node-color:#526ac9" :aria-label="text('showModel', { name: 'Gemini' })" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.89 7.2L21 12l-7.11 2.8L12 22l-1.89-7.2L3 12l7.11-2.8L12 2z" /></svg><span><b>Gemini</b><small>{{ text('geminiSubtitle') }}</small></span></button><button class="orbit-node" type="button" style="--node-color:#3268d8" :aria-label="text('showModel', { name: 'DeepSeek' })" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path
      d="M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136a9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287a.3.3 0 0 1 .113.074a.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078a.253.253 0 0 1-.114-.358a1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45"
    /></svg><span><b>DeepSeek</b><small>{{ text('deepseekSubtitle') }}</small></span></button><button class="orbit-node" type="button" style="--node-color:#344a69" :aria-label="text('showModel', { name: 'Grok' })" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path
      d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815"
    /></svg><span><b>Grok</b><small>{{ text('grokSubtitle') }}</small></span></button><button class="orbit-node" type="button" style="--node-color:#7553bf" :aria-label="text('showModel', { name: 'Kimi' })" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path
      d="M21.765.351C22.998.351 24 1.353 24 2.586S22.998 4.82 21.765 4.82h-1.974c-.15 0-.26-.12-.26-.26V2.586A2.237 2.237 0 0 1 21.765.35M9.41 13.388l8.447-8.377c.16-.16.07-.471-.14-.471h-4.55s-.1.02-.14.06l-9.099 9.029c-.14.14-.35.02-.35-.21V4.81c0-.15-.1-.27-.221-.27H.22c-.12 0-.22.12-.22.27v18.57c0 .15.1.27.22.27h3.137c.12 0 .22-.12.22-.27v-3.79c0-.08.03-.16.08-.21l2.826-2.796c.07-.07.16-.08.241-.03l7.546 5.551a8.9 8.9 0 0 0 4.018 1.493c.12.01.23-.11.23-.27V19.76c0-.14-.08-.25-.19-.26a5.8 5.8 0 0 1-2.355-.942l-6.533-4.73c-.14-.09-.15-.32-.03-.441"
    /></svg><span><b>Kimi</b><small>{{ text('kimiSubtitle') }}</small></span></button></div>
            <div class="orbit-feature" role="group" :aria-label="text('featureLabel')" aria-hidden="true" inert>
              <div class="orbit-feature-icon" aria-hidden="true"></div>
              <h3></h3><p class="orbit-feature-description"></p><div class="orbit-feature-tags"></div>
              <button class="orbit-feature-close" type="button" :aria-label="text('close')"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg></button>
            </div>
          </div>
          <div class="orbit-hint" aria-hidden="true"><svg class="icon" viewBox="0 0 16 20"><rect x="3" y="1" width="10" height="17" rx="5"/><path d="M8 4v4"/></svg><span>{{ text('dragHint') }}</span></div>
          <span class="orbit-orientation" aria-hidden="true">CONNECTED INTELLIGENCE<br>ZIPKIWI / MODEL ECOSYSTEM</span>
          <div class="orbit-caption">
            <div class="orbit-detail" role="status" aria-live="polite" aria-atomic="true"><strong class="orbit-detail-name">{{ text('defaultTitle') }}</strong><p>{{ text('idleDescription') }}</p></div>
            <div class="orbit-controls"><button type="button" data-orbit-step="-1" :aria-label="text('previous')">←</button><button type="button" data-orbit-step="1" :aria-label="text('next')">→</button></div>
          </div>
        </div>
      </section>
    </div>
      <div class="model-rail wrap"><div class="rail-description"><strong>{{ text('railTitle') }}</strong><span>{{ text('railDescription') }}</span></div><div class="rail-brands" :aria-label="text('families')"><span>OpenAI</span><span class="claude">Claude</span><span class="gemini">Gemini</span><span class="deepseek">DeepSeek</span><span class="grok">Grok</span><span class="kimi">Kimi</span></div></div>

  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { isSelectedZipkiwiBrand } from '@/utils/zipkiwiBrand'
import { mountHeroMotion } from './hero-motion'

const props = defineProps<{
  siteName: string
  siteLogo?: string
  destination: string
  showModelPlaza: boolean
  isDark?: boolean
}>()
const { t, locale } = useI18n()
const selectedBrand = computed(() => isSelectedZipkiwiBrand(props.siteName, props.siteLogo || ''))
const text = (key: string, params: Record<string, string> = {}) => t(`gateway.heroOrbit.${key}`, params)
const root = ref<HTMLElement | null>(null)
let motion: ReturnType<typeof mountHeroMotion> | undefined
onMounted(() => { if (root.value) motion = mountHeroMotion(root.value, text) })
watch(() => locale?.value, () => motion?.refresh())
watch(() => props.isDark, () => motion?.refreshTheme(), { flush: 'post' })
onBeforeUnmount(() => motion?.destroy())
</script>

<style scoped src="./gateway-hero.css"></style>

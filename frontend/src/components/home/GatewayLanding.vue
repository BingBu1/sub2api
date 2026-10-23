<template>
  <div
    class="gateway-landing"
    :class="{ 'is-dark': isDark, 'motion-paused': motionPaused }"
    data-testid="gateway-landing"
    @pointermove="ambient?.followPointer($event)"
    @pointerleave="ambient?.resetPointer()"
  >
    <div class="ambient-stage">
      <HomeAmbient ref="ambient" :paused="motionPaused" :dark="isDark" />
    </div>

    <header class="landing-header">
      <nav class="landing-navigation" :aria-label="t('home.landing.navigation')">
        <div class="navigation-left">
          <router-link to="/home" class="landing-brand" :aria-label="siteName">
            <img :src="isDark ? '/zipkiwi-mark-light.svg' : '/zipkiwi-mark.svg'" alt="" width="40" height="40" />
            <span>{{ siteName }}</span>
          </router-link>
          <router-link :to="destination" class="console-link">
            <span class="button-orbit"><Icon name="plus" size="md" /></span>
            <span>{{ t('home.dashboard') }}</span>
          </router-link>
        </div>
        <router-link v-if="registrationEnabled && !isAuthenticated" to="/register" class="register-link">
          <span class="button-orbit"><Icon name="arrowUp" size="md" class="diagonal-arrow" /></span>
          <span>{{ t('home.landing.createAccount') }}</span>
        </router-link>
        <a v-else-if="docUrl" :href="docUrl" target="_blank" rel="noopener noreferrer" class="register-link">
          <span class="button-orbit"><Icon name="book" size="md" /></span>
          <span>{{ t('home.docs') }}</span>
        </a>
      </nav>
    </header>

    <main class="landing-main">
      <div class="hero-copy">
        <h1>{{ siteName }}</h1>
        <h2><span>{{ t('home.landing.headlineLead') }}</span><span>{{ t('home.landing.headlineEnd') }}</span></h2>
        <p>{{ t('home.heroSubtitle') }}</p>
        <router-link :to="destination" class="hero-action">
          <span>{{ isAuthenticated ? t('home.goToDashboard') : t('home.landing.start') }}</span>
          <Icon name="arrowRight" size="md" />
        </router-link>
      </div>
    </main>

    <footer class="landing-footer">
      <span class="copyright">© {{ new Date().getFullYear() }} {{ siteName }}</span>
      <div class="footer-actions">
        <a v-if="docUrl" :href="docUrl" target="_blank" rel="noopener noreferrer" class="footer-link">{{ t('home.docs') }}</a>
        <router-link v-if="showModelPlaza" to="/model-plaza" class="footer-link">{{ t('nav.modelPlaza') }}</router-link>
        <button
          v-if="!reducedMotion"
          type="button"
          class="motion-toggle"
          :aria-label="paused ? t('home.landing.resumeMotion') : t('home.landing.pauseMotion')"
          :title="paused ? t('home.landing.resumeMotion') : t('home.landing.pauseMotion')"
          :aria-pressed="paused"
          @click="paused = !paused"
        >
          <span class="motion-symbol" :class="{ playing: !paused }" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="motion-label">{{ paused ? t('home.landing.resumeMotion') : t('home.landing.pauseMotion') }}</span>
        </button>
        <button type="button" class="theme-toggle" :aria-label="isDark ? t('home.switchToLight') : t('home.switchToDark')" :title="isDark ? t('home.switchToLight') : t('home.switchToDark')" @click="$emit('toggleTheme')">
          <Icon :name="isDark ? 'sun' : 'moon'" size="sm" />
        </button>
        <LocaleSwitcher />
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import HomeAmbient from './HomeAmbient.vue'

const props = defineProps<{
  siteName: string
  docUrl: string
  isDark: boolean
  isAuthenticated: boolean
  dashboardPath: string
  registrationEnabled: boolean
  showModelPlaza: boolean
}>()
defineEmits<{ toggleTheme: [] }>()
const { t } = useI18n()
const ambient = ref<InstanceType<typeof HomeAmbient> | null>(null)
const paused = ref(false)
const reducedMotion = ref(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
const motionPaused = computed(() => paused.value || reducedMotion.value)
const destination = computed(() => props.isAuthenticated ? props.dashboardPath : '/login')
let motionPreference: MediaQueryList | undefined
function updateMotion(event: MediaQueryListEvent) { reducedMotion.value = event.matches }
onMounted(() => {
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionPreference.addEventListener('change', updateMotion)
})
onBeforeUnmount(() => motionPreference?.removeEventListener('change', updateMotion))
</script>

<style scoped>
.gateway-landing {
  --landing-bg: #f6f8f7; --landing-ink: #192321; --landing-muted: #64716c;
  --landing-button: #17271f; --landing-on-button: #f7faf8; --landing-surface: #ffffff80;
  position: relative; isolation: isolate; display: flex; flex-direction: column;
  min-height: 100svh; min-height: 100dvh; overflow: hidden;
  color: var(--landing-ink); background: var(--landing-bg);
  font-family: 'Avenir Next', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  transition: background-color .45s, color .45s;
}
.gateway-landing.is-dark {
  --landing-bg: #0c1815; --landing-ink: #eff6f1; --landing-muted: #9eafa5;
  --landing-button: #e5f2e9; --landing-on-button: #13251c; --landing-surface: #ffffff0b;
}
.ambient-stage { position: absolute; inset: 0; z-index: -1; }
.ambient-stage::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse at 68% 75%, #b1ddc52b, transparent 45%), radial-gradient(ellipse at 28% 25%, #d2e1ea2b, transparent 48%);
}
.landing-header { padding: 30px 42px; }
.landing-navigation { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.navigation-left { display: flex; align-items: center; gap: 30px; min-width: 0; }
.landing-brand { display: inline-flex; align-items: center; gap: 10px; min-width: 0; font-size: 24px; font-weight: 650; letter-spacing: -1px; }
.landing-brand img { flex-shrink: 0; }
.landing-brand span { overflow-wrap: anywhere; }
.console-link, .register-link { display: inline-flex; align-items: center; gap: 12px; border-radius: 999px; padding: 6px 24px 6px 6px; font-size: 14px; font-weight: 500; white-space: nowrap; transition: transform .25s, box-shadow .25s; }
.console-link { color: var(--landing-on-button); background: var(--landing-button); }
.register-link { background: var(--landing-surface); border: 1px solid #9aaea51a; }
.button-orbit { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; background: var(--landing-bg); color: var(--landing-ink); }
.register-link .button-orbit { background: var(--landing-button); color: var(--landing-on-button); }
.diagonal-arrow { transform: rotate(45deg); }
.console-link:hover, .register-link:hover { transform: translateY(-2px); box-shadow: 0 8px 24px #17271f12; }
.landing-main { flex: 1; display: grid; place-items: center; padding: 48px 24px 70px; }
.hero-copy { text-align: center; max-width: 100%; animation: copy-arrive 1.2s cubic-bezier(.2,.7,.2,1) both; }
.hero-copy h1 { font-size: clamp(60px, 6.8vw, 88px); font-weight: 620; letter-spacing: -.065em; line-height: 1.08; overflow-wrap: anywhere; }
.hero-copy h2 { display: flex; justify-content: center; flex-wrap: wrap; column-gap: .3em; margin-top: 20px; font-size: clamp(32px, 3.5vw, 48px); font-weight: 400; line-height: 1.35; letter-spacing: -.045em; }
.hero-copy h2 span:first-child { color: var(--landing-muted); }
.hero-copy p { margin-top: 20px; font-size: 15px; letter-spacing: .08em; color: var(--landing-muted); }
.hero-action { display: inline-flex; align-items: center; justify-content: center; gap: 24px; min-height: 58px; margin-top: 36px; padding: 0 28px; border-radius: 999px; background: var(--landing-button); color: var(--landing-on-button); font-size: 15px; box-shadow: 0 8px 28px #1c513b12; transition: transform .25s, box-shadow .25s; }
.hero-action:hover { transform: translateY(-3px); box-shadow: 0 12px 32px #1c513b26; }
.hero-action :deep(svg) { transition: transform .25s; }
.hero-action:hover :deep(svg) { transform: translateX(4px); }
.landing-footer { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 20px 42px 26px; color: var(--landing-muted); }
.copyright { font-size: 12px; letter-spacing: .015em; }
.footer-actions { display: flex; align-items: center; gap: 18px; }
.footer-link { font-size: 13px; }
.footer-link:hover { color: var(--landing-ink); }
.motion-toggle { display: inline-flex; align-items: center; gap: 9px; font-size: 12px; min-height: 40px; }
.motion-symbol { display: flex; align-items: center; gap: 3px; height: 16px; }
.motion-symbol i { display: block; width: 2px; height: 12px; background: currentColor; border-radius: 2px; transform: scaleY(.5); }
.motion-symbol.playing i { animation: wave 1.8s ease-in-out infinite; }
.motion-symbol.playing i:nth-child(2) { animation-delay: -.6s; }
.motion-symbol.playing i:nth-child(3) { animation-delay: -1.2s; }
.theme-toggle { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; }
.theme-toggle:hover { background: var(--landing-surface); }
.footer-actions :deep(.relative > button) { color: var(--landing-muted); }
.footer-actions :deep(.absolute) { top: auto; bottom: calc(100% + 8px); }
.gateway-landing :is(a, button):focus-visible { outline: 2px solid #298569; outline-offset: 5px; }
@keyframes copy-arrive { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes wave { 0%, 100% { transform: scaleY(.4); } 50% { transform: scaleY(1); } }
@media (min-width: 1600px) { .landing-header, .landing-footer { padding-left: 64px; padding-right: 64px; } }
@media (max-width: 640px) {
  .landing-header { padding: 22px 20px; }
  .navigation-left { gap: 14px; }
  .landing-brand { font-size: 22px; gap: 8px; }
  .landing-brand img { width: 34px; height: 34px; }
  .console-link { display: none; }
  .register-link { font-size: 12px; gap: 8px; padding: 4px 14px 4px 4px; }
  .button-orbit { width: 34px; height: 34px; }
  .landing-main { padding: 50px 20px 70px; }
  .hero-copy h1 { font-size: clamp(62px, 17vw, 84px); }
  .hero-copy h2 { font-size: clamp(28px, 7vw, 36px); margin-top: 14px; }
  .hero-copy p { font-size: 12px; letter-spacing: .04em; margin-top: 18px; }
  .hero-action { margin-top: 30px; min-height: 54px; padding: 0 25px; }
  .landing-footer { padding: 16px 20px 22px; flex-wrap: wrap; }
  .footer-actions { gap: 10px; }
  .motion-label { display: none; }
  .copyright { font-size: 11px; }
  .ambient-stage { left: -22%; right: -22%; }
}
@media (max-height: 540px) and (min-width: 641px) {
  .landing-header { padding-top: 18px; padding-bottom: 12px; }
  .landing-main { padding: 20px; }
  .hero-copy h1 { font-size: 60px; }
  .hero-copy h2 { font-size: 32px; }
  .hero-copy p { margin-top: 12px; }
  .hero-action { margin-top: 22px; }
}
@media (prefers-reduced-motion: reduce) {
  .gateway-landing, .hero-copy, .hero-action, .console-link, .register-link, .hero-action :deep(svg) { animation: none; transition: none; }
  .motion-symbol.playing i { animation: none; }
}
</style>

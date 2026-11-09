<template>
  <div
    class="gateway-landing"
    :class="{ 'is-dark': isDark, 'motion-paused': reducedMotion }"
    data-testid="gateway-landing"
    @click="onAnchorClick"
  >
    <main>
      <GatewayHero
        :site-name="siteName"
        :is-dark="isDark"
        :site-logo="siteLogo"
        :destination="destination"
        :show-model-plaza="showModelPlaza"
      />
      <section class="telemetry-section" aria-labelledby="network-overview-title">
        <div class="container">
          <div class="telemetry-heading"><h2 id="network-overview-title">{{ t('gateway.networkOverview') }}</h2><span class="telemetry-demo" :class="{ 'is-unavailable': telemetryError }">{{ telemetryStatus }}</span></div>
          <div class="telemetry-shell">
            <div class="telemetry-overview">
              <div class="telemetry-metrics">
                <div class="telemetry-metric telemetry-volume"><span>{{ t('gateway.tokenVolume') }}</span><strong data-testid="telemetry-tokens">{{ formattedTokens }}</strong><small>{{ t('gateway.allTimeTotal') }}</small></div>
                <div class="telemetry-metric telemetry-success"><span>{{ t('gateway.successRate') }}</span><strong>{{ formattedSuccessRate }}<small v-if="formattedSuccessRate !== '—'">%</small></strong><small>{{ t('gateway.last24Hours') }}</small></div>
              </div>
              <div class="telemetry-secondary"><span>{{ t('gateway.modelFamilies') }} · {{ t('gateway.expanding') }}</span><strong>{{ formattedOutputTPS }} <small><template v-if="formattedOutputTPS !== '—'">t/s · </template>{{ t('gateway.averageSpeed') }}</small></strong></div>
            </div>
            <div class="telemetry-ranking"><div class="telemetry-ranking-heading"><strong>{{ t('gateway.popularModels') }}</strong><span>{{ t('gateway.illustrativeSuccessRate') }}</span></div><ol><li v-for="(model, index) in popularModels" :key="model.name"><span>0{{ index + 1 }}</span><strong>{{ model.name }}</strong><span>{{ model.rate }}%</span></li></ol><p>{{ t('gateway.popularModelsDemoNote') }}</p></div>
          </div>
        </div>
      </section>
      <section class="pricing-section module-section" id="models">
        <div class="container">
          <div class="price-heading"><div><p class="module-label">{{ t('gateway.modelsAndPricing') }}</p><h2>{{ t('gateway.chooseModelWithClarity') }}</h2><p>{{ t('gateway.pricingDescription') }}</p></div><router-link v-if="showModelPlaza" class="textlink" to="/model-plaza">{{ t('gateway.exploreAllModels') }} ↗</router-link></div>
          <div class="model-guide"><span>{{ t('gateway.chooseByTask') }}</span><div role="group" :aria-label="t('gateway.chooseByTask')"><button v-for="task in priceTasks" :key="task.id" type="button" :aria-pressed="selectedTask === task.id" @click="selectedTask = task.id">{{ t(task.label) }}</button></div><small>USD / 1M Token</small></div>
          <p class="model-guide-insight">✧ {{ t(taskInsight) }}</p>
          <div class="price-table-wrap"><table class="price-table"><thead><tr><th>{{ t('gateway.model') }}</th><th>{{ t('gateway.taskDirection') }}</th><th>{{ t('gateway.inputPrice') }}</th><th>{{ t('gateway.outputPrice') }}</th><th>{{ t('gateway.access') }}</th></tr></thead><tbody><tr v-for="model in filteredPriceModels" :key="model.name"><td><small>{{ model.maker }}</small><strong>{{ model.name }}</strong></td><td>{{ t(model.use) }}</td><td><strong>{{ model.input }}</strong></td><td><strong>{{ model.output }}</strong></td><td><a href="#integration" :aria-label="`${t('gateway.access')} ${model.name}`">↗</a><small>{{ model.group || t('gateway.priceUnavailable') }}</small></td></tr></tbody></table></div>
          <div class="price-snapshot"><span>{{ pricingStatus }}</span><router-link v-if="showModelPlaza" to="/model-plaza">{{ t('gateway.exploreAllModels') }} ↗</router-link></div>
        </div>
      </section>
      <section class="container module-section" id="platform">
        <div class="section-heading">
          <div>
            <p class="module-label" data-chapter="01">
              {{ t('gateway.coreFeatures') }}
            </p>
            <h2>{{ t('gateway.fromModelAccessToUsageManagement') }}</h2>
          </div>
          <router-link class="textlink" :to="destination">
            {{ t('gateway.openWorkspace') }}
            <Icon name="grid" size="sm" class="action-icon" />
          </router-link>
        </div>
        <div class="feature-grid">
          <component
            :is="showModelPlaza ? RouterLink : 'span'"
            class="feature-item"
            :to="showModelPlaza ? '/model-plaza' : undefined"
          >
            <div class="feature-visual product-visual route-visual" aria-hidden="true">
              <div class="visual-caption"><span>{{ t('gateway.unifiedRouting') }}</span><small>{{ t('gateway.multipleModels') }}</small></div>
              <div class="route-map">
                <svg class="route-wires" viewBox="0 0 260 140" preserveAspectRatio="none" fill="none">
                  <path class="route-wire" d="M34 74H112M112 74H151Q164 74 164 57V36H202M112 74H202M112 74H151Q164 74 164 91V112H202" />
                  <path class="route-packet" d="M34 74H112M112 74H151Q164 74 164 57V36H202M112 74H202M112 74H151Q164 74 164 91V112H202" />
                </svg>
                <span class="route-app"><Icon name="terminal" size="sm" /></span>
                <span class="route-hub"><BirdMark /><span class="route-hub-ring"></span></span>
                <span class="route-model route-model-one">GPT</span>
                <span class="route-model route-model-two">Claude</span>
                <span class="route-model route-model-three">Gemini</span>
                <span class="route-origin-label">{{ t('gateway.application') }}</span>
                <span class="route-brand-label">{{ siteName }}</span>
              </div>
              <div class="visual-bottom-line"><span>{{ t('gateway.oneEntryManyModels') }}</span><span class="route-pulse"></span></div>
            </div>
            <h3>
              {{ t('gateway.unifiedModelAccess') }}
              <Icon name="chevronRight" size="sm" class="action-icon" />
            </h3>
            <p>
              {{ t('gateway.connectModelsThroughOneGatewayAndChoose') }}
            </p>
          </component>
          <router-link
            class="feature-item"
            :to="isAuthenticated ? '/keys' : '/login'"
          >
            <div class="feature-visual product-visual credential-visual" aria-hidden="true">
              <div class="visual-caption"><span>{{ t('gateway.keyManagement') }}</span><Icon name="shieldKey" size="sm" /></div>
              <div class="credential-stack">
                <div class="credential-back"></div>
                <div class="credential-card">
                  <div class="credential-title"><Icon name="shieldKey" size="sm" /><span>{{ t('gateway.applicationKey') }}</span><span class="credential-enabled">{{ t('gateway.enabled') }}</span></div>
                  <div class="credential-secret">sk- •••• •••• •••• <Icon name="copy" size="sm" /></div>
                  <div class="credential-footer"><span>{{ t('gateway.serverAccess') }}</span><span>{{ t('gateway.revocable') }}</span></div>
                </div>
              </div>
              <div class="visual-bottom-line"><span>{{ t('gateway.managePerApp') }}</span><span class="visual-segment-marks"><i></i><i></i><i></i><i></i></span></div>
            </div>
            <h3>
              {{ t('gateway.apiKeyManagement') }}
              <Icon name="chevronRight" size="sm" class="action-icon" />
            </h3>
            <p>
              {{ t('gateway.createKeysForYourApplicationsAndManage') }}
            </p>
          </router-link>
          <router-link
            class="feature-item"
            :to="isAuthenticated ? '/usage' : '/login'"
          >
            <div class="feature-visual product-visual trace-visual" aria-hidden="true">
              <div class="visual-caption"><span>{{ t('gateway.requestHistory') }}</span><Icon name="terminal" size="sm" /></div>
              <div class="trace-window">
                <div class="trace-columns"><span>{{ t('gateway.model') }}</span><span>{{ t('gateway.status') }}</span><span>{{ t('gateway.latency') }}</span></div>
                <div v-for="(entry, index) in sampleRequests" :key="entry.model" class="trace-row" :style="{ '--trace-delay': `${index * 1.7}s` }">
                  <span class="trace-model"><small>POST</small>{{ entry.model }}</span><span class="trace-status">200</span><span class="trace-latency">{{ entry.ms }} <small>ms</small></span>
                </div>
              </div>
              <div class="visual-bottom-line"><span>{{ t('gateway.traceEveryRequest') }}</span><span class="trace-ticks"><i v-for="tick in 9" :key="tick"></i></span></div>
            </div>
            <h3>
              {{ t('gateway.requestHistory') }}
              <Icon name="chevronRight" size="sm" class="action-icon" />
            </h3>
            <p>
              {{ t('gateway.reviewRequestRecordsStatusAndUsage') }}
            </p>
          </router-link>
          <router-link
            class="feature-item"
            :to="isAuthenticated ? '/usage' : '/login'"
          >
            <div class="feature-visual product-visual usage-visual" aria-hidden="true">
              <div class="visual-caption"><span>{{ t('gateway.usageTrend') }}</span><small>{{ t('gateway.last24Hours') }}</small></div>
              <div class="usage-stat"><strong>12.8<span>M</span></strong><span>Tokens</span><span class="usage-period">{{ t('gateway.usageOverview') }}</span></div>
              <div class="usage-chart">
                <div class="usage-grid"><i></i><i></i><i></i></div>
                <div class="usage-bars"><i v-for="(height, index) in sampleBars" :key="index" :style="{ '--h': `${height}%`, '--d': `${index * 0.2}s` }"></i></div>
                <span class="usage-chart-focus"></span>
              </div>
              <div class="usage-axis"><span>00:00</span><span>12:00</span><span>24:00</span></div>
              <div class="visual-bottom-line"><span>{{ t('gateway.usageAndSpend') }}</span><span class="visual-segment-marks"><i></i><i></i></span></div>
            </div>
            <h3>
              {{ t('gateway.usageAndSpend') }}
              <Icon name="chevronRight" size="sm" class="action-icon" />
            </h3>
            <p>
              {{ t('gateway.understandConsumptionToInformModelChoicesAnd') }}
            </p>
          </router-link>
        </div>
        <p class="module-note">
          {{ t('gateway.animationsIllustrateWorkflowsCheckTheConsoleFor') }}
        </p>
      </section>
      <section class="integration module-section" id="integration">
        <div class="container integration-layout">
          <div class="integration-copy">
            <p class="module-label">{{ t('gateway.quickStart') }}</p>
            <h2>{{ t('gateway.threeStepsToYourFirstRequest') }}</h2>
            <p>{{ t('gateway.integrationIntro') }}</p>
            <ol class="integration-steps">
              <li v-for="(step, index) in integrationSteps" :key="step.title"><span>0{{ index + 1 }}</span><div><h3>{{ t(step.title) }}</h3><p>{{ t(step.body) }}</p></div></li>
            </ol>
            <router-link class="textlink" :to="isAuthenticated ? '/keys' : '/login'">{{ t('gateway.createAKey') }} →</router-link>
          </div>
          <div class="request-window">
            <div class="request-toolbar"><div class="request-tabs" role="tablist" :aria-label="t('gateway.codeLanguage')"><button v-for="language in codeLanguages" :key="language" type="button" role="tab" :aria-selected="codeLanguage === language" :tabindex="codeLanguage === language ? 0 : -1" @click="codeLanguage = language">{{ language }}</button></div><button type="button" class="copy" @click="copyCode"><Icon name="copy" size="sm" /> {{ copyLabel }}</button></div>
            <div class="request-code-panel" role="tabpanel" tabindex="0"><pre id="snippet"><code>{{ snippet }}</code></pre></div>
            <div class="request-setup"><span>{{ t('gateway.prepareEnvironment') }}</span><code>{{ installCommand }}</code><p>{{ t('gateway.environmentHint') }}</p></div>
            <p class="request-compatibility">{{ t('gateway.modelCompatibilityNote') }}</p>
            <span class="sr-only" role="status">{{ copyFeedback }}</span>
          </div>
        </div>
        <div class="container connection-options" id="tools">
          <div class="connection-options-heading"><div><span>{{ t('gateway.connectionChoice') }}</span><h3>{{ t('gateway.codeOrTools') }}</h3></div><p>{{ t('gateway.checkProtocolFirst') }}</p></div>
          <div class="connection-paths">
            <div class="connection-path"><div class="connection-path-heading"><Icon name="terminal" size="md" /><span><strong>{{ t('gateway.sdkApps') }}</strong><small>Python / Node.js / cURL</small></span></div><div class="connection-path-body"><p>{{ t('gateway.sdkAppsDescription') }}</p><a href="#snippet">{{ t('gateway.viewCodeExample') }} ↗</a></div></div>
            <div class="connection-path"><div class="connection-path-heading"><Icon name="monitorPulse" size="md" /><span><strong>{{ t('gateway.existingTools') }}</strong><small>{{ t('gateway.customEndpointKey') }}</small></span></div><div class="connection-path-body"><p>{{ t('gateway.existingToolsDescription') }}</p><div class="connection-endpoint"><code>{{ endpointUrl }}</code><button type="button" @click="copyEndpoint">{{ endpointCopied ? t('common.copied') : t('gateway.copyEndpoint') }}</button></div></div></div>
            <div class="connection-path"><div class="connection-path-heading"><Icon name="grid" size="md" /><span><strong>{{ t('gateway.teamsAndSystems') }}</strong><small>{{ t('gateway.validateThenMigrate') }}</small></span></div><div class="connection-path-body"><p>{{ t('gateway.teamsAndSystemsDescription') }}</p><a href="#enterprise">{{ t('gateway.enterpriseService') }} ↗</a></div></div>
          </div>
        </div>
      </section>
      <section class="enterprise-section module-section" id="enterprise">
        <div class="container enterprise-layout">
          <div class="enterprise-copy">
            <p class="module-label">{{ t('gateway.enterpriseService') }}</p>
            <h2>{{ t('gateway.enterpriseHeadline') }}</h2>
            <p>{{ t('gateway.enterpriseIntro') }}</p>
            <div class="enterprise-benefits"><div v-for="benefit in enterpriseBenefits" :key="benefit.title"><Icon :name="benefit.icon" size="md" /><span><h3>{{ t(benefit.title) }}</h3><p>{{ t(benefit.body) }}</p></span></div></div>
          </div>
          <div class="enterprise-blueprint">
            <div class="blueprint-top"><strong>{{ siteName }}</strong><span>{{ t('gateway.teamPath') }}</span></div>
            <div class="blueprint-heading"><small>{{ t('gateway.defineValidateConnect') }}</small><h3>{{ t('gateway.clearPath') }}</h3></div>
            <ol><li v-for="(step, index) in enterpriseSteps" :key="step.title"><small>0{{ index + 1 }}</small><div><strong>{{ t(step.title) }}</strong><p>{{ t(step.body) }}</p></div><span>{{ index === 2 ? '✓' : index === 1 ? '↗' : '+' }}</span></li></ol>
            <p>{{ t('gateway.validateYourTasks') }}</p>
          </div>
        </div>
      </section>
      <section class="container module-section faq-section" id="faq">
        <div>
          <p class="module-label" data-chapter="05">{{ t('gateway.faq') }}</p>
          <h2>
            {{ t('gateway.beforeYouBegin') }}
            <br />
            {{ t('gateway.aFewUsefulAnswers') }}
          </h2>
          <p>{{ t('gateway.fromChoosingAModelToYourFirst') }}</p>
        </div>
        <div class="faq-list">
          <details>
            <summary>
              {{ t('gateway.whichModelsAreAvailableAndWhereCan') }}
              <span>＋</span>
            </summary>
            <p>{{ t('gateway.checkTheConsoleForAvailableModelsAnd') }}</p>
          </details>
          <details>
            <summary>
              {{ t('gateway.howDoIConnectAnExistingApplication') }}
              <span>＋</span>
            </summary>
            <p>
              {{ t('gateway.checkProtocolCompatibilityThenUpdateTheEndpoint') }}
            </p>
          </details>
          <details>
            <summary>
              {{ t('gateway.whichClientsAndToolsCanIUse') }}
              <span>＋</span>
            </summary>
            <p>{{ t('gateway.toolsWithAConfigurableEndpointAndApi') }}</p>
          </details>
          <details>
            <summary>
              {{ t('gateway.howAreUsageAndCostsCalculated') }}
              <span>＋</span>
            </summary>
            <p>{{ t('gateway.costsDependOnTheSelectedModelAnd') }}</p>
          </details>
          <details>
            <summary>
              {{ t('gateway.whatIfARequestFailsOrIs') }}
              <span>＋</span>
            </summary>
            <p>{{ t('gateway.checkYourKeyBalanceModelIdAnd') }}</p>
          </details>
          <details>
            <summary>
              {{ t('gateway.howDoIProtectOrRevokeAn') }}
              <span>＋</span>
            </summary>
            <p>{{ t('gateway.storeKeysServerSideOrInSecure') }}</p>
          </details>
        </div>
      </section>
      <div class="cta-shell">
        <div class="container">
          <section class="cta">
            <div>
              <h2>{{ t('gateway.connectYourNextIdea') }}</h2>
              <p>
                {{
                  t('gateway.buildYourAiApplicationWithZipkiwi', { siteName })
                }}
              </p>
            </div>
            <router-link class="button" :to="destination">
              {{ t('gateway.getStarted') }}
              <Icon name="link" size="sm" class="action-icon" />
            </router-link>
          </section>
        </div>
      </div>
    </main>
    <div class="site-footer">
      <div class="container">
        <footer>
          <div class="footer-main"><div class="footer-identity"><router-link class="brand" to="/home">
            <img v-if="selectedBrand" class="brand-lockup" :src="isDark ? '/zipkiwi-lockup-white.svg' : '/zipkiwi-lockup-primary.svg'" :alt="siteName" />
            <template v-else>
              <img v-if="siteLogo" :src="siteLogo" alt="" />
              <BirdMark v-else />
              {{ siteName }}
            </template>
          </router-link><p>{{ t('gateway.heroTitleFirst') }}<br />{{ t('gateway.heroTitleSecond') }}</p></div>
          <div class="footer-link-group"><h3>{{ t('gateway.product') }}</h3><a href="#models">{{ t('gateway.modelsAndPricing') }}</a><a href="#platform">{{ t('gateway.coreFeatures') }}</a><router-link v-if="showModelPlaza" to="/model-plaza">{{ t('gateway.modelHub') }}</router-link></div>
          <div class="footer-link-group"><h3>{{ t('gateway.resources') }}</h3><a href="#integration">{{ t('gateway.quickStart') }}</a><a href="#tools">{{ t('gateway.existingTools') }}</a><a href="#faq">{{ t('gateway.faq') }}</a></div>
          <div class="footer-link-group"><h3>{{ t('gateway.support') }}</h3><a href="#enterprise">{{ t('gateway.enterpriseService') }}</a><button type="button" @click="openContactDialog">{{ t('gateway.contactUs') }}</button><router-link :to="destination">{{ t('gateway.console') }}</router-link></div></div>
          <div class="footer-baseline"><span>© {{ new Date().getFullYear() }} {{ siteName }}</span><span>{{ t('gateway.modelAvailabilityAndFeaturesDependOnYour') }}</span><button type="button" @click="backToTop">{{ t('gateway.backToTop') }} ↑</button></div>
        </footer>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { sanitizeUrl } from '@/utils/url'
import { isSelectedZipkiwiBrand } from '@/utils/zipkiwiBrand'
import { getPublicTelemetry, type PublicTelemetry } from '@/api/publicTelemetry'
import { getModelPlaza, type ModelPlazaGroup, type ModelPlazaResponse, type PlazaModel } from '@/api/modelPlaza'
import { formatScaled, plazaEffectiveRate, resolveIntervalPrices } from '@/utils/pricing'
import BirdMark from './BirdMark.vue'
import GatewayHero from './GatewayHero.vue'

const props = defineProps<{
  siteName: string
  siteLogo?: string
  apiBaseUrl?: string
  isDark: boolean
  isAuthenticated: boolean
  dashboardPath: string
  registrationEnabled: boolean
  showModelPlaza: boolean
}>()
const emit = defineEmits<{ openContact: [] }>()
const { t, locale } = useI18n()
const selectedBrand = computed(() => isSelectedZipkiwiBrand(props.siteName, props.siteLogo || ''))
const destination = computed(() =>
  props.isAuthenticated ? props.dashboardPath : '/login'
)
const selectedTask = ref('all')
const priceTasks = [
  { id: 'all', label: 'gateway.allTasks' },
  { id: 'daily', label: 'gateway.dailyTasks' },
  { id: 'coding', label: 'gateway.codingTasks' },
  { id: 'longform', label: 'gateway.longformTasks' }
]
const priceModelSpecs = [
  { maker: 'OPENAI', name: 'gpt-5.6-luna', use: 'gateway.miniUse', task: 'daily' },
  { maker: 'OPENAI', name: 'gpt-5.6-sol', use: 'gateway.gptUse', task: 'coding' },
  { maker: 'ANTHROPIC', name: 'claude-sonnet-4-6', use: 'gateway.claudeUse', task: 'longform' }
]
const sampleRequests = [
  { model: 'gpt-5.6-luna', ms: 186 },
  { model: 'claude-sonnet-4-6', ms: 243 },
  { model: 'gpt-5.6-sol', ms: 208 }
]
const sampleBars = [29, 43, 36, 56, 48, 72, 62, 83, 69, 96, 84, 91]
const plaza = ref<ModelPlazaResponse | null>(null)
const pricingLoading = ref(true)
const pricingError = ref(false)
const pricingStatus = computed(() => !props.showModelPlaza ? t('gateway.pricingUnavailable') : pricingLoading.value ? t('gateway.pricingLoading')
  : pricingError.value || !plaza.value?.groups.length ? t('gateway.pricingUnavailable') : t('gateway.livePricingNote'))
function unitPrice(group: ModelPlazaGroup, model: PlazaModel, key: 'input_price' | 'output_price') {
  const pricing = model.pricing
  if (!pricing || pricing.billing_mode !== 'token') return null
  const firstTier = group.long_context_pricing_enabled ? pricing.intervals?.find(tier => tier.min_tokens === 0) : null
  const value = firstTier ? resolveIntervalPrices(firstTier, pricing)[key] : pricing[key]
  return value == null ? null : value * plazaEffectiveRate({ rateMultiplier: group.rate_multiplier, userRateMultiplier: group.user_rate_multiplier })
}
const priceModels = computed(() => priceModelSpecs.map(spec => {
  const options = (plaza.value?.groups ?? [])
    .filter(group => group.subscription_type !== 'subscription')
    .flatMap(group => group.models.filter(model => model.name === spec.name).map(model => ({ group, input: unitPrice(group, model, 'input_price'), output: unitPrice(group, model, 'output_price') })))
    .filter(option => option.input !== null && option.output !== null)
    .sort((a, b) => (a.input! + a.output!) - (b.input! + b.output!))
  const choice = options[0]
  return { ...spec, input: choice ? formatScaled(choice.input, 1_000_000, 2) : '—', output: choice ? formatScaled(choice.output, 1_000_000, 2) : '—', group: choice?.group.name ?? '' }
}))
const filteredPriceModels = computed(() => selectedTask.value === 'all' ? priceModels.value : priceModels.value.filter(model => model.task === selectedTask.value))
const taskInsight = computed(() => ({ all: 'gateway.allInsight', daily: 'gateway.dailyInsight', coding: 'gateway.codingInsight', longform: 'gateway.longformInsight' })[selectedTask.value] || 'gateway.allInsight')
const telemetry = ref<PublicTelemetry | null>(null)
const visibleTokens = ref<number | null>(null)
const telemetryError = ref(false)
const telemetryLoading = ref(true)
const popularModels = [
  { name: 'GPT-5.6 Luna', rate: '100.00' },
  { name: 'Claude Sonnet 4.6', rate: '99.00' },
  { name: 'GPT-5.6 Sol', rate: '99.00' }
]
const telemetryStatus = computed(() => telemetryError.value
  ? t('gateway.statisticsUnavailable')
  : telemetryLoading.value ? t('gateway.statisticsLoading') : t('gateway.liveStatistics'))
const numberLocale = computed(() => locale.value.startsWith('zh') ? 'zh-CN' : 'en-US')
const formattedTokens = computed(() => visibleTokens.value === null ? '—' : new Intl.NumberFormat(numberLocale.value).format(visibleTokens.value))
const formattedSuccessRate = computed(() => telemetry.value?.success_rate == null ? '—' : telemetry.value.success_rate.toFixed(2))
const formattedOutputTPS = computed(() => telemetry.value?.average_output_tps == null ? '—' : telemetry.value.average_output_tps.toFixed(1))
let pricingTimer: ReturnType<typeof setInterval> | null = null
let pricingRequest: AbortController | null = null
async function loadPricing() {
  if (!props.showModelPlaza || pricingRequest || document.hidden) return
  const request = new AbortController()
  pricingRequest = request
  try {
    const next = await getModelPlaza({ signal: request.signal })
    if (request.signal.aborted) return
    plaza.value = next
    pricingError.value = false
  } catch {
    if (!request.signal.aborted) {
      plaza.value = null
      pricingError.value = true
    }
  } finally {
    if (pricingRequest === request) pricingRequest = null
    pricingLoading.value = false
  }
}
let telemetryTimer: ReturnType<typeof setInterval> | null = null
let telemetryFrame: number | null = null
let telemetryRequest: AbortController | null = null
function setTokenTarget(target: number) {
  if (telemetryFrame !== null) window.cancelAnimationFrame(telemetryFrame)
  if (visibleTokens.value === null || reducedMotion.value) {
    visibleTokens.value = target
    return
  }
  const start = visibleTokens.value
  if (start === target) return
  const startedAt = performance.now()
  function step(now: number) {
    const progress = Math.min(1, (now - startedAt) / 1200)
    const eased = 1 - (1 - progress) ** 4
    visibleTokens.value = Math.round(start! + (target - start!) * eased)
    telemetryFrame = progress < 1 ? window.requestAnimationFrame(step) : null
  }
  telemetryFrame = window.requestAnimationFrame(step)
}
async function loadTelemetry() {
  if (telemetryRequest || document.hidden) return
  const request = new AbortController()
  telemetryRequest = request
  try {
    const next = await getPublicTelemetry(request.signal)
    if (request.signal.aborted) return
    if (!Number.isSafeInteger(next.total_tokens) || next.total_tokens < 0) throw new Error('Invalid token total')
    telemetry.value = next
    telemetryError.value = false
    setTokenTarget(next.total_tokens)
  } catch {
    if (!request.signal.aborted) telemetryError.value = true
  } finally {
    if (telemetryRequest === request) telemetryRequest = null
    telemetryLoading.value = false
  }
}
const integrationSteps = [{ title: 'gateway.createAKey', body: 'gateway.signInAndCreateAnApiKey' }, { title: 'gateway.configureAccess', body: 'gateway.setYourEndpointKeyAndAvailableModel' }, { title: 'gateway.sendARequest', body: 'gateway.sendYourFirstRequestAndReviewIts' }]
const enterpriseBenefits = [{ icon: 'grid' as const, title: 'gateway.supportKnowledge', body: 'gateway.supportKnowledgeBody' }, { icon: 'book' as const, title: 'gateway.contentOperations', body: 'gateway.contentOperationsBody' }, { icon: 'chat' as const, title: 'gateway.internalTools', body: 'gateway.internalToolsBody' }]
const enterpriseSteps = [{ title: 'gateway.defineNeeds', body: 'gateway.defineNeedsBody' }, { title: 'gateway.smallValidation', body: 'gateway.smallValidationBody' }, { title: 'gateway.connectBusiness', body: 'gateway.connectBusinessBody' }]
const endpointCopied = ref(false)
const codeLanguages = ['Python', 'Node.js', 'cURL'] as const
const codeLanguage = ref<(typeof codeLanguages)[number]>('Python')
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
const reducedMotion = ref(motionPreference.matches)
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
const copyLabel = computed(() =>
  copyState.value === 'copied'
    ? t('gateway.copied')
    : copyState.value === 'failed'
      ? t('gateway.selectTheCodeToCopy')
      : t('gateway.copyCode')
)
const copyFeedback = computed(() =>
  copyState.value === 'idle' ? '' : copyLabel.value
)
const endpointUrl = computed(() => {
  const base = sanitizeUrl(props.apiBaseUrl || '') || window.location.origin
  const endpoint = new URL(base)
  endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, '').replace(/\/v1$/, '')}/v1`
  endpoint.search = ''
  endpoint.hash = ''
  return endpoint.toString().replace(/\/$/, '')
})
const installCommand = computed(() => codeLanguage.value === 'Python' ? 'pip install openai' : codeLanguage.value === 'Node.js' ? 'npm install openai' : 'curl --version')
const snippet = computed(() => codeLanguage.value === 'Python' ? `import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["ZIPKIWI_API_KEY"],
    base_url=${JSON.stringify(endpointUrl.value)}
)

response = client.chat.completions.create(
    model="YOUR_MODEL_ID",
    messages=[{"role": "user", "content": "Hello, AI."}]
)
print(response.choices[0].message.content)` : codeLanguage.value === 'Node.js' ? `import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.ZIPKIWI_API_KEY,
  baseURL: ${JSON.stringify(endpointUrl.value)}
});

const response = await client.chat.completions.create({
  model: 'YOUR_MODEL_ID',
  messages: [{ role: 'user', content: 'Hello, AI.' }]
});
console.log(response.choices[0].message.content);` : `curl ${endpointUrl.value}/chat/completions \\
  -H "Authorization: Bearer $ZIPKIWI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"YOUR_MODEL_ID","messages":[{"role":"user","content":"Hello, AI."}]}'`)

async function copyCode() {
  try {
    await navigator.clipboard.writeText(snippet.value)
    copyState.value = 'copied'
  } catch {
    copyState.value = 'failed'
  }
}
function openContactDialog() {
  emit('openContact')
}
async function copyEndpoint() {
  try { await navigator.clipboard.writeText(endpointUrl.value); endpointCopied.value = true }
  catch { endpointCopied.value = false }
}
function backToTop() {
  window.scrollTo({ top: 0, behavior: reducedMotion.value ? 'instant' : 'smooth' })
}
function updateMotion(event: MediaQueryListEvent) {
  reducedMotion.value = event.matches
  if (event.matches && telemetryFrame !== null && telemetry.value) {
    window.cancelAnimationFrame(telemetryFrame)
    telemetryFrame = null
    visibleTokens.value = telemetry.value.total_tokens
  }
}
function onAnchorClick(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null
  const id = link?.getAttribute('href')?.slice(1)
  if (!id) return
  const target = document.getElementById(id)
  if (!target) return
  event.preventDefault()
  window.scrollTo({
    top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - (document.querySelector('.public-header')?.clientHeight || 0) - 20),
    behavior: reducedMotion.value ? 'instant' : 'smooth'
  })
}
onMounted(() => {
  void loadTelemetry()
  telemetryTimer = setInterval(() => { void loadTelemetry() }, 15_000)
  document.addEventListener('visibilitychange', loadTelemetry)
  void loadPricing()
  pricingTimer = setInterval(() => { void loadPricing() }, 60_000)
  document.addEventListener('visibilitychange', loadPricing)
  motionPreference.addEventListener('change', updateMotion)
})
onBeforeUnmount(() => {
  if (telemetryTimer !== null) clearInterval(telemetryTimer)
  if (telemetryFrame !== null) window.cancelAnimationFrame(telemetryFrame)
  telemetryRequest?.abort()
  document.removeEventListener('visibilitychange', loadTelemetry)
  if (pricingTimer !== null) clearInterval(pricingTimer)
  pricingRequest?.abort()
  document.removeEventListener('visibilitychange', loadPricing)
  motionPreference.removeEventListener('change', updateMotion)
})
</script>

<style scoped src="./home-landing.css"></style>
<style scoped src="./home-final.css"></style>

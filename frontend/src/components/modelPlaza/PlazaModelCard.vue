<template>
  <article class="plaza-model-card">
    <div class="plaza-card-top">
      <span class="plaza-card-platform"><PlatformIcon :platform="model.platform as GroupPlatform" size="sm" /></span>
      <div><h3>{{ model.name }}</h3><p>{{ platformLabel(model.platform) }}</p></div>
      <button type="button" class="plaza-card-copy" :aria-label="t('modelPlaza.card.copyModel')" @click="copyToClipboard(model.name)"><Icon name="copy" size="sm" /></button>
    </div>
    <div class="plaza-card-meta"><span>{{ group.name }}</span><span>{{ appliedRate }}x</span></div>
    <p class="plaza-card-unit">{{ billingMode === BILLING_MODE_TOKEN ? t('modelPlaza.card.tokenUnit') : t('modelPlaza.card.requestUnit') }}</p>
    <div class="plaza-card-prices">
      <template v-if="billingMode === BILLING_MODE_TOKEN">
        <div><span>{{ t('modelPlaza.table.input') }}</span><strong>{{ tokenPrice(summaryPricing?.input_price) }}</strong></div>
        <div><span>{{ t('modelPlaza.table.output') }}</span><strong>{{ tokenPrice(summaryPricing?.output_price) }}</strong></div>
      </template>
      <div v-else><span>{{ billingMode === BILLING_MODE_IMAGE ? t('modelPlaza.table.perImage') : t('modelPlaza.table.perRequest') }}</span><strong>{{ requestPrice }} <small>{{ billingMode === BILLING_MODE_IMAGE ? t('modelPlaza.table.perUnitImage') : t('modelPlaza.table.perUnitRequest') }}</small></strong></div>
    </div>
    <dl v-if="billingMode === BILLING_MODE_TOKEN && summaryPricing?.cache_read_price != null" class="plaza-card-cache"><dt>{{ t('modelPlaza.table.cacheRead') }}</dt><dd>{{ tokenPrice(summaryPricing.cache_read_price) }}</dd></dl>
    <div class="plaza-card-bottom"><span>{{ t(variablePricing ? 'modelPlaza.card.variablePricing' : 'modelPlaza.card.basePricing') }}</span><button type="button" :aria-label="`${model.name} ${t('modelPlaza.card.details')}`" @click="$emit('showDetails')">{{ t('modelPlaza.card.details') }} <Icon name="arrowRight" size="sm" /></button></div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BILLING_MODE_IMAGE, BILLING_MODE_TOKEN } from '@/constants/channel'
import type { ModelPlazaGroup, PlazaModel } from '@/api/modelPlaza'
import type { GroupPlatform } from '@/types'
import { formatScaled, plazaEffectiveRate, plazaRate, resolveIntervalPrices, type PlazaRateConfig } from '@/utils/pricing'
import { hasPeakRate } from '@/utils/peak-rate'
import { platformLabel } from '@/utils/platformColors'
import { useClipboard } from '@/composables/useClipboard'
import Icon from '@/components/icons/Icon.vue'
import PlatformIcon from '@/components/common/PlatformIcon.vue'

const props = defineProps<{ group: ModelPlazaGroup; model: PlazaModel }>()
defineEmits<{ showDetails: [] }>()
const { t } = useI18n()
const { copyToClipboard } = useClipboard()
const billingMode = computed(() => props.model.pricing?.billing_mode || BILLING_MODE_TOKEN)
const rateConfig = computed<PlazaRateConfig>(() => ({
  rateMultiplier: props.group.rate_multiplier,
  userRateMultiplier: props.group.user_rate_multiplier,
  imageRateIndependent: props.group.image_rate_independent,
  imageRateMultiplier: props.group.image_rate_multiplier,
  videoRateIndependent: props.group.video_rate_independent,
  videoRateMultiplier: props.group.video_rate_multiplier
}))
const effectiveRate = computed(() => plazaEffectiveRate(rateConfig.value))
const appliedRate = computed(() => plazaRate(billingMode.value, rateConfig.value))
const firstInterval = computed(() => [...(props.model.pricing?.intervals ?? [])].sort((a, b) => a.min_tokens - b.min_tokens)[0])
const summaryPricing = computed(() => {
  const base = props.model.pricing
  return base && firstInterval.value ? resolveIntervalPrices(firstInterval.value, base) : base
})
const variablePricing = computed(() =>
  (props.model.pricing?.intervals?.length ?? 0) > 0 ||
  (props.model.time_pricing?.periods.length ?? 0) > 0 ||
  Object.values(props.model.pricing?.reasoning_effort_multipliers ?? {}).some(value => Number.isFinite(value) && value > 0 && value !== 1) ||
  hasPeakRate(props.group)
)
function tokenPrice(value: number | null | undefined) {
  return formatScaled(value == null ? null : value * effectiveRate.value, 1_000_000, 2)
}
const requestPrice = computed(() => {
  const value = firstInterval.value?.per_request_price ?? props.model.pricing?.per_request_price
  return formatScaled(value == null ? null : value * appliedRate.value, 1, 2)
})
</script>

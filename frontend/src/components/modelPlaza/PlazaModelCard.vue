<template>
  <article class="plaza-model-card">
    <div class="plaza-card-top">
      <span class="plaza-card-platform"><PlatformIcon :platform="model.platform as GroupPlatform" size="sm" /></span>
      <div><h3>{{ model.name }}</h3><p>{{ platformLabel(model.platform) }}</p></div>
      <button type="button" class="plaza-card-copy" :aria-label="t('modelPlaza.card.copyModel')" @click="copyToClipboard(model.name)"><Icon name="copy" size="sm" /></button>
    </div>
    <p class="plaza-card-id">{{ model.name }}</p>
    <div class="plaza-card-prices">
      <template v-if="billingMode === BILLING_MODE_TOKEN">
        <div><span>{{ t('modelPlaza.table.input') }}</span><strong>{{ tokenPrice(model.pricing?.input_price) }}</strong></div>
        <div><span>{{ t('modelPlaza.table.output') }}</span><strong>{{ tokenPrice(model.pricing?.output_price) }}</strong></div>
      </template>
      <div v-else><span>{{ billingMode === BILLING_MODE_IMAGE ? t('modelPlaza.table.perImage') : t('modelPlaza.table.perRequest') }}</span><strong>{{ requestPrice }} <small>{{ billingMode === BILLING_MODE_IMAGE ? t('modelPlaza.table.perUnitImage') : t('modelPlaza.table.perUnitRequest') }}</small></strong></div>
    </div>
    <div class="plaza-card-bottom"><span>{{ group.name }} · {{ appliedRate }}x</span><button type="button" @click="$emit('showDetails')">{{ t('modelPlaza.card.details') }} <Icon name="externalLink" size="sm" /></button></div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BILLING_MODE_IMAGE, BILLING_MODE_TOKEN } from '@/constants/channel'
import type { ModelPlazaGroup, PlazaModel } from '@/api/modelPlaza'
import type { GroupPlatform } from '@/types'
import { formatScaled, plazaEffectiveRate, plazaRate, type PlazaRateConfig } from '@/utils/pricing'
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
const billingCurrency = computed(() => props.group.billing_currency === 'CNY' ? 'CNY' : 'USD')
const effectiveRate = computed(() => plazaEffectiveRate(rateConfig.value))
const appliedRate = computed(() => plazaRate(billingMode.value, rateConfig.value))
function tokenPrice(value: number | null | undefined) {
  return formatScaled(value == null ? null : value * effectiveRate.value, 1_000_000, 2, billingCurrency.value)
}
const requestPrice = computed(() => {
  const value = props.model.pricing?.per_request_price
  return formatScaled(value == null ? null : value * appliedRate.value, 1, 2, billingCurrency.value)
})
</script>

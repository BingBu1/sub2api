<template>
  <div class="video-token-pricing" data-testid="video-token-pricing">
    <section v-for="model in models" :key="`${model.platform}:${model.name}`" class="border-t border-gray-100 dark:border-dark-700">
      <h3 class="break-words px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white">{{ model.name }}</h3>
      <p class="px-5 pb-3 text-xs leading-5 text-gray-500 dark:text-dark-400">
        {{ t(model.video_token_tiers?.some(tier => tier.estimated) ? 'modelPlaza.table.videoTokenEstimatedNote' : 'modelPlaza.table.videoTokenNote') }}
      </p>
      <table class="w-full border-collapse text-left text-sm tabular-nums">
        <caption class="px-5 pb-2 text-left text-xs text-gray-500 dark:text-dark-400">
          {{ t('modelPlaza.table.unitPerMillion', { currency: billingCurrency }) }}
        </caption>
        <thead class="border-y border-gray-100 text-xs text-gray-500 dark:border-dark-700 dark:text-dark-400">
          <tr>
            <th class="px-5 py-2 font-medium">{{ t('modelPlaza.table.videoCondition') }}</th>
            <th class="paid px-3 py-2 font-medium">{{ t('modelPlaza.table.paidPrice') }}</th>
            <th class="px-3 py-2 font-medium">{{ t('modelPlaza.table.officialPrice') }}</th>
            <th class="px-5 py-2 text-right font-medium">{{ t('modelPlaza.table.rate') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tier in model.video_token_tiers" :key="`${tier.resolution}:${tier.reference_video}`" class="border-b border-gray-100 last:border-0 dark:border-dark-800">
            <td :data-label="t('modelPlaza.table.videoCondition')" class="px-5 py-3 text-gray-700 dark:text-dark-200">
              {{ tier.resolution }} · {{ t(tier.reference_video ? 'modelPlaza.table.withReferenceVideo' : 'modelPlaza.table.withoutReferenceVideo') }}
            </td>
            <td :data-label="t('modelPlaza.table.paidPrice')" class="paid px-3 py-3 font-mono font-semibold text-gray-900 dark:text-gray-50">
              <PlazaPrice :value="tier.output_price * effectiveRate" :currency="billingCurrency" />
            </td>
            <td :data-label="t('modelPlaza.table.officialPrice')" class="px-3 py-3 font-mono text-gray-500 dark:text-dark-400">
              <PlazaPrice :value="tier.output_price" :currency="billingCurrency" />
            </td>
            <td :data-label="t('modelPlaza.table.rate')" class="px-5 py-3 text-right font-mono text-xs">
              <span v-if="hasCustomRate" class="mr-1 text-gray-400 line-through">{{ rateMultiplier }}x</span>
              <span class="font-semibold text-primary-600 dark:text-primary-400">{{ effectiveRate }}x</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PlazaModel } from '@/api/modelPlaza'
import { plazaEffectiveRate } from '@/utils/pricing'
import PlazaPrice from './PlazaPrice.vue'

const props = defineProps<{
  models: PlazaModel[]
  rateMultiplier: number
  userRateMultiplier?: number | null
}>()
const { t } = useI18n()
const billingCurrency = 'CNY'
// This adapter bills actual tokens using the group/user rate. Independent
// per-second video and peak rates are not part of its settlement path.
const effectiveRate = computed(() => plazaEffectiveRate(props))
const hasCustomRate = computed(() => props.userRateMultiplier != null && props.userRateMultiplier !== props.rateMultiplier)
</script>

<style scoped>
.paid { background: var(--pz-bg, #eef2fc); }
@container (max-width: 600px) {
  table, tbody { display: block; }
  caption { display: block; }
  thead { display: none; }
  tbody tr { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 8px 12px; }
  td { padding: 8px; text-align: left; min-width: 0; }
  td:first-child, td:last-child { grid-column: 1 / -1; }
  td::before { content: attr(data-label); display: block; margin-bottom: 4px; color: var(--plaza-muted, #52627e); font: 500 11px/16px system-ui, sans-serif; }
  td:first-child::before { display: none; }
  td:last-child { display: flex; align-items: center; gap: 8px; }
  td:last-child::before { margin-bottom: 0; }
}
</style>

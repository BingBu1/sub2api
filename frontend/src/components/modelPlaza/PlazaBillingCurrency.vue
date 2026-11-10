<template>
  <section class="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-800 sm:p-5" aria-labelledby="billing-currency-title">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h2 id="billing-currency-title" class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('modelPlaza.currency.title') }}</h2>
          <span class="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-dark-700 dark:text-dark-300">{{ t('modelPlaza.currency.adminOnly') }}</span>
        </div>
        <p class="mt-1 text-xs leading-5 text-gray-500 dark:text-dark-400">{{ platform === 'all' ? t('modelPlaza.currency.selectPlatform') : t('modelPlaza.currency.scope', { platform: platformName }) }}</p>
      </div>
      <span v-if="savedPolicy && !loading" class="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">{{ t('modelPlaza.currency.active', { currency: savedPolicy.currency }) }}</span>
    </div>

    <p v-if="loading" role="status" class="mt-4 text-sm text-gray-500">{{ t('common.loading') }}</p>
    <div v-else-if="savedPolicy" class="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div class="space-y-4">
        <fieldset :disabled="saving" class="min-w-0">
          <legend class="sr-only">{{ t('modelPlaza.currency.title') }}</legend>
          <div class="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-dark-900/70">
            <label v-for="option in currencyOptions" :key="option.value" class="relative cursor-pointer rounded-lg">
              <input v-model="currency" type="radio" name="billing-currency" :value="option.value" class="peer sr-only" />
              <span class="flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition peer-checked:bg-white peer-checked:text-gray-900 peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 dark:text-dark-400 dark:peer-checked:bg-dark-700 dark:peer-checked:text-white">
                <span class="text-base">{{ option.symbol }}</span>{{ t(option.label) }}
              </span>
            </label>
          </div>
        </fieldset>
        <label v-if="platform === 'deepseek'" class="flex min-h-12 cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-200 p-3 dark:border-dark-700">
          <span class="min-w-0">
            <span class="block text-sm font-medium text-gray-900 dark:text-white">{{ t('modelPlaza.currency.deepseekPeakLabel') }}</span>
            <span class="mt-1 block text-xs leading-5 text-gray-500 dark:text-dark-400">{{ t('modelPlaza.currency.deepseekPeakHelp') }}</span>
          </span>
          <span class="relative mt-0.5 inline-flex shrink-0">
            <input v-model="deepseekPeakEnabled" type="checkbox" role="switch" :disabled="saving" class="peer sr-only" :aria-label="t('modelPlaza.currency.deepseekPeakLabel')" />
            <span class="h-6 w-11 rounded-full bg-gray-200 transition peer-checked:bg-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50 dark:bg-dark-600"></span>
            <span class="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></span>
          </span>
        </label>
        <div v-if="currency === 'CNY'">
          <label for="billing-currency-rate" class="block text-xs font-medium text-gray-700 dark:text-dark-200">{{ t('modelPlaza.currency.rateLabel') }}</label>
          <div class="mt-2 flex items-center gap-3">
            <span class="shrink-0 text-sm text-gray-500 dark:text-dark-400">1 USD =</span>
            <input id="billing-currency-rate" v-model.number="rate" type="number" inputmode="decimal" min="0.01" max="100" step="0.0001" :disabled="saving" class="input min-h-11 min-w-0 max-w-44 text-base tabular-nums" aria-describedby="currency-rate-help" />
            <span class="text-sm text-gray-500 dark:text-dark-400">CNY</span>
          </div>
          <p id="currency-rate-help" class="mt-2 text-xs leading-5 text-gray-500 dark:text-dark-400">{{ t('modelPlaza.currency.rateHelp') }}</p>
          <p v-if="!validRate" class="mt-1 text-xs text-red-600">{{ t('modelPlaza.currency.invalidRate') }}</p>
        </div>
      </div>

      <div class="rounded-xl bg-gray-50 p-4 dark:bg-dark-900/40">
        <p class="text-xs font-medium text-gray-500 dark:text-dark-400">{{ t('modelPlaza.currency.preview') }}</p>
        <p class="mt-2 text-sm font-semibold leading-6 text-gray-900 dark:text-white">{{ preview }}</p>
        <p class="mt-2 text-xs leading-5 text-gray-500 dark:text-dark-400">{{ t('modelPlaza.currency.deductionHelp') }}</p>
        <p v-if="platform === 'deepseek'" class="mt-2 text-xs leading-5 text-gray-500 dark:text-dark-400">{{ t(deepseekPeakEnabled ? 'modelPlaza.currency.deepseekPeakOn' : 'modelPlaza.currency.deepseekPeakOff') }}</p>
      </div>

      <div class="flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-dark-700 sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
        <p class="text-xs leading-5 text-gray-500 dark:text-dark-400">{{ t('modelPlaza.currency.effectiveHelp') }}</p>
        <button type="button" class="btn btn-primary min-h-11 shrink-0" :disabled="saving || !dirty || !validRate" @click="save">{{ saving ? t('modelPlaza.currency.saving') : t('modelPlaza.currency.save') }}</button>
      </div>
    </div>
    <div v-if="message" role="status" aria-live="polite" class="mt-3 text-sm" :class="failed ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'">
      {{ message }}
      <button v-if="failed && !savedPolicy && platform !== 'all'" type="button" class="ml-2 min-h-11 underline underline-offset-4" @click="load">{{ t('modelPlaza.retry') }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getPlatformBillingCurrency, updatePlatformBillingCurrency, type PlatformBillingCurrency } from '@/api/modelPlaza'

const props = defineProps<{ platform: string }>()
const emit = defineEmits<{ saved: [] }>()
const { t } = useI18n()
const savedPolicy = ref<PlatformBillingCurrency | null>(null)
const currency = ref<'USD' | 'CNY'>('USD')
const deepseekPeakEnabled = ref(false)
const rate = ref<number | string>(6.6702)
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const failed = ref(false)
let generation = 0
const platformName = computed(() => props.platform === 'deepseek' ? 'DeepSeek' : props.platform)
const currencyOptions = [
  { value: 'USD', symbol: '$', label: 'modelPlaza.currency.usd' },
  { value: 'CNY', symbol: '¥', label: 'modelPlaza.currency.cny' }
] as const
const validRate = computed(() => typeof rate.value === 'number' && Number.isFinite(rate.value) && rate.value >= 0.01 && rate.value <= 100)
const dirty = computed(() => savedPolicy.value && (
  currency.value !== savedPolicy.value.currency || rate.value !== savedPolicy.value.usd_to_cny ||
  (props.platform === 'deepseek' && deepseekPeakEnabled.value !== !!savedPolicy.value.deepseek_peak_enabled)
))
const preview = computed(() => {
  if (currency.value === 'USD') return t('modelPlaza.currency.usdExample')
  return t('modelPlaza.currency.cnyExample', { amount: validRate.value ? rate.value : '—' })
})

async function load() {
  const version = ++generation
  const platform = props.platform
  savedPolicy.value = null
  message.value = ''
  failed.value = false
  saving.value = false
  loading.value = platform !== 'all'
  if (platform === 'all') return
  try {
    const policy = await getPlatformBillingCurrency(platform)
    if (version !== generation) return
    savedPolicy.value = policy
    currency.value = policy.currency
    deepseekPeakEnabled.value = !!policy.deepseek_peak_enabled
    rate.value = policy.usd_to_cny
  } catch {
    if (version !== generation) return
    failed.value = true
    message.value = t('modelPlaza.currency.loadFailed')
  } finally {
    if (version === generation) loading.value = false
  }
}

async function save() {
  if (saving.value || !savedPolicy.value || !validRate.value || !dirty.value) return
  const version = generation
  const policy: PlatformBillingCurrency = { platform: props.platform, currency: currency.value, usd_to_cny: Number(rate.value) }
  if (props.platform === 'deepseek') policy.deepseek_peak_enabled = deepseekPeakEnabled.value
  saving.value = true
  message.value = ''
  failed.value = false
  try {
    const saved = await updatePlatformBillingCurrency(policy)
    emit('saved')
    if (version !== generation) return
    savedPolicy.value = saved
    message.value = t('modelPlaza.currency.saved', { platform: platformName.value, currency: saved.currency })
  } catch {
    if (version !== generation) return
    failed.value = true
    message.value = t('modelPlaza.currency.saveFailed')
  } finally {
    if (version === generation) saving.value = false
  }
}

watch(() => props.platform, load, { immediate: true })
</script>

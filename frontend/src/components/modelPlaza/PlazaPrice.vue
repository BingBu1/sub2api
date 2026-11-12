<template>
  <span :title="expandedPrice" :aria-label="expandedPrice">{{ displayPrice }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatScaled } from '@/utils/pricing'

const props = withDefaults(defineProps<{
  value?: number | null
  scale?: number
  currency?: 'USD' | 'CNY'
}>(), { scale: 1_000_000, currency: 'USD' })

const amount = computed(() => props.value == null ? null : props.value * props.scale)
const fullPrice = computed(() => formatScaled(amount.value, 1, 2, props.currency))
const displayPrice = computed(() => formatScaled(
  amount.value == null ? null : Number(amount.value.toPrecision(4)), 1, 2, props.currency
))
const expandedPrice = computed(() => displayPrice.value === fullPrice.value ? undefined : fullPrice.value)
</script>

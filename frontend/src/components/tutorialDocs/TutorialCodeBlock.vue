<template>
  <div class="tutorial-code-block">
    <div class="tutorial-code-toolbar">
      <span>{{ label }}</span>
      <button type="button" :aria-label="t(copied ? 'tutorials.copied' : 'tutorials.copy')" @click="copyCode">
        <Icon :name="copied ? 'check' : 'copy'" size="sm" />
        {{ t(copied ? 'tutorials.copied' : 'tutorials.copy') }}
      </button>
    </div>
    <pre tabindex="0" :aria-label="label"><code>{{ code }}</code></pre>
    <span :class="failed ? 'tutorial-copy-error' : 'sr-only'" role="status" aria-live="polite">{{ failed ? t('tutorials.copyFailed') : copied ? t('tutorials.copied') : '' }}</span>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps<{ label: string; code: string }>()
const { t } = useI18n()
const copied = ref(false)
const failed = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined

async function copyCode() {
  clearTimeout(resetTimer)
  failed.value = false
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    resetTimer = setTimeout(() => { copied.value = false }, 1800)
  } catch {
    copied.value = false
    failed.value = true
  }
}
onBeforeUnmount(() => clearTimeout(resetTimer))
</script>

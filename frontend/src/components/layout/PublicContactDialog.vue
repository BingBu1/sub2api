<template>
  <dialog
    ref="businessDialog"
    class="business-dialog"
    aria-labelledby="business-title"
    aria-describedby="contact-description"
    @click="closeDialogBackdrop"
    @close="resetCopy"
  >
    <button type="button" class="contact-close" autofocus :aria-label="t('gateway.close')" @click="businessDialog?.close()">
      <Icon name="x" size="sm" aria-hidden="true" />
    </button>
    <div class="contact-avatar" aria-hidden="true"><Icon name="chat" size="xl" /><span class="contact-dot" /></div>
    <p class="contact-brand">{{ siteName }}</p>
    <h2 id="business-title">{{ t('gateway.contactGreeting') }}</h2>
    <p id="contact-description">{{ t('gateway.contactDescription') }}</p>
    <div v-if="contactValue.trim()" class="contact-details">
      <div class="contact-account">
        <p class="contact-label">{{ t('gateway.contactDetails') }}</p>
        <p class="contact-value">{{ contactValue }}</p>
      </div>
      <div class="contact-actions">
        <button type="button" class="contact-copy" :class="{ 'is-copied': contactCopied }" :aria-label="t('gateway.copyContact')" :disabled="copying" :aria-busy="copying" @click="copyContact($event)">
          <Icon :name="contactCopied ? 'check' : 'copy'" size="sm" aria-hidden="true" />
          <span>{{ contactCopied ? t('gateway.contactCopiedAction') : t('gateway.copyContact') }}</span>
        </button>
        <a v-if="contactUrl" :href="contactUrl" target="_blank" rel="noopener noreferrer" class="contact-open">
          {{ t('gateway.openContactLink') }}<Icon name="externalLink" size="sm" aria-hidden="true" />
        </a>
      </div>
      <p class="contact-feedback" :class="{ 'is-error': copyFailed, 'is-success': contactCopied }" role="status" aria-live="polite" aria-atomic="true">{{ copyFailed ? t('gateway.contactCopyFailed') : contactCopied ? t('common.copiedToClipboard') : t('gateway.contactCopyHint') }}</p>
    </div>
    <p v-else class="contact-empty">{{ t('gateway.contactDetailsAreNotConfiguredSignIn') }}</p>
  </dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '@/composables/useClipboard'
import { sanitizeUrl } from '@/utils/url'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps<{ siteName: string; contactInfo?: string }>()
const { t } = useI18n()
const businessDialog = ref<HTMLDialogElement | null>(null)
const { copyToClipboard } = useClipboard({ showToast: false })
const contactCopied = ref(false)
const copying = ref(false)
const copyFailed = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined
let copyVersion = 0
const contactValue = computed(() => props.contactInfo || '')
const contactUrl = computed(() => sanitizeUrl(contactValue.value))

function closeDialogBackdrop(event: MouseEvent) {
  const dialog = businessDialog.value
  if (!dialog || event.target !== dialog) return
  const bounds = dialog.getBoundingClientRect()
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  ) dialog.close()
}

async function copyContact(event: MouseEvent) {
  if (copying.value) return
  const button = event.currentTarget instanceof HTMLButtonElement ? event.currentTarget : null
  resetCopy()
  const version = copyVersion
  copying.value = true
  const success = await copyToClipboard(contactValue.value, t('common.copiedToClipboard'))
  if (version !== copyVersion) return
  copying.value = false
  copyFailed.value = !success
  if (success) {
    contactCopied.value = true
    resetTimer = setTimeout(resetCopy, 3000)
  }
  await nextTick()
  if (businessDialog.value?.open && (document.activeElement === document.body || document.activeElement === businessDialog.value)) button?.focus({ preventScroll: true })
}
function resetCopy() {
  clearTimeout(resetTimer)
  copyVersion++
  contactCopied.value = false
  copying.value = false
  copyFailed.value = false
}
function open() {
  resetCopy()
  if (!businessDialog.value?.open) businessDialog.value?.showModal()
}

watch(() => props.contactInfo, resetCopy)
onBeforeUnmount(resetCopy)
defineExpose({ open })
</script>

<style scoped src="./public-contact-dialog.css"></style>

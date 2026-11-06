<template>
  <dialog
    ref="businessDialog"
    class="business-dialog"
    aria-labelledby="business-title"
    aria-describedby="contact-description"
    @click="closeDialogBackdrop"
  >
    <button type="button" class="contact-close" :aria-label="t('gateway.close')" @click="businessDialog?.close()">
      <Icon name="x" size="md" />
    </button>
    <div class="contact-brand"><BirdMark /><span>{{ siteName }}</span></div>
    <h2 id="business-title">{{ t('gateway.contactUs') }}</h2>
    <p id="contact-description">{{ t('gateway.contactDescription') }}</p>
    <div v-if="contacts.length" class="contact-details">
      <section v-for="(contact, index) in contacts" :key="index" class="contact-method">
        <p class="contact-label">{{ contact.label }}</p>
        <p class="contact-value">{{ contact.value }}</p>
        <div class="contact-actions">
          <button type="button" class="contact-copy" :aria-label="`${t('common.copy')} ${contact.label}`" @click="copyContact(contact.value, index)">
            <Icon :name="contactCopied && copiedIndex === index ? 'check' : 'copy'" size="sm" />
            <span>{{ contactCopied && copiedIndex === index ? t('common.copied') : t('common.copy') }}</span>
          </button>
          <a v-if="contact.url" :href="contact.url" target="_blank" rel="noopener noreferrer" class="contact-open">
            {{ t('gateway.openContactLink') }}<Icon name="externalLink" size="sm" />
          </a>
        </div>
      </section>
      <span class="sr-only" role="status">{{ contactCopied ? t('common.copied') : '' }}</span>
    </div>
    <p v-else class="contact-empty">{{ t('gateway.contactDetailsAreNotConfiguredSignIn') }}</p>
  </dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '@/composables/useClipboard'
import { sanitizeUrl } from '@/utils/url'
import Icon from '@/components/icons/Icon.vue'
import BirdMark from '@/components/home/BirdMark.vue'

const props = defineProps<{ siteName: string; contactInfo?: string }>()
const { t } = useI18n()
const businessDialog = ref<HTMLDialogElement | null>(null)
const { copied: contactCopied, copyToClipboard } = useClipboard()
const copiedIndex = ref<number | null>(null)
const contacts = computed(() => (props.contactInfo || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
  const match = line.match(/^(微信(?:号)?|WeChat|QQ(?:号|群(?:号)?)?|邮箱|Email|电话|手机(?:号)?|Telegram)\s*[:：]\s*(.+)$/i)
  const value = match?.[2]?.trim() || line
  return { label: match?.[1] || t('gateway.contactDetails'), value, url: sanitizeUrl(value) }
}))

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

async function copyContact(value: string, index: number) {
  contactCopied.value = false
  copiedIndex.value = null
  if (await copyToClipboard(value, t('common.copiedToClipboard'))) copiedIndex.value = index
}
function open() {
  contactCopied.value = false
  copiedIndex.value = null
  businessDialog.value?.showModal()
}

defineExpose({ open })
</script>

<style scoped src="./public-contact-dialog.css"></style>

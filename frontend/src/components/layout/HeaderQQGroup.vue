<template>
  <div class="header-qq-group">
    <button type="button" class="qq-group-open" :aria-label="entryLabel" :title="entryLabel" @click="open">
      <span class="qq-group-icon"><Icon name="gift" size="md" aria-hidden="true" /></span>
      <span class="qq-group-text"><small>{{ t('common.qqGroupGift') }}</small><strong>{{ t('common.qqGroupNumber', { number: groupNumber }) }}</strong></span>
    </button>
    <dialog ref="dialog" class="business-dialog" aria-labelledby="qq-group-title" @click="closeBackdrop" @close="copyFailed = false">
      <button type="button" class="contact-close" autofocus :aria-label="t('gateway.close')" @click="dialog?.close()">
        <Icon name="x" size="sm" aria-hidden="true" />
      </button>
      <div class="contact-avatar" aria-hidden="true"><Icon name="gift" size="xl" /></div>
      <h2 id="qq-group-title">{{ t('common.qqGroupGift') }}</h2>
      <div class="contact-details">
        <div class="contact-account">
          <p class="contact-label">{{ t('common.qqCommunity') }}</p>
          <p class="contact-value">{{ groupNumber }}</p>
        </div>
        <div class="contact-actions">
          <a :href="joinUrl" class="contact-copy">{{ t('common.openQQGroup') }}<Icon name="externalLink" size="sm" aria-hidden="true" /></a>
          <button type="button" class="contact-open" :disabled="copying" @click="copyNumber">
            <Icon :name="copied ? 'check' : 'copy'" size="sm" aria-hidden="true" />
            {{ copied ? t('common.copied') : t('common.copyQQGroup') }}
          </button>
        </div>
        <p class="contact-feedback" :class="{ 'is-error': copyFailed }" role="status" aria-live="polite">{{ copyFailed ? t('common.copyFailed') : copied ? t('common.copiedToClipboard') : t('common.qqGroupHint') }}</p>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { useClipboard } from '@/composables/useClipboard'

const groupNumber = '678277929'
const joinUrl = `mqqapi://card/show_pslcard?src_type=internal&version=1&uin=${groupNumber}&card_type=group&source=qrcode`
const { t } = useI18n()
const entryLabel = computed(() => `${t('common.qqGroupGift')} · ${t('common.qqGroupNumber', { number: groupNumber })}`)
const dialog = ref<HTMLDialogElement | null>(null)
const { copied, copyToClipboard } = useClipboard({ showToast: false })
const copying = ref(false)
const copyFailed = ref(false)

function open() {
  copied.value = false
  copyFailed.value = false
  if (!dialog.value?.open) dialog.value?.showModal()
}

async function copyNumber() {
  if (copying.value) return
  copying.value = true
  copyFailed.value = !(await copyToClipboard(groupNumber))
  copying.value = false
}

function closeBackdrop(event: MouseEvent) {
  if (!dialog.value || event.target !== dialog.value) return
  const bounds = dialog.value.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.value.close()
}
</script>

<style scoped src="./public-contact-dialog.css"></style>
<style scoped>
.header-qq-group { flex-shrink: 0; }
.qq-group-open { display: flex; align-items: center; gap: 9px; padding: 4px 10px 4px 4px; border: 1px solid var(--support-line); border-radius: 12px; background: var(--support-surface); color: var(--support-ink); text-align: left; }
.qq-group-icon { display: grid; place-items: center; flex: 0 0 34px; height: 34px; border-radius: 9px; background: var(--support-surface-alt); color: var(--support-blue); }
.qq-group-text { display: flex; flex-direction: column; gap: 1px; white-space: nowrap; }
.qq-group-text small { color: var(--support-muted); font-size: 10px; line-height: 1.3; }
.qq-group-text strong { font-size: 12px; line-height: 1.5; font-weight: 600; }
.qq-group-open:hover .qq-group-icon { background: var(--support-surface-hover); }
.qq-group-open:focus-visible { outline: 2px solid var(--support-blue); outline-offset: 3px; }
@media (max-width: 1399px) {
  .qq-group-open { padding: 0; border: 0; background: transparent; }
  .qq-group-text { display: none; }
  .qq-group-icon { flex-basis: 36px; height: 36px; }
}
</style>

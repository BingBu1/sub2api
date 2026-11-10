<template>
  <div v-if="contactInfo.trim()" class="header-support">
    <button type="button" class="header-support-open" :aria-label="t('common.dedicatedSupport')" :title="contactInfo" @click="dialog?.open()">
      <span class="header-support-icon"><Icon name="headphones" size="md" aria-hidden="true" /></span>
      <span class="header-support-text"><small>{{ t('common.dedicatedSupport') }}</small><strong>{{ contactInfo }}</strong></span>
    </button>
    <button type="button" class="header-support-copy" :aria-label="t('gateway.copyContact')" @click="copyToClipboard(contactInfo)">
      <Icon :name="copied ? 'check' : 'copy'" size="sm" aria-hidden="true" />
      <span>{{ copied ? t('common.copied') : t('common.copy') }}</span>
    </button>
    <PublicContactDialog ref="dialog" :site-name="siteName" :contact-info="contactInfo" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import PublicContactDialog from './PublicContactDialog.vue'
import { useClipboard } from '@/composables/useClipboard'

defineProps<{ contactInfo: string; siteName: string }>()
const { t } = useI18n()
const { copied, copyToClipboard } = useClipboard()
const dialog = ref<InstanceType<typeof PublicContactDialog> | null>(null)
</script>

<style scoped>
.header-support { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 4px 6px 4px 4px; border: 1px solid var(--support-line); border-radius: 12px; background: var(--support-surface); color: var(--support-ink); }
.header-support-open { display: flex; align-items: center; gap: 9px; min-width: 0; text-align: left; }
.header-support-icon { display: grid; place-items: center; flex: 0 0 34px; height: 34px; border-radius: 9px; background: var(--support-surface-alt); color: var(--support-blue); }
.header-support-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; max-width: 200px; }
.header-support-text small { color: var(--support-muted); font-size: 10px; line-height: 1.3; }
.header-support-text strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 1.5; font-weight: 600; }
.header-support-copy { display: inline-flex; align-items: center; justify-content: center; gap: 5px; flex-shrink: 0; min-height: 32px; padding: 6px 8px; border-radius: 7px; background: var(--support-surface-alt); color: var(--support-blue); font-size: 11px; }
.header-support-copy:hover, .header-support-open:hover .header-support-icon { background: var(--support-surface-hover); }
.header-support :is(button):focus-visible { outline: 2px solid var(--support-blue); outline-offset: 3px; }
@media (max-width: 1399px) {
  .header-support { padding: 0; border: 0; background: transparent; }
  .header-support-text, .header-support-copy { display: none; }
  .header-support-icon { flex-basis: 36px; height: 36px; }
}
</style>

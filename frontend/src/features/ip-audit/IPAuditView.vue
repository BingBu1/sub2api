<template>
  <AppLayout>
    <div class="w-full min-w-0 pb-8">
      <SecurityAuditNav active="/admin/ip-audit" />
      <div class="card px-4 sm:px-6 lg:px-8"><IPAuditPanel /></div>
    </div>
  </AppLayout>
</template>
<script setup lang="ts">
import SecurityAuditNav from '@/components/admin/security/SecurityAuditNav.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import IPAuditPanel from './IPAuditPanel.vue'
</script>

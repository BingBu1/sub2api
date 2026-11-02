<template>
  <div class="plaza-content plaza-theme space-y-5" :class="{ 'is-embedded': embedded }">
    <!-- 页头(独立形态下展示标题;后台形态 AppHeader 已有页面标题) -->
    <div v-if="!embedded" class="plaza-intro">
      <div>
        <span class="plaza-intro-kicker">{{ t('modelPlaza.card.tagline') }}</span>
        <h1>{{ t('modelPlaza.title') }}</h1>
        <p>{{ t('modelPlaza.description') }}</p>
      </div>
      <div class="plaza-hero-search">
        <Icon name="search" size="sm" />
        <input v-model="searchQuery" type="search" :aria-label="t('modelPlaza.filters.modelLabel')" :placeholder="t('modelPlaza.filters.searchPlaceholder')" />
      </div>
    </div>

    <!-- 全局价格说明(管理员配置,Markdown) -->
    <div
      v-if="descriptionHtml"
      class="plaza-description rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm dark:border-dark-700 dark:bg-dark-800/50"
      v-html="descriptionHtml"
    ></div>

    <!-- 未登录提示 -->
    <p
      v-if="!isAuthenticated"
      class="plaza-anonymous flex items-center gap-2 text-sm"
    >
      <Icon name="infoCircle" size="xs" class="h-3.5 w-3.5" />
      {{ t('modelPlaza.anonymousHint') }}
    </p>

    <!-- 加载/错误/空 -->
    <div v-if="loading" class="flex min-h-[240px] items-center justify-center">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary-600/25 border-t-primary-600 dark:border-primary-400/25 dark:border-t-primary-400"></div>
    </div>
    <div
      v-else-if="error"
      class="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
    >
      {{ t('modelPlaza.loadFailed') }}
    </div>
    <template v-else>
      <div id="model-catalog" class="plaza-catalog-layout">
        <aside class="plaza-filter-sidebar" :aria-label="t('modelPlaza.card.filterTitle')">
          <div class="plaza-filter-heading"><strong>{{ t('modelPlaza.card.filterTitle') }}</strong><button type="button" @click="resetFilters">{{ t('modelPlaza.card.reset') }}</button></div>
          <PlazaFilterBar
            :platforms="platforms"
            :groups="groupOptions"
            :rates="rates"
            :platform="selectedPlatform"
            :group-id="selectedGroupId"
            :rate="selectedRate"
            :search="searchQuery"
            :hide-search="!embedded"
            @update:platform="selectedPlatform = $event"
            @update:group-id="selectedGroupId = $event"
            @update:rate="selectedRate = $event"
            @update:search="searchQuery = $event"
          />
        </aside>
        <div class="plaza-results">
          <div class="plaza-results-toolbar">
            <span>{{ t('modelPlaza.card.priceNote') }}</span>
            <div class="plaza-view-switch" role="group" :aria-label="t('modelPlaza.card.viewMode')">
              <button type="button" :aria-pressed="viewMode === 'cards'" @click="viewMode = 'cards'"><Icon name="grid" size="sm" />{{ t('modelPlaza.card.cards') }}</button>
              <button type="button" :aria-pressed="viewMode === 'table'" @click="viewMode = 'table'"><Icon name="menu" size="sm" />{{ t('modelPlaza.card.table') }}</button>
            </div>
          </div>
          <template v-if="filteredGroups.length > 0 && (viewMode === 'table' || cardModels.length > 0)">
            <div v-if="viewMode === 'cards'" class="plaza-card-grid">
              <PlazaModelCard v-for="item in cardModels" :key="`${item.group.id}:${item.model.name}`" :group="item.group" :model="item.model" @show-details="showDetails(item.group.id)" />
            </div>
            <div v-else class="plaza-groups space-y-6">
              <PlazaGroupSection v-for="g in filteredGroups" :key="g.id" :group="g" />
            </div>
          </template>
          <div v-else class="plaza-empty">
            {{ searchActive ? t('modelPlaza.noSearchResult') : filteredGroups.length ? t('modelPlaza.detail.noModels') : t('modelPlaza.empty') }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import Icon from '@/components/icons/Icon.vue'
import PlazaFilterBar from './PlazaFilterBar.vue'
import PlazaGroupSection from './PlazaGroupSection.vue'
import PlazaModelCard from './PlazaModelCard.vue'
import type { ModelPlazaGroup, ModelPlazaResponse } from '@/api/modelPlaza'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  response: ModelPlazaResponse | null
  loading: boolean
  error?: boolean
  /** 后台内嵌形态(AppLayout 内):隐藏页头。 */
  embedded?: boolean
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)

const selectedPlatform = ref<string>('all')
const selectedGroupId = ref<number | 'all'>('all')
const selectedRate = ref<number | 'all'>('all')
const searchQuery = ref('')
const viewMode = ref<'cards' | 'table'>(props.embedded ? 'table' : 'cards')

function resetFilters() {
  selectedPlatform.value = 'all'
  selectedGroupId.value = 'all'
  selectedRate.value = 'all'
  searchQuery.value = ''
}

function showDetails(groupId: number) {
  selectedGroupId.value = groupId
  viewMode.value = 'table'
}

const searchActive = computed(() => searchQuery.value.trim() !== '')

const descriptionHtml = computed(() => {
  const md = props.response?.description?.trim()
  if (!md) return ''
  return DOMPurify.sanitize(marked.parse(md) as string)
})

/** 生效倍率 = 用户专属倍率 ?? 分组默认倍率。 */
function effectiveRate(g: ModelPlazaGroup): number {
  return g.user_rate_multiplier ?? g.rate_multiplier
}

const platforms = computed(() =>
  [...new Set((props.response?.groups ?? []).map((g) => g.platform).filter(Boolean))].sort()
)

const groupOptions = computed(() =>
  (props.response?.groups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    platform: g.platform,
    rate: effectiveRate(g)
  }))
)

/** 全量生效倍率;当前组合下不可用的项由 FilterBar 置灰而非隐藏。 */
const rates = computed(() =>
  [...new Set((props.response?.groups ?? []).map(effectiveRate))].sort((a, b) => a - b)
)

/** 数据刷新后选中的倍率可能不复存在,重置为全部。 */
watch(rates, (list) => {
  if (selectedRate.value !== 'all' && !list.includes(selectedRate.value)) {
    selectedRate.value = 'all'
  }
})

const filteredGroups = computed(() => {
  let groups = props.response?.groups ?? []
  if (selectedPlatform.value !== 'all') {
    groups = groups.filter((g) => g.platform === selectedPlatform.value)
  }
  if (selectedGroupId.value !== 'all') {
    groups = groups.filter((g) => g.id === selectedGroupId.value)
  }
  if (selectedRate.value !== 'all') {
    groups = groups.filter((g) => effectiveRate(g) === selectedRate.value)
  }
  // 模型名搜索:分组内只留命中的模型,整组无命中则隐藏该分组。
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    groups = groups
      .map((g) => ({ ...g, models: g.models.filter((m) => m.name.toLowerCase().includes(q)) }))
      .filter((g) => g.models.length > 0)
  }
  // 专属倍率会改变生效值,不能只依赖后端按默认倍率的排序。
  return [...groups].sort(
    (a, b) => effectiveRate(a) - effectiveRate(b) || a.name.localeCompare(b.name)
  )
})

const cardModels = computed(() => filteredGroups.value.flatMap(group =>
  group.models.map(model => ({ group, model }))
))
</script>

<style scoped>
.plaza-description {
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.plaza-description :deep(h1),
.plaza-description :deep(h2),
.plaza-description :deep(h3) {
  @apply mb-2 mt-3 font-semibold text-gray-900 first:mt-0 dark:text-white;
}

.plaza-description :deep(p) {
  @apply mb-2 text-gray-700 last:mb-0 dark:text-dark-200;
}

.plaza-description :deep(a) {
  @apply text-primary-600 underline underline-offset-4 hover:text-primary-700 dark:text-primary-300;
}

.plaza-description :deep(ul) {
  @apply mb-2 list-disc pl-5;
}

.plaza-description :deep(ol) {
  @apply mb-2 list-decimal pl-5;
}

.plaza-description :deep(li) {
  @apply mb-0.5 text-gray-700 dark:text-dark-200;
}

.plaza-description :deep(code) {
  @apply rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-dark-800;
}

.plaza-description :deep(blockquote) {
  @apply my-2 border-l-4 border-gray-300 pl-3 text-gray-600 dark:border-dark-600 dark:text-dark-300;
}
</style>

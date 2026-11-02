<template>
  <div
    class="gateway-landing"
    :class="{ 'is-dark': isDark, 'motion-paused': reducedMotion }"
    data-testid="gateway-landing"
    @click="onAnchorClick"
  >
    <div
      ref="header"
      class="site-header"
      :style="{ '--page-progress': pageProgress }"
    >
      <div class="container">
        <header>
          <router-link class="brand" to="/home" :aria-label="siteName">
            <img v-if="selectedBrand" class="brand-lockup" src="/zipkiwi-lockup-white.svg" alt="" />
            <template v-else>
              <img v-if="siteLogo" :src="siteLogo" alt="" />
              <BirdMark v-else />
              {{ siteName }}
            </template>
          </router-link>
          <nav
            id="main-navigation"
            :class="{ open: menuOpen }"
            :aria-label="t('gateway.mainNavigation')"
            @click="menuOpen = false"
          >
            <router-link
              v-if="showModelPlaza"
              to="/model-plaza"
            >
              {{ t('gateway.modelHub') }}
            </router-link>
            <a
              v-for="chapter in chapters"
              :key="chapter.id"
              :href="`#${chapter.id}`"
              :class="{ 'is-current': activeChapter === chapter.id }"
              :aria-current="activeChapter === chapter.id ? 'location' : undefined"
            >
              {{ t(chapter.label) }}
            </a>
            <button type="button" @click="openContactDialog">{{ t('gateway.contactUs') }}</button>
          </nav>
          <div class="actions">
            <LocaleSwitcher />
            <button
              type="button"
              class="theme-toggle"
              :aria-label="
                isDark ? t('home.switchToLight') : t('home.switchToDark')
              "
              @click="$emit('toggleTheme')"
            >
              <Icon :name="isDark ? 'sun' : 'moon'" size="md" />
            </button>
            <router-link class="button" :to="destination">
              {{ t('gateway.console') }}
              <Icon name="grid" size="sm" class="action-icon" />
            </router-link>
          </div>
          <button
            ref="menuToggle"
            type="button"
            class="mobile-menu-toggle"
            :aria-label="
              menuOpen
                ? t('gateway.closeNavigationMenu')
                : t('gateway.openNavigationMenu')
            "
            aria-controls="main-navigation"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            <Icon :name="menuOpen ? 'x' : 'menu'" size="md" />
          </button>
        </header>
      </div>
    </div>
    <main>
      <div class="hero-shell">
        <div class="container">
          <section class="hero">
            <div class="hero-copy">
              <div class="badge">{{ t('gateway.heroBadge') }}</div>
              <h1>
                {{ t('gateway.heroTitleFirst') }}
                <br />
                <span>{{ t('gateway.heroTitleSecond') }}</span>
              </h1>
              <p class="lead">
                {{ t('gateway.heroDescriptionFirst') }}
                <br />
                {{ t('gateway.heroDescriptionSecond') }}
              </p>
              <div class="hero-cta">
                <router-link class="button" :to="destination">
                  {{ t('gateway.startIntegration') }}
                  <Icon name="link" size="sm" class="action-icon" />
                </router-link>
                <a
                  class="button secondary"
                  :href="docUrl || '#integration'"
                  :target="docUrl ? '_blank' : undefined"
                  :rel="docUrl ? 'noopener noreferrer' : undefined"
                >
                  {{ t('gateway.quickStart') }}
                  <Icon name="book" size="sm" class="action-icon" />
                </a>
              </div>
              <div class="hero-benefits">
                <span>{{ t('gateway.unifiedEndpoint') }}</span>
                <span>{{ t('gateway.multipleModels') }}</span>
                <span>{{ t('gateway.usageVisibility') }}</span>
              </div>
            </div>
            <div
              class="network-scene"
              :aria-label="t('gateway.featuredModelFamilies')"
            >
              <div class="network-title">ZIPKIWI / INTELLIGENCE NETWORK <span>CONCEPT DEMO</span></div>
              <div class="network-globe" aria-hidden="true"><div class="network-core"><BirdMark /><strong>{{ siteName }}</strong><small>INTELLIGENCE HUB</small></div></div>
              <div class="network-models">
                <component
                  v-for="(model, index) in models"
                  :key="model.name"
                  :is="showModelPlaza ? RouterLink : 'span'"
                  class="network-model"
                  :class="`n${index + 1}`"
                  :to="showModelPlaza ? '/model-plaza' : undefined"
                >
                  <strong>{{ model.name }}</strong>
                  <small>{{ model.maker }}</small>
                </component>
              </div>
              <div class="network-caption">01 / Aggregating <span>MODEL ECOSYSTEM</span></div>
            </div>
          </section>
          <div class="hero-bottom"><small>{{ t('gateway.modelFamiliesShownForIllustrationCheckThe') }}</small><span v-for="model in models" :key="model.name">{{ model.name }}</span></div>
        </div>
      </div>
      <section class="telemetry-section" aria-labelledby="network-overview-title">
        <div class="container telemetry-layout">
          <div><h2 id="network-overview-title">{{ t('gateway.networkOverview') }}</h2><p>{{ t('gateway.networkDemoNote') }}</p></div>
          <div class="telemetry-flow" aria-hidden="true"><span>API</span><i></i><span>{{ siteName }}</span><i></i><span>AI</span></div>
          <div class="telemetry-families"><strong>{{ t('gateway.modelFamilies') }}</strong><span>{{ models.map(model => model.name).join(' · ') }}</span></div>
        </div>
      </section>
      <section class="pricing-section module-section" id="models">
        <div class="container pricing-layout">
          <div><p class="module-label">{{ t('gateway.modelsAndPricing') }}</p><h2>{{ t('gateway.chooseModelWithClarity') }}</h2><p>{{ t('gateway.pricingDescription') }}</p></div>
          <div class="pricing-actions"><router-link v-if="showModelPlaza" class="button" to="/model-plaza">{{ t('gateway.exploreAllModels') }} <Icon name="chevronRight" size="sm" /></router-link><router-link v-if="!isAuthenticated" class="textlink" to="/login">{{ t('gateway.signInForPricing') }} <Icon name="chevronRight" size="sm" /></router-link></div>
        </div>
      </section>
      <section class="container module-section" id="platform">
        <div class="section-heading">
          <div>
            <p class="module-label" data-chapter="01">
              {{ t('gateway.coreFeatures') }}
            </p>
            <h2>{{ t('gateway.fromModelAccessToUsageManagement') }}</h2>
          </div>
          <router-link class="textlink" :to="destination">
            {{ t('gateway.openWorkspace') }}
            <Icon name="grid" size="sm" class="action-icon" />
          </router-link>
        </div>
        <div class="feature-grid">
          <component
            :is="showModelPlaza ? RouterLink : 'span'"
            class="feature-item"
            :to="showModelPlaza ? '/model-plaza' : undefined"
          >
            <div class="feature-visual" aria-hidden="true">
              <div class="mini-route">
                <span>APP</span>
                <i></i>
                <b>{{ siteName }}</b>
                <i></i>
                <span>AI</span>
              </div>
            </div>
            <h3>
              {{ t('gateway.unifiedModelAccess') }}
              <Icon name="chevronRight" size="sm" class="action-icon" />
            </h3>
            <p>
              {{ t('gateway.connectModelsThroughOneGatewayAndChoose') }}
            </p>
          </component>
          <router-link
            class="feature-item"
            :to="isAuthenticated ? '/keys' : '/login'"
          >
            <div class="feature-visual" aria-hidden="true">
              <div class="key-demo">
                <span>sk-•••• •••• ••••</span>
                <b>✓</b>
                <i></i>
              </div>
            </div>
            <h3>
              {{ t('gateway.apiKeyManagement') }}
              <Icon name="chevronRight" size="sm" class="action-icon" />
            </h3>
            <p>
              {{ t('gateway.createKeysForYourApplicationsAndManage') }}
            </p>
          </router-link>
          <router-link
            class="feature-item"
            :to="isAuthenticated ? '/usage' : '/login'"
          >
            <div class="feature-visual" aria-hidden="true">
              <div class="request-demo">
                <span>
                  POST /v1/…
                  <b>200</b>
                </span>
                <span>
                  POST /v1/…
                  <b>200</b>
                </span>
                <span>
                  POST /v1/…
                  <b>200</b>
                </span>
              </div>
            </div>
            <h3>
              {{ t('gateway.requestHistory') }}
              <Icon name="chevronRight" size="sm" class="action-icon" />
            </h3>
            <p>
              {{ t('gateway.reviewRequestRecordsStatusAndUsage') }}
            </p>
          </router-link>
          <router-link
            class="feature-item"
            :to="isAuthenticated ? '/usage' : '/login'"
          >
            <div class="feature-visual" aria-hidden="true">
              <div class="bars-demo">
                <i style="--h: 35%; --d: 0s"></i>
                <i style="--h: 55%; --d: 0.3s"></i>
                <i style="--h: 43%; --d: 0.6s"></i>
                <i style="--h: 78%; --d: 0.8999999999999999s"></i>
                <i style="--h: 63%; --d: 1.2s"></i>
                <i style="--h: 88%; --d: 1.5s"></i>
                <i style="--h: 71%; --d: 1.7999999999999998s"></i>
                <i style="--h: 95%; --d: 2.1s"></i>
              </div>
            </div>
            <h3>
              {{ t('gateway.usageAndSpend') }}
              <Icon name="chevronRight" size="sm" class="action-icon" />
            </h3>
            <p>
              {{ t('gateway.understandConsumptionToInformModelChoicesAnd') }}
            </p>
          </router-link>
        </div>
        <p class="module-note">
          {{ t('gateway.animationsIllustrateWorkflowsCheckTheConsoleFor') }}
        </p>
      </section>
      <section class="value-section" id="value" :data-active-value="activeValue">
        <div class="container value-grid">
          <div class="value-orbit" aria-hidden="true">
            <div class="value-ring ring-one"></div>
            <div class="value-ring ring-two"></div>
            <div class="value-ring ring-three"></div>
            <span class="orbit-tag tag-a">API</span>
            <span class="orbit-tag tag-b">MODEL</span>
            <span class="orbit-tag tag-c">USAGE</span>
            <div class="value-hub">
              <BirdMark />
              <strong>{{ siteName }}</strong>
            </div>
            <small>ONE CONNECTION. MORE POSSIBILITIES.</small>
          </div>
          <div>
            <p class="module-label" data-chapter="02">
              {{ t('gateway.whyZipkiwi') }}
            </p>
            <h2>
              {{ t('gateway.lessIntegrationWork') }}
              <br />
              {{ t('gateway.moreRoomToCreate') }}
            </h2>
            <div class="value-list">
              <div
                tabindex="0"
                @mouseenter="activeValue = 0"
                @focus="activeValue = 0"
                @click="activeValue = 0"
              >
                <h3>{{ t('gateway.simplerDevelopment') }}</h3>
                <p>{{ t('gateway.configureACentralEndpointAndFocusOn') }}</p>
              </div>
              <div
                tabindex="0"
                @mouseenter="activeValue = 1"
                @focus="activeValue = 1"
                @click="activeValue = 1"
              >
                <h3>{{ t('gateway.moreFlexibleModelChoices') }}</h3>
                <p>{{ t('gateway.compareModelsForRealTasksAndKeep') }}</p>
              </div>
              <div
                tabindex="0"
                @mouseenter="activeValue = 2"
                @focus="activeValue = 2"
                @click="activeValue = 2"
              >
                <h3>{{ t('gateway.clearerCostDecisions') }}</h3>
                <p>{{ t('gateway.useRequestAndCostRecordsToFind') }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="container module-section" id="audiences">
        <div class="section-heading">
          <div>
            <p class="module-label" data-chapter="03">
              {{ t('gateway.enterpriseService') }}
            </p>
            <h2>{{ t('gateway.enterpriseHeadline') }}</h2>
          </div>
          <button class="textlink" type="button" @click="openContactDialog">{{ t('gateway.contactUs') }} <Icon name="chevronRight" size="sm" /></button>
        </div>
        <div
          class="audience-tabs"
          role="tablist"
          :aria-label="t('gateway.useCases98')"
        >
          <button
            role="tab"
            id="audience-tab-0"
            :aria-selected="audience === 0"
            aria-controls="audience-panel-0"
            :tabindex="audience === 0 ? 0 : -1"
            @click="audience = 0"
            @keydown="onTabKey($event, 0)"
          >
            {{ t('gateway.individualsDevelopers') }}
          </button>
          <button
            role="tab"
            id="audience-tab-1"
            :aria-selected="audience === 1"
            aria-controls="audience-panel-1"
            :tabindex="audience === 1 ? 0 : -1"
            @click="audience = 1"
            @keydown="onTabKey($event, 1)"
          >
            {{ t('gateway.businessesTeams') }}
          </button>
          <button
            role="tab"
            id="audience-tab-2"
            :aria-selected="audience === 2"
            aria-controls="audience-panel-2"
            :tabindex="audience === 2 ? 0 : -1"
            @click="audience = 2"
            @keydown="onTabKey($event, 2)"
          >
            {{ t('gateway.educationResearch') }}
          </button>
        </div>
        <div
          class="audience-panel"
          role="tabpanel"
          id="audience-panel-0"
          aria-labelledby="audience-tab-0"
          :hidden="audience !== 0"
          tabindex="0"
        >
          <div>
            <h3>{{ t('gateway.bringYourFirstVersionToLife') }}</h3>
            <p>
              {{ t('gateway.exploreModelCapabilitiesWithFamiliarToolsFrom') }}
            </p>
            <div class="audience-tags">
              <span>{{ t('gateway.learning') }}</span>
              <span>{{ t('gateway.coding') }}</span>
              <span>{{ t('gateway.prototyping') }}</span>
            </div>
            <router-link class="textlink" :to="destination">
              {{ t('gateway.startExploring') }}
              <Icon name="chevronRight" size="sm" class="action-icon" />
            </router-link>
          </div>
          <div class="scenario-scene developer" aria-hidden="true">
            <div class="scenario-window">
              <div class="window-dots">
                ● ● ●
                <span>{{ siteName }} / developer</span>
              </div>
              <div class="terminal-lines">
                <span>
                  <em>const</em>
                  idea = "Hello, AI";
                </span>
                <span>
                  <em>await</em>
                  zipkiwi.connect(idea);
                </span>
                <span class="terminal-response">
                  → Ready to build
                  <b>▍</b>
                </span>
              </div>
            </div>
            <small>{{ t('gateway.workflowIllustration') }}</small>
          </div>
        </div>
        <div
          class="audience-panel"
          role="tabpanel"
          id="audience-panel-1"
          aria-labelledby="audience-tab-1"
          :hidden="audience !== 1"
          tabindex="0"
        >
          <div>
            <h3>{{ t('gateway.connectAiToYourBusiness') }}</h3>
            <p>
              {{
                t('gateway.exploreCustomerSupportContentProcessingAndInternal')
              }}
            </p>
            <div class="audience-tags">
              <span>{{ t('gateway.businessApps') }}</span>
              <span>{{ t('gateway.internalTools') }}</span>
              <span>{{ t('gateway.validation') }}</span>
            </div>
            <router-link class="textlink" :to="destination">
              {{ t('gateway.startExploring') }}
              <Icon name="chevronRight" size="sm" class="action-icon" />
            </router-link>
          </div>
          <div class="scenario-scene business" aria-hidden="true">
            <div class="scenario-window">
              <div class="window-dots">
                ● ● ●
                <span>{{ siteName }} / business</span>
              </div>
              <div class="workflow">
                <span>INPUT</span>
                <i>→</i>
                <b>AI</b>
                <i>→</i>
                <span>OUTPUT</span>
              </div>
              <div class="workflow-pulse"></div>
            </div>
            <small>{{ t('gateway.workflowIllustration') }}</small>
          </div>
        </div>
        <div
          class="audience-panel"
          role="tabpanel"
          id="audience-panel-2"
          aria-labelledby="audience-tab-2"
          :hidden="audience !== 2"
          tabindex="0"
        >
          <div>
            <h3>{{ t('gateway.connectPossibilitiesForYourNextDiscovery') }}</h3>
            <p>
              {{
                t(
                  'gateway.supportCourseworkModelComparisonsAndExperimentalPrototypes'
                )
              }}
            </p>
            <div class="audience-tags">
              <span>{{ t('gateway.coursework') }}</span>
              <span>{{ t('gateway.evaluation') }}</span>
              <span>{{ t('gateway.research') }}</span>
            </div>
            <router-link class="textlink" :to="destination">
              {{ t('gateway.startExploring') }}
              <Icon name="chevronRight" size="sm" class="action-icon" />
            </router-link>
          </div>
          <div class="scenario-scene research" aria-hidden="true">
            <div class="scenario-window">
              <div class="window-dots">
                ● ● ●
                <span>{{ siteName }} / research</span>
              </div>
              <div class="research-chart">
                <div>
                  <span>MODEL A</span>
                  <i style="--w: 78%; --d: 0s"></i>
                </div>
                <div>
                  <span>MODEL B</span>
                  <i style="--w: 92%; --d: 0.5s"></i>
                </div>
                <div>
                  <span>MODEL C</span>
                  <i style="--w: 65%; --d: 1s"></i>
                </div>
              </div>
            </div>
            <small>{{ t('gateway.workflowIllustration') }}</small>
          </div>
        </div>
      </section>
      <section class="integration module-section" id="integration">
        <div class="container">
          <div class="section-heading">
            <div>
              <p class="module-label" data-chapter="04">
                {{ t('gateway.quickStart') }}
              </p>
              <h2>{{ t('gateway.threeStepsToYourFirstRequest') }}</h2>
            </div>
            <a
              class="textlink"
              :href="docUrl || '#integration'"
              :target="docUrl ? '_blank' : undefined"
              :rel="docUrl ? 'noopener noreferrer' : undefined"
            >
              {{ t('gateway.viewDocumentation') }}
              <Icon name="book" size="sm" class="action-icon" />
            </a>
          </div>
          <ol class="quick-steps">
            <li style="--d: 0s">
              <b>01</b>
              <h3>{{ t('gateway.createAKey') }}</h3>
              <p>{{ t('gateway.signInAndCreateAnApiKey') }}</p>
            </li>
            <li style="--d: 1.8s">
              <b>02</b>
              <h3>{{ t('gateway.configureAccess') }}</h3>
              <p>{{ t('gateway.setYourEndpointKeyAndAvailableModel') }}</p>
            </li>
            <li style="--d: 3.6s">
              <b>03</b>
              <h3>{{ t('gateway.sendARequest') }}</h3>
              <p>{{ t('gateway.sendYourFirstRequestAndReviewIts') }}</p>
            </li>
          </ol>
          <details class="code-details">
            <summary>
              {{ t('gateway.showPythonIntegrationExample') }}
              <span>＋</span>
            </summary>
            <div class="code">
              <div class="codebar">
                <span>{{ t('gateway.pythonIntegrationExample') }}</span>
                <button type="button" class="copy" @click="copyCode">
                  {{ copyLabel }}
                </button>
                <span class="sr-only" role="status">{{ copyFeedback }}</span>
              </div>
              <pre id="snippet"><code>{{ snippet }}</code></pre>
              <div class="codehint">
                {{ t('gateway.replaceTheEndpointAndModelWithYour') }}
              </div>
            </div>
          </details>
        </div>
      </section>
      <section class="container module-section faq-section" id="faq">
        <div>
          <p class="module-label" data-chapter="05">{{ t('gateway.faq') }}</p>
          <h2>
            {{ t('gateway.beforeYouBegin') }}
            <br />
            {{ t('gateway.aFewUsefulAnswers') }}
          </h2>
          <p>{{ t('gateway.fromChoosingAModelToYourFirst') }}</p>
        </div>
        <div class="faq-list">
          <details>
            <summary>
              {{ t('gateway.whichModelsAreAvailableAndWhereCan') }}
              <span>＋</span>
            </summary>
            <p>{{ t('gateway.checkTheConsoleForAvailableModelsAnd') }}</p>
          </details>
          <details>
            <summary>
              {{ t('gateway.howDoIConnectAnExistingApplication') }}
              <span>＋</span>
            </summary>
            <p>
              {{ t('gateway.checkProtocolCompatibilityThenUpdateTheEndpoint') }}
            </p>
          </details>
          <details>
            <summary>
              {{ t('gateway.whichClientsAndToolsCanIUse') }}
              <span>＋</span>
            </summary>
            <p>{{ t('gateway.toolsWithAConfigurableEndpointAndApi') }}</p>
          </details>
          <details>
            <summary>
              {{ t('gateway.howAreUsageAndCostsCalculated') }}
              <span>＋</span>
            </summary>
            <p>{{ t('gateway.costsDependOnTheSelectedModelAnd') }}</p>
          </details>
          <details>
            <summary>
              {{ t('gateway.whatIfARequestFailsOrIs') }}
              <span>＋</span>
            </summary>
            <p>{{ t('gateway.checkYourKeyBalanceModelIdAnd') }}</p>
          </details>
          <details>
            <summary>
              {{ t('gateway.howDoIProtectOrRevokeAn') }}
              <span>＋</span>
            </summary>
            <p>{{ t('gateway.storeKeysServerSideOrInSecure') }}</p>
          </details>
        </div>
      </section>
      <div class="cta-shell">
        <div class="container">
          <section class="cta">
            <div>
              <h2>{{ t('gateway.connectYourNextIdea') }}</h2>
              <p>
                {{
                  t('gateway.buildYourAiApplicationWithZipkiwi', { siteName })
                }}
              </p>
            </div>
            <router-link class="button" :to="destination">
              {{ t('gateway.getStarted') }}
              <Icon name="link" size="sm" class="action-icon" />
            </router-link>
          </section>
        </div>
      </div>
    </main>
    <div class="site-footer">
      <div class="container">
        <footer>
          <router-link class="brand" to="/home">
            <img v-if="selectedBrand" class="brand-lockup" :src="isDark ? '/zipkiwi-lockup-white.svg' : '/zipkiwi-lockup-primary.svg'" :alt="siteName" />
            <template v-else>
              <img v-if="siteLogo" :src="siteLogo" alt="" />
              <BirdMark v-else />
              {{ siteName }}
            </template>
          </router-link>
          <span>
            © {{ new Date().getFullYear() }} {{ siteName }}
            <br />
            {{ t('gateway.modelAvailabilityAndFeaturesDependOnYour') }}
          </span>
        </footer>
      </div>
    </div>

    <div class="home-float-actions" :class="{ 'has-backtop': showBackToTop }" role="group" :aria-label="t('gateway.pageTools')">
      <HelpTooltip class="home-contact-float" :content="t('gateway.contactUs')" width-class="w-max">
        <template #trigger>
          <button type="button" class="home-float-button contact-trigger" :aria-label="t('gateway.contactUs')" aria-haspopup="dialog" @click="openContactDialog">
            <Icon name="chat" size="lg" />
          </button>
        </template>
      </HelpTooltip>
      <Transition name="home-float-pop">
        <HelpTooltip v-if="showBackToTop" class="backtop-float" :content="t('gateway.backToTop')" width-class="w-max">
          <template #trigger>
            <button type="button" class="home-float-button backtop-trigger" :aria-label="t('gateway.backToTop')" @click="backToTop">
              <Icon name="arrowUp" size="lg" />
            </button>
          </template>
        </HelpTooltip>
      </Transition>
    </div>

    <dialog
      ref="businessDialog"
      class="business-dialog"
      aria-labelledby="business-title"
      aria-describedby="contact-description"
      @click="closeDialogBackdrop"
    >
      <div class="contact-dialog-header">
        <span class="contact-brand"><BirdMark />{{ siteName }}</span>
        <button type="button" class="theme-toggle" :aria-label="t('gateway.close')" autofocus @click="businessDialog?.close()">
          <Icon name="x" size="md" />
        </button>
      </div>
      <h2 id="business-title">{{ t('gateway.contactUs') }}</h2>
      <p id="contact-description" class="contact-description">{{ t('gateway.contactDescription') }}</p>
      <div v-if="contactText" class="contact-details">
        <span>{{ t('gateway.contactDetails') }}</span>
        <p>{{ contactText }}</p>
      </div>
      <p v-else class="contact-empty">{{ t('gateway.contactDetailsAreNotConfiguredSignIn') }}</p>
      <button v-if="contactDigits" type="button" class="button contact-copy" @click="copyContact">
        <Icon :name="contactCopied ? 'check' : 'copy'" size="sm" />
        {{ contactCopied ? t('common.copied') : t('gateway.copyContact') }}
      </button>
      <span class="sr-only" role="status">{{ contactCopied ? t('common.copied') : '' }}</span>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import HelpTooltip from '@/components/common/HelpTooltip.vue'
import { useClipboard } from '@/composables/useClipboard'
import { sanitizeUrl } from '@/utils/url'
import { isSelectedZipkiwiBrand } from '@/utils/zipkiwiBrand'
import BirdMark from './BirdMark.vue'

const props = defineProps<{
  siteName: string
  siteLogo?: string
  docUrl: string
  apiBaseUrl?: string
  contactInfo?: string
  isDark: boolean
  isAuthenticated: boolean
  dashboardPath: string
  registrationEnabled: boolean
  showModelPlaza: boolean
}>()
const emit = defineEmits<{ toggleTheme: []; openContact: [] }>()
const { t } = useI18n()
const selectedBrand = computed(() => isSelectedZipkiwiBrand(props.siteName, props.siteLogo || ''))
const { copied: contactCopied, copyToClipboard } = useClipboard()
const contactText = computed(() => props.contactInfo?.trim() || '')
const contactDigits = computed(() => contactText.value.match(/\d+/g)?.join('') || '')
const destination = computed(() =>
  props.isAuthenticated ? props.dashboardPath : '/login'
)
const models = [
  { name: 'GPT', maker: 'OpenAI', description: 'gateway.writingDevelopment' },
  {
    name: 'Claude',
    maker: 'Anthropic',
    description: 'gateway.analysisLongForm'
  },
  {
    name: 'Gemini',
    maker: 'Google',
    description: 'gateway.multimodalCreative'
  },
  { name: 'DeepSeek', maker: 'DeepSeek', description: 'gateway.reasoningCode' },
  { name: 'Grok', maker: 'xAI', description: 'gateway.qAIdeas' },
  { name: 'Kimi', maker: 'Moonshot AI', description: 'gateway.readingCreation' }
]

const audience = ref(1)
const activeValue = ref(0)
const chapters = [
  { id: 'platform', label: 'gateway.coreFeatures' },
  { id: 'integration', label: 'gateway.quickStart' },
  { id: 'audiences', label: 'gateway.enterpriseService' }
]
const activeChapter = ref('')
let chapterElements: HTMLElement[] = []
const menuOpen = ref(false)
const header = ref<HTMLElement | null>(null)
const pageProgress = ref(0)
const showBackToTop = ref(false)
let scrollFrame: number | null = null
const menuToggle = ref<HTMLButtonElement | null>(null)
const businessDialog = ref<HTMLDialogElement | null>(null)
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
const desktopPreference = window.matchMedia('(min-width: 1191px)')
const reducedMotion = ref(motionPreference.matches)
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
const copyLabel = computed(() =>
  copyState.value === 'copied'
    ? t('gateway.copied')
    : copyState.value === 'failed'
      ? t('gateway.selectTheCodeToCopy')
      : t('gateway.copyCode')
)
const copyFeedback = computed(() =>
  copyState.value === 'idle' ? '' : copyLabel.value
)
const snippet = computed(() => {
  const base = sanitizeUrl(props.apiBaseUrl || '') || window.location.origin
  const endpoint = new URL(base)
  endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, '').replace(/\/v1$/, '')}/v1`
  endpoint.search = ''
  endpoint.hash = ''
  return `import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["API_KEY"],
    base_url=${JSON.stringify(endpoint.toString())}
)

response = client.chat.completions.create(
    model="YOUR_MODEL_ID",
    messages=[{"role": "user", "content": "Hello, AI."}]
)
print(response.choices[0].message.content)`
})

async function copyCode() {
  try {
    await navigator.clipboard.writeText(snippet.value)
    copyState.value = 'copied'
  } catch {
    copyState.value = 'failed'
  }
}
function openContactDialog() {
  contactCopied.value = false
  emit('openContact')
  businessDialog.value?.showModal()
}
async function copyContact() {
  await copyToClipboard(contactDigits.value, t('common.copiedToClipboard'))
}
function backToTop() {
  window.scrollTo({ top: 0, behavior: reducedMotion.value ? 'instant' : 'smooth' })
}
function onTabKey(event: KeyboardEvent, index: number) {
  let next: number
  switch (event.key) {
    case 'ArrowRight':
      next = (index + 1) % 3
      break
    case 'ArrowLeft':
      next = (index + 2) % 3
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = 2
      break
    default:
      return
  }
  event.preventDefault()
  audience.value = next
  const tabList = (event.currentTarget as HTMLElement).parentElement
  tabList?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
}
function closeDialogBackdrop(event: MouseEvent) {
  const dialog = businessDialog.value
  if (!dialog || event.target !== dialog) return
  const bounds = dialog.getBoundingClientRect()
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    dialog.close()
}
function updateMotion(event: MediaQueryListEvent) {
  reducedMotion.value = event.matches
}
function closeMenu() {
  menuOpen.value = false
}
function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && menuOpen.value) {
    closeMenu()
    menuToggle.value?.focus()
  }
}
function onOutsideClick(event: MouseEvent) {
  if (event.target instanceof Node && !header.value?.contains(event.target))
    closeMenu()
}
function onAnchorClick(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null
  const id = link?.getAttribute('href')?.slice(1)
  if (!id) return
  const target = chapterElements.find((section) => section.id === id)
  if (!target) return
  event.preventDefault()
  window.scrollTo({
    top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - (header.value?.offsetHeight || 0) - 20),
    behavior: reducedMotion.value ? 'instant' : 'smooth'
  })
}
function updatePageProgress() {
  showBackToTop.value = window.scrollY > 400
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  pageProgress.value =
    scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0
  activeChapter.value = ''
  for (const section of chapterElements) {
    if (section.getBoundingClientRect().top <= window.innerHeight * 0.32)
      activeChapter.value = section.id
  }
  scrollFrame = null
}
function queuePageProgress() {
  if (scrollFrame === null)
    scrollFrame = window.requestAnimationFrame(updatePageProgress)
}
onMounted(() => {
  chapterElements = chapters.flatMap(({ id }) => {
    const section = header.value?.parentElement?.querySelector<HTMLElement>(`#${id}`)
    return section ? [section] : []
  })
  updatePageProgress()
  window.addEventListener('scroll', queuePageProgress, { passive: true })
  window.addEventListener('resize', queuePageProgress)
  motionPreference.addEventListener('change', updateMotion)
  desktopPreference.addEventListener('change', closeMenu)
  document.addEventListener('keydown', onEscape)
  document.addEventListener('click', onOutsideClick)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', queuePageProgress)
  window.removeEventListener('resize', queuePageProgress)
  if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame)
  motionPreference.removeEventListener('change', updateMotion)
  desktopPreference.removeEventListener('change', closeMenu)
  document.removeEventListener('keydown', onEscape)
  document.removeEventListener('click', onOutsideClick)
})
</script>

<style scoped src="./home-landing.css"></style>
<style scoped src="./home-final.css"></style>

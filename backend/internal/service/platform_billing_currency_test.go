//go:build unit

package service

import (
	"context"
	"encoding/json"
	"math"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

func currencyTestEnv(t *testing.T, platform string) (*BillingService, *ModelPricingResolver, *SettingService, *Group) {
	t.Helper()
	settings := NewSettingService(&currencySettingRepo{newMockSettingRepo()}, &config.Config{})
	billing := NewBillingService(&config.Config{}, nil)
	r := NewModelPricingResolver(nil, billing)
	r.currencySettings = settings
	g := &Group{ID: 10, Platform: platform, RateMultiplier: 1, LongContextPricingEnabled: true}
	return billing, r, settings, g
}

func setCurrency(t *testing.T, settings *SettingService, platform, currency string, rate float64) {
	t.Helper()
	_, err := settings.UpdatePlatformBillingCurrency(context.Background(), PlatformBillingCurrency{Platform: platform, Currency: currency, USDToCNY: rate})
	require.NoError(t, err)
}

func TestPlatformBillingCurrencyOfficialDeepSeekAndDeduction(t *testing.T) {
	b, r, settings, g := currencyTestEnv(t, "deepseek")
	setCurrency(t, settings, g.Platform, "CNY", 6.6702)
	for _, tc := range []struct {
		model                string
		hour                 int
		input, output, cache float64
	}{
		{"deepseek-v4.1-flash", 12, .15 * 6.6702, .6 * 6.6702, .003 * 6.6702},
		{"deepseek-flash", 2, .15 * 6.6702, .6 * 6.6702, .003 * 6.6702},
		{"deepseek-v4-flash-vision-exp", 12, .15 * 6.6702, .6 * 6.6702, .003 * 6.6702},
		{"deepseek-v4-pro", 12, .15 * 6.6702, .6 * 6.6702, .003 * 6.6702},
	} {
		t.Run(tc.model+time.Duration(tc.hour).String(), func(t *testing.T) {
			cost, err := b.CalculateTokenCostForRequest(TokenCostRequest{Ctx: WithRequestPricingSnapshot(context.Background()), Model: tc.model, Group: g, Tokens: UsageTokens{InputTokens: 1_000_000, OutputTokens: 1_000_000, CacheReadTokens: 1_000_000}, RateMultiplier: 1.5, PricingAt: time.Date(2026, 10, 26, tc.hour, 0, 0, 0, time.UTC), Resolver: r})
			require.NoError(t, err)
			require.InDelta(t, tc.input, cost.InputCost, 1e-9)
			require.InDelta(t, tc.output, cost.OutputCost, 1e-9)
			require.InDelta(t, tc.cache, cost.CacheReadCost, 1e-9)
			require.InDelta(t, (tc.input+tc.output+tc.cache)*1.5, cost.ActualCost, 1e-9)
			require.NotNil(t, cost.SourceTotalCost)
			cmd := buildUsageBillingCommand("cny-request", &UsageLog{Model: tc.model}, &postUsageBillingParams{Cost: cost, User: &User{ID: 1}, APIKey: &APIKey{ID: 2, Quota: 100, RateLimit5h: 10}, Account: &Account{ID: 3, Type: AccountTypeAPIKey}, APIKeyService: apiKeyQuotaUpdaterStub{}, AccountRateMultiplier: 1})
			require.InDelta(t, cost.ActualCost, cmd.BalanceCost, 1e-8)
			require.InDelta(t, cost.ActualCost, cmd.APIKeyQuotaCost, 1e-8)
			require.InDelta(t, cost.ActualCost, cmd.APIKeyRateLimitCost, 1e-8)
			log := &UsageLog{}
			preserveCurrencyAccountStats(log, cost)
			require.Equal(t, cost.SourceTotalCost, log.AccountStatsCost)
		})
	}
}

// The public price card and actual balance deduction must agree at every hour,
// including the former implicit peak windows and weekends.
func TestPlatformBillingCurrencyDeepSeekAllDayMatchesPlaza(t *testing.T) {
	for _, currency := range []string{"USD", "CNY"} {
		t.Run(currency, func(t *testing.T) {
			g := Group{ID: 28, Platform: PlatformDeepseek, RateMultiplier: .15, LongContextPricingEnabled: true,
				ModelAllowlist: GroupModelAllowlist{Enabled: true, Models: []string{"deepseek-flash", "deepseek-v4.1-flash", "deepseek-v4-pro"}}}
			svc := newPlazaServiceWithBilling([]Channel{{ID: 1, Name: "deepseek", Status: StatusActive, GroupIDs: []int64{g.ID}, ModelPricing: []ChannelModelPricing{{Platform: g.Platform, Models: g.ModelAllowlist.Models, BillingMode: BillingModeToken}}}}, []Group{g}, map[int64]string{g.ID: g.Platform}, nil)
			settings := NewSettingService(&currencySettingRepo{newMockSettingRepo()}, &config.Config{})
			svc.resolver.currencySettings = settings
			setCurrency(t, settings, g.Platform, currency, 7)
			groups, err := svc.ListGroups(context.Background())
			require.NoError(t, err)
			require.Len(t, groups, 1)
			require.Equal(t, currency, groups[0].BillingCurrency)
			require.Len(t, groups[0].Models, 3)
			for _, m := range groups[0].Models {
				input, output, cache := .15, .6, .003
				if currency == "CNY" {
					input, output, cache = input*7, output*7, cache*7
				}
				require.NotNil(t, m.Pricing)
				require.InDelta(t, input, *m.Pricing.InputPrice*1e6, 1e-9)
				require.InDelta(t, output, *m.Pricing.OutputPrice*1e6, 1e-9)
				require.InDelta(t, cache, *m.Pricing.CacheReadPrice*1e6, 1e-9)
				require.Nil(t, m.TimePricing)
				require.InDelta(t, input, *m.OfficialPricing.InputPrice*1e6, 1e-9, "reference and paid card share the currency")
				for _, day := range []int{24, 25, 26} {
					for hour := 0; hour < 24; hour++ {
						for _, rate := range []float64{.15, .25, .1, 0} {
							cost, err := svc.billingService.CalculateTokenCostForRequest(TokenCostRequest{
								Ctx: WithRequestPricingSnapshot(context.Background()), Model: m.Name, Group: &g,
								Tokens:         UsageTokens{InputTokens: 1_000_000, OutputTokens: 1_000_000, CacheReadTokens: 1_000_000},
								RateMultiplier: rate, Resolver: svc.resolver, PricingAt: time.Date(2026, 10, day, hour, 0, 0, 0, time.UTC),
							})
							require.NoError(t, err)
							require.InDelta(t, (input+output+cache)*rate, cost.ActualCost, 1e-9, "%s day=%d hour=%d rate=%v", m.Name, day, hour, rate)
							cmd := buildUsageBillingCommand("uniform-price", &UsageLog{Model: m.Name}, &postUsageBillingParams{
								Cost: cost, User: &User{ID: 1}, APIKey: &APIKey{ID: 2, Quota: 100},
								Account: &Account{ID: 3, Type: AccountTypeAPIKey}, APIKeyService: apiKeyQuotaUpdaterStub{}, AccountRateMultiplier: 1,
							})
							require.InDelta(t, (input+output+cache)*rate, cmd.BalanceCost, 1e-9)
							require.InDelta(t, cmd.BalanceCost, cmd.APIKeyQuotaCost, 1e-9)
						}
					}
				}
			}
		})
	}
}

func TestPlatformBillingCurrencyPlazaReferenceFXIsolationAndTiers(t *testing.T) {
	const model = "gemini-2.5-pro"
	groups := []Group{
		{ID: 100, Platform: PlatformGemini, RateMultiplier: .15, LongContextPricingEnabled: true, ModelAllowlist: GroupModelAllowlist{Enabled: true, Models: []string{model}}},
		{ID: 101, Platform: PlatformComposite, RateMultiplier: .25, LongContextPricingEnabled: true},
		{ID: 102, Platform: PlatformGemini, RateMultiplier: .5, LongContextPricingEnabled: true, ModelAllowlist: GroupModelAllowlist{Enabled: true, Models: []string{model}}},
	}
	svc := newPlazaServiceWithBilling([]Channel{{ID: 1, Name: "gemini", Status: StatusActive, GroupIDs: []int64{100, 101, 102}, ModelPricing: []ChannelModelPricing{{Platform: PlatformGemini, Models: []string{model}, BillingMode: BillingModeToken}}}}, groups, map[int64]string{100: PlatformGemini, 101: PlatformComposite, 102: PlatformGemini}, geminiLadderCatalogStub(t))
	settings := NewSettingService(&currencySettingRepo{newMockSettingRepo()}, &config.Config{})
	svc.resolver.currencySettings = settings
	for _, rate := range []float64{6.6702, 7.1, 6.6702} {
		setCurrency(t, settings, PlatformGemini, "CNY", rate)
		out, err := svc.ListGroups(context.Background())
		require.NoError(t, err)
		require.Len(t, out, 3)
		for _, g := range out {
			factor, currency := rate, "CNY"
			if g.Platform == PlatformComposite {
				factor, currency = 1, "USD"
			}
			require.Equal(t, currency, g.BillingCurrency)
			m := g.Models[0]
			require.NotNil(t, m.OfficialPricing)
			require.InDelta(t, 1.25e-6*factor, *m.OfficialPricing.InputPrice, 1e-12)
			require.Len(t, m.OfficialPricing.Intervals, 2)
			for i, expected := range []float64{1.25e-6, 2.5e-6} {
				require.InDelta(t, expected*factor, *m.OfficialPricing.Intervals[i].InputPrice, 1e-12)
				require.InDelta(t, *m.Pricing.Intervals[i].InputPrice, *m.OfficialPricing.Intervals[i].InputPrice, 1e-12)
			}
		}
	}
}

func TestPlatformBillingCurrencyPreservesExplicitDeepSeekTimePricing(t *testing.T) {
	g := Group{ID: 28, Platform: PlatformDeepseek, RateMultiplier: .15, LongContextPricingEnabled: true}
	channels := []Channel{{ID: 1, Status: StatusActive, GroupIDs: []int64{g.ID}, ModelPricing: []ChannelModelPricing{{
		Platform: PlatformDeepseek, Models: []string{"deepseek-flash"}, BillingMode: BillingModeToken,
		InputPrice: testPtrFloat64(2e-6), OutputPrice: testPtrFloat64(4e-6),
		TimePricing: &ChannelTimePricing{Timezone: "UTC", Periods: []ChannelTimePricingPeriod{
			{StartTime: "01:00", EndTime: "04:00", Multiplier: .5},
		}},
	}}}}
	svc := newPlazaServiceWithBilling(channels, []Group{g}, map[int64]string{g.ID: g.Platform}, nil)
	svc.resolver.currencySettings = NewSettingService(&currencySettingRepo{newMockSettingRepo()}, &config.Config{})
	setCurrency(t, svc.resolver.currencySettings, g.Platform, "CNY", 7)
	_, err := svc.resolver.currencySettings.UpdatePlatformBillingCurrency(context.Background(), PlatformBillingCurrency{
		Platform: g.Platform, Currency: "CNY", USDToCNY: 7, DeepSeekPeakEnabled: true,
	})
	require.NoError(t, err)
	groups, err := svc.ListGroups(context.Background())
	require.NoError(t, err)
	require.Len(t, groups, 1)
	m := groups[0].Models[0]
	require.Equal(t, "CNY", groups[0].BillingCurrency)
	require.InDelta(t, 14e-6, *m.Pricing.InputPrice, 1e-12)
	require.NotNil(t, m.TimePricing)
	require.Equal(t, .5, m.TimePricing.Periods[0].Multiplier)
	for hour, multiplier := range map[int]float64{0: 1, 2: .5, 4: 1} {
		cost, err := svc.billingService.CalculateTokenCostForRequest(TokenCostRequest{
			Ctx: context.Background(), Model: m.Name, Group: &g, Tokens: UsageTokens{InputTokens: 1_000_000},
			RateMultiplier: .15, Resolver: svc.resolver, PricingAt: time.Date(2026, 10, 26, hour, 0, 0, 0, time.UTC),
		})
		require.NoError(t, err)
		require.InDelta(t, 14*.15*multiplier, cost.ActualCost, 1e-9)
	}
}

func TestPlatformBillingCurrencyDeepSeekPeakOptInAndSnapshot(t *testing.T) {
	for _, currency := range []string{"USD", "CNY"} {
		t.Run(currency, func(t *testing.T) {
			b, r, settings, g := currencyTestEnv(t, PlatformDeepseek)
			setCurrency(t, settings, g.Platform, currency, 7)
			base := .15
			if currency == "CNY" {
				base *= 7
			}
			req := TokenCostRequest{Ctx: WithRequestPricingSnapshot(context.Background()), Model: "deepseek-v4.1-flash", Group: g,
				Tokens: UsageTokens{InputTokens: 1_000_000}, RateMultiplier: .15, Resolver: r,
				PricingAt: time.Date(2026, 10, 26, 2, 0, 0, 0, time.UTC)}
			off, err := b.CalculateTokenCostForRequest(req)
			require.NoError(t, err)
			require.InDelta(t, base*.15, off.ActualCost, 1e-9)
			policy := PlatformBillingCurrency{Platform: g.Platform, Currency: currency, USDToCNY: 7, DeepSeekPeakEnabled: true}
			_, err = settings.UpdatePlatformBillingCurrency(context.Background(), policy)
			require.NoError(t, err)
			old, err := b.CalculateTokenCostForRequest(req)
			require.NoError(t, err)
			require.Equal(t, off.ActualCost, old.ActualCost, "in-flight requests keep their admitted rule")
			for _, tc := range []struct {
				day, hour, minute int
				multiplier        float64
			}{
				{26, 0, 59, 1}, {26, 1, 0, 2}, {26, 3, 59, 2}, {26, 4, 0, 1},
				{26, 5, 59, 1}, {26, 6, 0, 2}, {26, 9, 59, 2}, {26, 10, 0, 1},
				{24, 2, 0, 1}, {25, 6, 0, 1},
			} {
				req.Ctx = WithRequestPricingSnapshot(context.Background())
				req.PricingAt = time.Date(2026, 10, tc.day, tc.hour, tc.minute, 0, 0, time.UTC)
				schedule, err := b.ResolveContextPricingSchedule(req.Ctx, r, ContextPricingScheduleInput{Model: req.Model, Group: g})
				require.NoError(t, err)
				require.InDelta(t, base, *schedule.Tiers[0].Input*1e6, 1e-9, "base card never includes the peak factor")
				require.NotNil(t, schedule.TimePricing)
				require.True(t, schedule.TimePricing.WeekdaysOnly)
				require.Equal(t, "Asia/Shanghai", schedule.TimePricing.Timezone)
				require.Equal(t, []TimePricingPeriod{{StartTime: "09:00", EndTime: "12:00", Multiplier: 2}, {StartTime: "14:00", EndTime: "18:00", Multiplier: 2}}, schedule.TimePricing.Periods)
				cost, err := b.CalculateTokenCostForRequest(req)
				require.NoError(t, err)
				require.InDelta(t, base*.15*tc.multiplier, cost.ActualCost, 1e-9)
			}
			restarted := NewSettingService(settings.settingRepo, &config.Config{})
			saved, err := restarted.GetPlatformBillingCurrency(context.Background(), g.Platform)
			require.NoError(t, err)
			require.True(t, saved.DeepSeekPeakEnabled)
			setCurrency(t, settings, g.Platform, currency, 7)
			req.Ctx = WithRequestPricingSnapshot(context.Background())
			req.PricingAt = time.Date(2026, 10, 26, 2, 0, 0, 0, time.UTC)
			cost, err := b.CalculateTokenCostForRequest(req)
			require.NoError(t, err)
			require.InDelta(t, base*.15, cost.ActualCost, 1e-9)
			schedule, err := b.ResolveContextPricingSchedule(req.Ctx, r, ContextPricingScheduleInput{Model: req.Model, Group: g})
			require.NoError(t, err)
			require.Nil(t, schedule.TimePricing)
		})
	}
}

func TestPlatformBillingCurrencyRequestSnapshotAndRestart(t *testing.T) {
	b, r, settings, g := currencyTestEnv(t, "deepseek")
	ctx := WithRequestPricingSnapshot(context.Background())
	request := TokenCostRequest{Ctx: ctx, Model: "deepseek-flash", Group: g, Tokens: UsageTokens{InputTokens: 1_000_000}, RateMultiplier: 1, PricingAt: time.Date(2026, 10, 25, 12, 0, 0, 0, time.UTC), Resolver: r}
	before, err := b.CalculateTokenCostForRequest(request)
	require.NoError(t, err)
	require.InDelta(t, .15, before.ActualCost, 1e-9)
	setCurrency(t, settings, "deepseek", "CNY", 7)
	request.Ctx = CopyRequestPricingSnapshot(ctx, context.Background())
	old, err := b.CalculateTokenCostForRequest(request)
	require.NoError(t, err)
	require.Equal(t, before, old)
	request.Ctx = WithRequestPricingSnapshot(context.Background())
	newCost, err := b.CalculateTokenCostForRequest(request)
	require.NoError(t, err)
	require.InDelta(t, .15*7, newCost.ActualCost, 1e-9)
	setCurrency(t, settings, "deepseek", "USD", 7)
	frozen, err := b.CalculateTokenCostForRequest(request)
	require.NoError(t, err)
	require.Equal(t, newCost, frozen)
	request.Ctx = WithRequestPricingSnapshot(request.Ctx)
	nextTurn, err := b.CalculateTokenCostForRequest(request)
	require.NoError(t, err)
	require.Equal(t, before, nextTurn)
	setCurrency(t, settings, "deepseek", "CNY", 6.8)
	restarted := NewSettingService(settings.settingRepo, &config.Config{})
	policy, err := restarted.GetPlatformBillingCurrency(context.Background(), "deepseek")
	require.NoError(t, err)
	require.Equal(t, "CNY", policy.Currency)
	require.Equal(t, 6.8, policy.USDToCNY)
}

func TestPlatformBillingCurrencyCustomCardsAndPlatformIsolation(t *testing.T) {
	b, r, settings, g := currencyTestEnv(t, "deepseek")
	setCurrency(t, settings, "deepseek", "CNY", 7)
	in, out, cache := 2e-6, 3e-6, .1e-6
	g.ModelPricing = []ChannelModelPricing{{Models: []string{"deepseek-flash"}, InputPrice: &in, OutputPrice: &out, CacheReadPrice: &cache}}
	req := TokenCostRequest{Ctx: context.Background(), Model: "deepseek-flash", Group: g, Tokens: UsageTokens{InputTokens: 1000, OutputTokens: 1000, CacheReadTokens: 1000}, RateMultiplier: 2, Resolver: r}
	cost, err := b.CalculateTokenCostForRequest(req)
	require.NoError(t, err)
	require.InDelta(t, .0051*7*2, cost.ActualCost, 1e-12)
	require.InDelta(t, .0051, cost.sourceTotal(), 1e-12)
	// Same model routed through another group platform has an independent policy.
	g.Platform = PlatformComposite
	cost, err = b.CalculateTokenCostForRequest(req)
	require.NoError(t, err)
	require.InDelta(t, .0051*2, cost.ActualCost, 1e-12)
	// Source cards were not mutated; a refresh cannot compound FX conversion.
	require.Equal(t, 2e-6, *g.ModelPricing[0].InputPrice)
	g.Platform = "deepseek"
	for i := 0; i < 3; i++ {
		cost, err = b.CalculateTokenCostForRequest(req)
		require.NoError(t, err)
		require.InDelta(t, .0051*7*2, cost.ActualCost, 1e-12)
	}
}

func TestPlatformBillingCurrencyCacheLadderAndPlaza(t *testing.T) {
	b, r := newTokenCostTestEnv(t, PlatformGemini, nil, geminiLadderCatalogStub(t))
	r.currencySettings = NewSettingService(&currencySettingRepo{newMockSettingRepo()}, &config.Config{})
	g := &Group{ID: 100, Platform: PlatformGemini, LongContextPricingEnabled: true}
	req := TokenCostRequest{Ctx: context.Background(), Model: "gemini-2.5-pro", Group: g, Tokens: UsageTokens{InputTokens: 300000, OutputTokens: 10000, CacheCreationTokens: 2000, CacheReadTokens: 3000}, RateMultiplier: .4, Resolver: r}
	usd, err := b.CalculateTokenCostForRequest(req)
	require.NoError(t, err)
	setCurrency(t, r.currencySettings, g.Platform, "CNY", 6.8)
	cny, err := b.CalculateTokenCostForRequest(req)
	require.NoError(t, err)
	require.InDelta(t, usd.ActualCost*6.8, cny.ActualCost, 1e-12)
	require.InDelta(t, usd.CacheCreationCost*6.8, cny.CacheCreationCost, 1e-12)
	require.InDelta(t, usd.CacheReadCost*6.8, cny.CacheReadCost, 1e-12)
	sched, err := b.ResolveContextPricingSchedule(context.Background(), r, ContextPricingScheduleInput{Model: req.Model, Group: g})
	require.NoError(t, err)
	require.GreaterOrEqual(t, len(sched.Tiers), 2)
	require.InDelta(t, 1.25e-6*6.8, *sched.Tiers[0].Input, 1e-12)
	require.InDelta(t, usd.TotalCost, cny.sourceTotal(), 1e-12)
}

func TestPlatformBillingCurrencyMediaSurchargeAndAsyncSnapshot(t *testing.T) {
	b, r, settings, g := currencyTestEnv(t, PlatformGrok)
	setCurrency(t, settings, g.Platform, "CNY", 7)
	ctx := WithRequestPricingSnapshot(context.Background())
	key := &APIKey{Group: g, GroupID: &g.ID}
	gateway := &OpenAIGatewayService{billingService: b, resolver: r}
	media := gateway.calculateOpenAIImageCost(ctx, "grok-imagine-image", key, &OpenAIForwardResult{ImageCount: 2, ImageSize: "1K"}, 1)
	require.NotNil(t, media)
	require.InDelta(t, media.sourceTotal()*7, media.ActualCost, 1e-12)
	tool := r.convertRawCost(ctx, g, b.CalculateSearchCost(10, nil, 1))
	original := media.sourceTotal() + tool.sourceTotal()
	addBillingSurcharge(media, tool)
	require.InDelta(t, original, media.sourceTotal(), 1e-12)
	require.InDelta(t, original*7, media.ActualCost, 1e-12)
	raw, err := json.Marshal(exportBillingCurrencySnapshot(ctx))
	require.NoError(t, err)
	var saved map[string]PlatformBillingCurrency
	require.NoError(t, json.Unmarshal(raw, &saved))
	setCurrency(t, settings, g.Platform, "USD", 7)
	jobCtx := WithRequestPricingSnapshot(context.Background())
	require.NoError(t, restoreBillingCurrencySnapshot(jobCtx, saved))
	policy, err := r.billingCurrency(jobCtx, g)
	require.NoError(t, err)
	require.Equal(t, "CNY", policy.Currency)
}

func TestPlatformBillingCurrencyValidationAndFailClosed(t *testing.T) {
	_, r, settings, g := currencyTestEnv(t, "deepseek")
	for _, policy := range []PlatformBillingCurrency{
		{Platform: "all", Currency: "CNY", USDToCNY: 7},
		{Platform: "unknown", Currency: "CNY", USDToCNY: 7},
		{Platform: "deepseek", Currency: "EUR", USDToCNY: 7},
		{Platform: "deepseek", Currency: "CNY", USDToCNY: 0},
		{Platform: "deepseek", Currency: "CNY", USDToCNY: math.NaN()},
		{Platform: "openai", Currency: "USD", USDToCNY: 7, DeepSeekPeakEnabled: true},
	} {
		_, err := settings.UpdatePlatformBillingCurrency(context.Background(), policy)
		require.Error(t, err)
	}
	require.NoError(t, settings.settingRepo.Set(context.Background(), platformBillingCurrencyKey+g.Platform, `{"currency":"CNY","usd_to_cny":0}`))
	d := inflightEstimateDeps{resolver: r}
	err := d.requireBillingCurrency(WithRequestPricingSnapshot(context.Background()), &APIKey{Group: g, GroupID: &g.ID})
	require.ErrorIs(t, err, ErrModelPricingUnavailable)
}

func TestPlatformBillingCurrencyRecordedBalanceAndQuotaMatchAdmission(t *testing.T) {
	for _, gateway := range []string{"openai", "messages", "cyber"} {
		t.Run(gateway, func(t *testing.T) {
			_, resolver, settings, group := currencyTestEnv(t, PlatformOpenAI)
			group.RateMultiplier = .5
			group.ModelPricing = []ChannelModelPricing{{Models: []string{"gpt-5.1"}, InputPrice: testPtrFloat64(2e-6), OutputPrice: testPtrFloat64(4e-6)}}
			setCurrency(t, settings, group.Platform, "CNY", 7)
			ctx := WithRequestPricingSnapshot(context.Background())
			_, err := resolver.billingCurrency(ctx, group)
			require.NoError(t, err)
			ctx = CopyRequestPricingSnapshot(ctx, context.Background())
			// A long stream finishes after an administrator has switched to USD.
			setCurrency(t, settings, group.Platform, "USD", 7)
			logs := &openAIRecordUsageLogRepoStub{inserted: true}
			billing := &openAIRecordUsageBillingRepoStub{result: &UsageBillingApplyResult{Applied: true}}
			key := &APIKey{ID: 2, Group: group, GroupID: &group.ID, Quota: 100, RateLimit5h: 10}
			user := &User{ID: 1}
			key.User = user
			account := &Account{ID: 3, Type: AccountTypeAPIKey}
			quota := &openAIRecordUsageAPIKeyQuotaStub{}
			if gateway == "openai" || gateway == "cyber" {
				svc := newOpenAIRecordUsageServiceWithBillingRepoForTest(logs, billing, &openAIRecordUsageUserRepoStub{}, &openAIRecordUsageSubRepoStub{}, nil)
				svc.resolver = resolver
				if gateway == "cyber" {
					svc.RecordCyberPolicyUsageLog(ctx, CyberPolicyUsageInput{APIKey: key, Account: account, APIKeyService: quota, RequestID: "currency-cyber", Model: "gpt-5.1", Stream: true, InputTokens: 1000, OutputTokens: 500})
				} else {
					err = svc.RecordUsage(ctx, &OpenAIRecordUsageInput{APIKey: key, User: user, Account: account, APIKeyService: quota, Result: &OpenAIForwardResult{RequestID: "currency-openai", Model: "gpt-5.1", Stream: true, Usage: OpenAIUsage{InputTokens: 1000, OutputTokens: 500}}})
				}
			} else {
				svc := newGatewayRecordUsageServiceWithBillingRepoForTest(logs, billing, &openAIRecordUsageUserRepoStub{}, &openAIRecordUsageSubRepoStub{})
				svc.resolver = resolver
				err = svc.RecordUsage(ctx, &RecordUsageInput{APIKey: key, User: user, Account: account, APIKeyService: quota, Result: &ForwardResult{RequestID: "currency-messages", Model: "gpt-5.1", Stream: true, Usage: ClaudeUsage{InputTokens: 1000, OutputTokens: 500}}})
			}
			require.NoError(t, err)
			require.NotNil(t, billing.lastCmd)
			require.InDelta(t, .014, billing.lastCmd.BalanceCost, 1e-12)
			require.InDelta(t, .014, billing.lastCmd.APIKeyQuotaCost, 1e-12)
			require.InDelta(t, .014, billing.lastCmd.APIKeyRateLimitCost, 1e-12)
			require.InDelta(t, .014, logs.lastLog.ActualCost, 1e-12)
			require.NotNil(t, logs.lastLog.AccountStatsCost)
			require.InDelta(t, .004, *logs.lastLog.AccountStatsCost, 1e-12)
		})
	}
}

// Production reports absent settings explicitly; preserve that contract in this fixture.
type currencySettingRepo struct{ *mockSettingRepo }

func (r *currencySettingRepo) GetValue(ctx context.Context, key string) (string, error) {
	if _, ok := r.data[key]; !ok {
		return "", ErrSettingNotFound
	}
	return r.mockSettingRepo.GetValue(ctx, key)
}

func TestPlatformBillingCurrencyBatchImageSettlement(t *testing.T) {
	_, r, settings, g := currencyTestEnv(t, PlatformGemini)
	setCurrency(t, settings, PlatformGemini, "CNY", 7)
	svc, repo, _, _, _ := newTestBatchImagePublicService(true)
	price := 0.25
	g.AllowBatchImageGeneration = true
	g.ImagePrice1K = &price
	g.BatchImageDiscountMultiplier = 0.5
	g.BatchImageHoldMultiplier = 0.6
	svc.GroupRepo = &publicBatchImageGroupRepo{groups: map[int64]*Group{g.ID: g}}
	svc.Pricing = &BatchImageModelPricingResolver{Resolver: r}
	owner := BatchImageOwner{UserID: 11, APIKeyID: 22, GroupID: &g.ID}
	result, err := svc.Submit(WithRequestPricingSnapshot(context.Background()), owner, validBatchImageSubmitRequest(), "")
	require.NoError(t, err)
	job := repo.jobs[result.ID]
	require.InDelta(t, .25, job.BaseUnitPrice, 1e-12)
	require.InDelta(t, 1.75, result.EstimatedCost, 1e-12)
	require.InDelta(t, 2.1, *job.HoldAmount, 1e-12)
	setCurrency(t, settings, PlatformGemini, "USD", 7)
	job.Status = BatchImageJobStatusSettling
	job.SuccessCount, job.FailCount = 1, 1
	logs := &openAIRecordUsageLogRepoStub{}
	settlement := &BatchImageSettlementService{Repo: repo, BillingRepo: svc.BillingRepo, Pricing: svc.Pricing, UsageLogRepo: logs}
	done, err := settlement.Settle(context.Background(), job.BatchID)
	require.NoError(t, err)
	require.InDelta(t, .875, done.ActualCost, 1e-12)
	require.InDelta(t, .875, logs.lastLog.ActualCost, 1e-12)
	require.NotNil(t, logs.lastLog.AccountStatsCost)
	require.InDelta(t, .125, *logs.lastLog.AccountStatsCost, 1e-12)
	// New submissions read the current USD policy after the earlier CNY job settles.
	second, err := svc.Submit(WithRequestPricingSnapshot(context.Background()), owner, validBatchImageSubmitRequest(), "")
	require.NoError(t, err)
	require.InDelta(t, .25, second.EstimatedCost, 1e-12)
}

func TestPlatformBillingCurrencyRejectsInvalidAsyncSnapshot(t *testing.T) {
	_, r, _, g := currencyTestEnv(t, PlatformGrok)
	ctx := WithRequestPricingSnapshot(context.Background())
	policy := PlatformBillingCurrency{Platform: g.Platform, Currency: "CNY", USDToCNY: 7}
	require.NoError(t, restoreBillingCurrencySnapshot(ctx, map[string]PlatformBillingCurrency{g.Platform: policy}))
	got, err := r.billingCurrency(ctx, g)
	require.NoError(t, err)
	require.Equal(t, policy, got)
	invalid := policy
	invalid.USDToCNY = 0
	require.Error(t, restoreBillingCurrencySnapshot(ctx, map[string]PlatformBillingCurrency{g.Platform: invalid}))
	require.Error(t, restoreBillingCurrencySnapshot(ctx, map[string]PlatformBillingCurrency{PlatformOpenAI: policy}))
	// Jobs admitted before the feature stay in USD after a restart or policy edit.
	require.NoError(t, restoreBillingCurrencySnapshot(ctx, nil))
	legacy, err := r.billingCurrency(ctx, g)
	require.NoError(t, err)
	require.Equal(t, "USD", legacy.Currency)
}

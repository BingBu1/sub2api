//go:build unit

package service

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

func qualityPricedGroup(g *Group) {
	g.ModelAllowlist = GroupModelAllowlist{Enabled: true, Models: []string{"gpt-image-2"}}
	g.ImageRateIndependent, g.ImageRateMultiplier = true, 1.2
	g.ModelPricing = []ChannelModelPricing{{Platform: PlatformOpenAI, Models: []string{"gpt-image-2"}, BillingMode: BillingModeImage, PerRequestPrice: testPtrFloat64(.029), Intervals: []PricingInterval{
		{TierLabel: "quality:low", PerRequestPrice: testPtrFloat64(.011)},
		{TierLabel: "quality:medium", PerRequestPrice: testPtrFloat64(.011)},
		{TierLabel: "quality:high", PerRequestPrice: testPtrFloat64(.029)},
	}}}
}

func TestImageQualityPricingCostAndQuota(t *testing.T) {
	b, resolver, settings, g := currencyTestEnv(t, PlatformOpenAI)
	qualityPricedGroup(g)
	raw, err := json.Marshal(GroupBillingCurrency{Enabled: true, PlatformBillingCurrency: PlatformBillingCurrency{Platform: PlatformOpenAI, Currency: "CNY", USDToCNY: 6.7}})
	require.NoError(t, err)
	require.NoError(t, settings.settingRepo.Set(context.Background(), groupBillingCurrencyKey(g.ID), string(raw)))
	svc := &OpenAIGatewayService{billingService: b, resolver: resolver}
	key := &APIKey{ID: 2, Group: g, GroupID: &g.ID, Quota: 10, RateLimit5h: 10}
	for _, tc := range []struct {
		quality string
		want    float64
	}{{"low", .08844}, {"medium", .08844}, {"high", .23316}} {
		for _, size := range []string{"1K", "2K", "4K"} {
			ctx := WithRequestPricingSnapshot(context.Background())
			require.NoError(t, svc.ValidateImageQualityPricing(ctx, key, "gpt-image-2", tc.quality))
			cost := svc.calculateOpenAIImageCost(ctx, "gpt-image-2", key, &OpenAIForwardResult{ImageQuality: tc.quality, ImageSize: size, ImageCount: 2}, 1.2)
			require.NotNil(t, cost)
			require.InDelta(t, tc.want*2, cost.ActualCost, 1e-12)
			cmd := buildUsageBillingCommand("quality-priced", &UsageLog{Model: "gpt-image-2"}, &postUsageBillingParams{Cost: cost, User: &User{ID: 1}, APIKey: key, Account: &Account{ID: 3, Type: AccountTypeAPIKey}, APIKeyService: apiKeyQuotaUpdaterStub{}, AccountRateMultiplier: 1})
			require.InDelta(t, tc.want*2, cmd.BalanceCost, 1e-12)
			require.Equal(t, cmd.BalanceCost, cmd.APIKeyQuotaCost)
		}
	}
	for _, quality := range []string{"", "auto", "unknown", "xhigh"} {
		require.Error(t, svc.ValidateImageQualityPricing(context.Background(), key, "gpt-image-2", quality))
	}
	// Resolution tariffs retain their existing behavior, including omitted quality.
	g.ModelPricing[0].Intervals = []PricingInterval{{TierLabel: "4K", PerRequestPrice: testPtrFloat64(.032)}}
	require.NoError(t, svc.ValidateImageQualityPricing(context.Background(), key, "gpt-image-2", ""))
	cost := svc.calculateOpenAIImageCost(context.Background(), "gpt-image-2", key, &OpenAIForwardResult{ImageSize: "4K", ImageCount: 1}, 1.2)
	require.InDelta(t, .25728, cost.ActualCost, 1e-12)
}

func TestGroupBillingCurrencyIsolationSnapshotAndPlaza(t *testing.T) {
	_, resolver, settings, g := currencyTestEnv(t, PlatformOpenAI)
	qualityPricedGroup(g)
	old := Group{ID: 11, Platform: PlatformOpenAI, ModelPricing: g.ModelPricing, ModelAllowlist: g.ModelAllowlist}
	svc := newPlazaServiceWithBilling([]Channel{plazaPricedChannel(1, "images", []int64{g.ID, old.ID}, PlatformOpenAI, "gpt-image-2")}, []Group{*g, old}, map[int64]string{g.ID: PlatformOpenAI, old.ID: PlatformOpenAI}, nil)
	svc.resolver.currencySettings = settings
	svc.groupRepo = &qualityCurrencyGroupRepo{GroupRepository: svc.groupRepo, groups: map[int64]*Group{g.ID: g, old.ID: &old}}
	policy := GroupBillingCurrency{Enabled: true, PlatformBillingCurrency: PlatformBillingCurrency{Currency: "CNY", USDToCNY: 6.7}}
	_, err := svc.UpdateGroupBillingCurrency(context.Background(), g.ID, policy)
	require.NoError(t, err)
	ctx := WithRequestPricingSnapshot(context.Background())
	p, err := resolver.billingCurrency(ctx, g)
	require.NoError(t, err)
	require.Equal(t, "CNY", p.Currency)
	p, err = resolver.billingCurrency(ctx, &old)
	require.NoError(t, err)
	require.Equal(t, "USD", p.Currency)
	out, err := svc.ListGroups(context.Background())
	require.NoError(t, err)
	require.Len(t, out, 2)
	for _, group := range out {
		if group.ID == g.ID {
			require.Equal(t, "CNY", group.BillingCurrency)
			require.InDelta(t, .011*6.7, *group.Models[0].Pricing.Intervals[0].PerRequestPrice, 1e-12)
		} else {
			require.Equal(t, "USD", group.BillingCurrency)
		}
	}
	_, err = svc.UpdateGroupBillingCurrency(context.Background(), g.ID, GroupBillingCurrency{})
	require.NoError(t, err)
	frozen := CopyRequestPricingSnapshot(ctx, context.Background())
	p, err = resolver.billingCurrency(frozen, g)
	require.NoError(t, err)
	require.Equal(t, "CNY", p.Currency)
	restored := WithRequestPricingSnapshot(context.Background())
	require.NoError(t, restoreBillingCurrencySnapshot(restored, exportBillingCurrencySnapshot(ctx)))
	p, err = resolver.billingCurrency(restored, g)
	require.NoError(t, err)
	require.Equal(t, "CNY", p.Currency)
	p, err = resolver.billingCurrency(context.Background(), g)
	require.NoError(t, err)
	require.Equal(t, "USD", p.Currency)
	policy.USDToCNY = 0
	_, err = svc.UpdateGroupBillingCurrency(context.Background(), g.ID, policy)
	require.Error(t, err)
	require.NoError(t, settings.settingRepo.Set(context.Background(), groupBillingCurrencyKey(g.ID), "invalid json"))
	_, err = resolver.billingCurrency(context.Background(), g)
	require.Error(t, err, "unreadable overrides must fail closed")
}

type qualityCurrencyGroupRepo struct {
	GroupRepository
	groups map[int64]*Group
}

func (r *qualityCurrencyGroupRepo) GetByID(_ context.Context, id int64) (*Group, error) {
	if group, ok := r.groups[id]; ok {
		return group, nil
	}
	return nil, ErrGroupNotFound
}

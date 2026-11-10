package handler

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

type wsCurrencySettings struct {
	service.SettingRepository
	raw string
}

func (s *wsCurrencySettings) GetValue(context.Context, string) (string, error) {
	return s.raw, nil
}

func (s *wsCurrencySettings) Set(_ context.Context, _, raw string) error {
	s.raw = raw
	return nil
}

func TestOpenAIWSTurnBillingCurrencyKeepsPreviousTurnUntilRecorded(t *testing.T) {
	settings := service.NewSettingService(&wsCurrencySettings{}, &config.Config{})
	billing := service.NewBillingService(&config.Config{}, nil)
	resolver := service.ProvideModelPricingResolver(nil, billing, settings)
	price := 1e-6
	group := &service.Group{ID: 1, Platform: service.PlatformOpenAI, ModelPricing: []service.ChannelModelPricing{
		{Models: []string{"gpt-5.1"}, InputPrice: &price},
	}}
	key := &service.APIKey{ID: 2, GroupID: &group.ID, Group: group}
	setCurrency := func(currency string, rate float64) {
		t.Helper()
		_, err := settings.UpdatePlatformBillingCurrency(context.Background(), service.PlatformBillingCurrency{
			Platform: group.Platform, Currency: currency, USDToCNY: rate,
		})
		require.NoError(t, err)
	}
	cost := func(ctx context.Context) float64 {
		t.Helper()
		c, err := billing.CalculateTokenCostForRequest(service.TokenCostRequest{
			Ctx: ctx, Model: "gpt-5.1", Group: group, Resolver: resolver,
			Tokens: service.UsageTokens{InputTokens: 1_000_000}, RateMultiplier: 1,
		})
		require.NoError(t, err)
		return c.ActualCost
	}
	setCurrency("CNY", 7)
	session := service.WithRequestPricingSnapshot(context.Background())
	var turns openAIWSTurnBillingAPIKeys
	first := turns.begin(session, nil, 1, key)
	require.InDelta(t, 7, cost(first), 1e-12)

	setCurrency("USD", 7)
	second := turns.begin(session, nil, 2, key)
	require.InDelta(t, 1, cost(second), 1e-12)
	// The next turn has already started when the first turn submits its usage.
	var recorded float64
	task, abandon := wrapUsageRecordTaskContext(turns.contextForTurn(1, session), func(ctx context.Context) {
		recorded = cost(ctx)
	})
	defer abandon()
	task(context.Background())
	require.InDelta(t, 7, recorded, 1e-12)

	setCurrency("CNY", 6.8)
	third := turns.begin(session, nil, 3, key)
	require.InDelta(t, 6.8, cost(third), 1e-12)
	require.InDelta(t, 1, cost(turns.contextForTurn(2, session)), 1e-12)
	require.Len(t, turns.contexts, 2)
}

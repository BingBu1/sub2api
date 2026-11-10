package service

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"time"

	apperrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

const platformBillingCurrencyKey = "platform_billing_currency_"

// Prices in the source catalog and operator cards remain USD. CNY billing
// deducts the RMB numeric amount from the site's existing balance units.
// The rate is an explicit saved business parameter, never a live FX dependency.
type PlatformBillingCurrency struct {
	Platform            string  `json:"platform"`
	Currency            string  `json:"currency"`
	USDToCNY            float64 `json:"usd_to_cny"`
	UpdatedAt           string  `json:"updated_at,omitempty"`
	DeepSeekPeakEnabled bool    `json:"deepseek_peak_enabled"`
}

// Initial reference: ECB/Frankfurter USD/CNY, 2026-10-23. Admin may edit before saving.
func defaultPlatformBillingCurrency(platform string) PlatformBillingCurrency {
	return PlatformBillingCurrency{Platform: platform, Currency: "USD", USDToCNY: 6.6702}
}

func (p PlatformBillingCurrency) validate() error {
	if p.Platform != PlatformComposite && !isConcreteRequestPlatform(p.Platform) {
		return apperrors.BadRequest("INVALID_PLATFORM", "Select a single platform")
	}
	if p.Currency != "USD" && p.Currency != "CNY" {
		return apperrors.BadRequest("INVALID_BILLING_CURRENCY", "Currency must be USD or CNY")
	}
	if p.DeepSeekPeakEnabled && p.Platform != PlatformDeepseek {
		return apperrors.BadRequest("INVALID_DEEPSEEK_PEAK_PLATFORM", "DeepSeek peak pricing is only available for the DeepSeek platform")
	}
	if math.IsNaN(p.USDToCNY) || math.IsInf(p.USDToCNY, 0) || p.USDToCNY < 0.01 || p.USDToCNY > 100 {
		return apperrors.BadRequest("INVALID_BILLING_EXCHANGE_RATE", "USD to CNY rate must be between 0.01 and 100")
	}
	return nil
}

// Opt-in business rule. Keep the schedule shared by billing and the plaza.
var deepseekPeakPricing = ChannelTimePricing{
	Timezone: "Asia/Shanghai", WeekdaysOnly: true,
	Periods: []ChannelTimePricingPeriod{
		{StartTime: "09:00", EndTime: "12:00", Multiplier: 2},
		{StartTime: "14:00", EndTime: "18:00", Multiplier: 2},
	},
}

func resolvedDeepSeekPeakPricing(resolved *ResolvedPricing, model string) *ChannelTimePricing {
	if resolved == nil || !resolved.Currency.DeepSeekPeakEnabled || resolved.Currency.Platform != PlatformDeepseek ||
		resolved.Source != PricingSourceLiteLLM || !isDeepSeekModel(model) {
		return nil
	}
	return &deepseekPeakPricing
}

func (p PlatformBillingCurrency) multiplier() float64 {
	if p.Currency == "CNY" {
		return p.USDToCNY
	}
	return 1
}

func (s *SettingService) GetPlatformBillingCurrency(ctx context.Context, platform string) (PlatformBillingCurrency, error) {
	p := defaultPlatformBillingCurrency(platform)
	if err := p.validate(); err != nil {
		return p, err
	}
	if s == nil || s.settingRepo == nil {
		return p, errors.New("settings unavailable")
	}
	raw, err := s.settingRepo.GetValue(ctx, platformBillingCurrencyKey+platform)
	if errors.Is(err, ErrSettingNotFound) {
		return p, nil
	}
	if err != nil {
		return p, err
	}
	if err = json.Unmarshal([]byte(raw), &p); err != nil {
		return p, err
	}
	if p.Platform != platform {
		return p, errors.New("billing platform mismatch")
	}
	return p, p.validate()
}

func (s *SettingService) UpdatePlatformBillingCurrency(ctx context.Context, p PlatformBillingCurrency) (PlatformBillingCurrency, error) {
	if err := p.validate(); err != nil {
		return p, err
	}
	if s == nil || s.settingRepo == nil {
		return p, errors.New("settings unavailable")
	}
	p.UpdatedAt = time.Now().UTC().Format(time.RFC3339Nano)
	raw, err := json.Marshal(p)
	if err != nil {
		return p, err
	}
	// Separate keys avoid overwriting simultaneous edits to other platforms.
	err = s.settingRepo.Set(ctx, platformBillingCurrencyKey+p.Platform, string(raw))
	return p, err
}

func (r *ModelPricingResolver) billingCurrency(ctx context.Context, group *Group) (PlatformBillingCurrency, error) {
	if group == nil || r == nil || r.currencySettings == nil {
		return defaultPlatformBillingCurrency(""), nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	// Platform means the group's platform, matching the plaza filter. Composite
	// is its own scope; routing to DeepSeek must not change a composite policy.
	platform := group.Platform
	snapshot, _ := ctx.Value(requestPricingSnapshotKey{}).(*requestPricingSnapshot)
	if snapshot != nil {
		snapshot.mu.Lock()
		defer snapshot.mu.Unlock()
		if p, ok := snapshot.currencies[platform]; ok {
			return p, nil
		}
	}
	p, err := r.currencySettings.GetPlatformBillingCurrency(ctx, platform)
	if err == nil && snapshot != nil {
		if snapshot.currencies == nil {
			snapshot.currencies = make(map[string]PlatformBillingCurrency)
		}
		snapshot.currencies[platform] = p
	}
	return p, err
}

// convertRawCost handles the legacy media/tool paths outside unified billing.
func (r *ModelPricingResolver) convertRawCost(ctx context.Context, group *Group, cost *CostBreakdown) *CostBreakdown {
	if cost == nil {
		return nil
	}
	p, err := r.billingCurrency(ctx, group)
	if err != nil {
		return nil
	} // admission rejects unreadable policies
	if p.Currency == "CNY" {
		original := cost.TotalCost
		cost.SourceTotalCost = &original
	}
	applyCostBreakdownMultiplier(cost, p.multiplier())
	return cost
}

func currencyTokenPricing(p *ModelPricing, policy PlatformBillingCurrency) *ModelPricing {
	if p == nil || policy.Currency != "CNY" {
		return p
	}
	c := *p
	for _, price := range []*float64{
		&c.InputPricePerToken, &c.InputPricePerTokenPriority, &c.ImageInputPricePerToken,
		&c.ImageCacheReadPricePerToken, &c.OutputPricePerToken, &c.OutputPricePerTokenPriority,
		&c.CacheCreationPricePerToken, &c.CacheCreationPricePerTokenPriority,
		&c.CacheReadPricePerToken, &c.CacheReadPricePerTokenPriority,
		&c.CacheCreation5mPrice, &c.CacheCreation1hPrice, &c.ImageOutputPricePerToken,
	} {
		*price *= policy.multiplier()
	}
	return &c
}

func currencyDisplayPricing(p *ChannelModelPricing, factor float64) *ChannelModelPricing {
	if p == nil || factor == 1 {
		return p
	}
	c := p.Clone()
	scale := func(v **float64) {
		if *v != nil {
			x := **v * factor
			*v = &x
		}
	}
	for _, v := range []**float64{&c.InputPrice, &c.OutputPrice, &c.CacheWritePrice, &c.CacheWrite1hPrice, &c.CacheReadPrice, &c.ImageInputPrice, &c.ImageOutputPrice, &c.PerRequestPrice} {
		scale(v)
	}
	for i := range c.Intervals {
		t := &c.Intervals[i]
		for _, v := range []**float64{&t.InputPrice, &t.OutputPrice, &t.CacheWritePrice, &t.CacheWrite1hPrice, &t.CacheReadPrice, &t.PerRequestPrice} {
			scale(v)
		}
	}
	return &c
}

func (c *CostBreakdown) sourceTotal() float64 {
	if c == nil {
		return 0
	}
	if c.SourceTotalCost != nil {
		return *c.SourceTotalCost
	}
	return c.TotalCost
}

func addBillingSurcharge(cost, extra *CostBreakdown) {
	if cost == nil || extra == nil {
		return
	}
	if cost.SourceTotalCost != nil || extra.SourceTotalCost != nil {
		original := cost.sourceTotal() + extra.sourceTotal()
		cost.SourceTotalCost = &original
	}
	cost.TotalCost += extra.TotalCost
	cost.ActualCost += extra.ActualCost
}

func preserveCurrencyAccountStats(log *UsageLog, cost *CostBreakdown) {
	if log != nil && cost != nil && cost.SourceTotalCost != nil && log.AccountStatsCost == nil {
		original := *cost.SourceTotalCost
		log.AccountStatsCost = &original
	}
}

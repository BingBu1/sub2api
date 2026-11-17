package service

import "context"

type seedanceCurrencyKey struct{}

// Seedance is sold in RMB independently of the OpenAI/composite text policy.
// Admission freezes this override in the normal durable video pricing snapshot.
func WithSeedanceBillingCurrency(ctx context.Context) context.Context {
	return context.WithValue(ctx, seedanceCurrencyKey{}, true)
}

func seedanceBillingCurrency(ctx context.Context, p PlatformBillingCurrency) PlatformBillingCurrency {
	if ctx == nil {
		return p
	}
	if enabled, _ := ctx.Value(seedanceCurrencyKey{}).(bool); enabled {
		p.Currency = "CNY"
	}
	return p
}

// Use the same verified account tariffs as the plaza; arbitrary model aliases
// are supported and mixed groups must not be labeled as Seedance-only.
func (s *GatewayService) IsSeedanceVideosOnlyGroup(ctx context.Context, group *Group) bool {
	if s == nil || s.accountRepo == nil || group == nil || group.Platform != PlatformOpenAI {
		return false
	}
	// Billing units must not change when an account is temporarily unavailable.
	accounts, err := s.accountRepo.ListByGroup(ctx, group.ID)
	if err != nil {
		return false
	}
	seen := false
	for i := range accounts {
		a := &accounts[i]
		if a.Platform != PlatformOpenAI || !a.SupportsOpenAIEndpointCapability(OpenAIEndpointCapabilitySeedanceVideos) {
			return false
		}
		mapping := a.GetModelMapping()
		if len(mapping) == 0 {
			return false
		}
		for model := range mapping {
			if !group.ModelAllowlist.Allows(model) || !a.IsModelAllowedInGroup(&group.ID, model) {
				continue
			}
			if _, err := seedanceVideosTariff(a.GetMappedModel(model)); err != nil {
				return false
			}
			seen = true
		}
	}
	return seen
}

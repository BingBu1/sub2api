package service

import (
	"context"
	"fmt"
	"strings"
)

const imageQualityTierPrefix = "quality:"

func imageQualityTier(quality string) string {
	return imageQualityTierPrefix + strings.ToLower(strings.TrimSpace(quality))
}

func hasImageQualityTiers(resolved *ResolvedPricing) bool {
	if resolved == nil || resolved.Mode != BillingModeImage {
		return false
	}
	for _, tier := range resolved.RequestTiers {
		if strings.HasPrefix(tier.TierLabel, imageQualityTierPrefix) {
			return true
		}
	}
	return false
}

// ValidateImageQualityPricing runs before forwarding. Explicit quality avoids
// guessing a provider's auto/default price when the operator opted into quality tiers.
func (s *OpenAIGatewayService) ValidateImageQualityPricing(ctx context.Context, key *APIKey, model, quality string) error {
	resolved := s.resolveOpenAIChannelPricing(ctx, model, key)
	if !hasImageQualityTiers(resolved) {
		return nil
	}
	label := imageQualityTier(quality)
	for _, tier := range resolved.RequestTiers {
		if tier.TierLabel == label && tier.PerRequestPrice != nil {
			return nil
		}
	}
	return fmt.Errorf("quality must be explicitly set to a priced tier for model %s", model)
}

package service

import (
	"context"
	"fmt"
	"sync"
)

type requestPricingSnapshotKey struct{}
type requestPricingSnapshot struct {
	mu         sync.Mutex
	currencies map[string]PlatformBillingCurrency
}

// Freeze each platform's policy once per request or WebSocket turn. Each turn
// gets its own context; asynchronous usage workers copy that turn's snapshot.
func WithRequestPricingSnapshot(ctx context.Context) context.Context {
	return context.WithValue(ctx, requestPricingSnapshotKey{}, &requestPricingSnapshot{})
}

func exportBillingCurrencySnapshot(ctx context.Context) map[string]PlatformBillingCurrency {
	if ctx == nil {
		return nil
	}
	s, _ := ctx.Value(requestPricingSnapshotKey{}).(*requestPricingSnapshot)
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	clone := make(map[string]PlatformBillingCurrency, len(s.currencies))
	for platform, p := range s.currencies {
		clone[platform] = p
	}
	return clone
}

func CopyRequestPricingSnapshot(parent, base context.Context) context.Context {
	if base == nil {
		base = context.Background()
	}
	if parent == nil || parent.Value(requestPricingSnapshotKey{}) == nil {
		return base
	}
	return context.WithValue(base, requestPricingSnapshotKey{}, &requestPricingSnapshot{currencies: exportBillingCurrencySnapshot(parent)})
}

func restoreBillingCurrencySnapshot(ctx context.Context, policies map[string]PlatformBillingCurrency) error {
	for platform, p := range policies {
		if platform != p.Platform {
			return fmt.Errorf("billing platform mismatch")
		}
		if err := p.validate(); err != nil {
			return err
		}
	}
	if ctx == nil {
		return nil
	}
	s, _ := ctx.Value(requestPricingSnapshotKey{}).(*requestPricingSnapshot)
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	// Pending videos created before this feature were admitted in USD.
	if len(policies) == 0 {
		for platform := range s.currencies {
			s.currencies[platform] = defaultPlatformBillingCurrency(platform)
		}
		return nil
	}
	if s.currencies == nil {
		s.currencies = make(map[string]PlatformBillingCurrency)
	}
	for platform, p := range policies {
		s.currencies[platform] = p
	}
	return nil
}

func (d inflightEstimateDeps) requireBillingCurrency(ctx context.Context, key *APIKey) error {
	if key == nil {
		return nil
	}
	if _, err := d.resolver.billingCurrency(ctx, key.Group); err != nil {
		return fmt.Errorf("%w: billing currency unavailable", ErrModelPricingUnavailable)
	}
	return nil
}

func (s *GatewayService) RequireBillingCurrency(ctx context.Context, key *APIKey) error {
	return s.inflightEstimateDeps().requireBillingCurrency(ctx, key)
}

func (s *OpenAIGatewayService) RequireBillingCurrency(ctx context.Context, key *APIKey) error {
	return s.inflightEstimateDeps().requireBillingCurrency(ctx, key)
}

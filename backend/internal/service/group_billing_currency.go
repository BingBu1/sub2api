package service

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	apperrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

// GroupBillingCurrency is an opt-in override. Disabled groups inherit the platform policy.
// Catalog and operator card prices remain USD; conversion is applied exactly once.
type GroupBillingCurrency struct {
	PlatformBillingCurrency
	Enabled bool `json:"enabled"`
}

func groupBillingCurrencyKey(id int64) string {
	return "group_billing_currency_" + strconv.FormatInt(id, 10)
}

func (s *SettingService) groupBillingCurrencyOverride(ctx context.Context, group *Group) (*GroupBillingCurrency, error) {
	if group == nil || group.ID <= 0 {
		return nil, nil
	}
	if s == nil || s.settingRepo == nil {
		return nil, errors.New("settings unavailable")
	}
	raw, err := s.settingRepo.GetValue(ctx, groupBillingCurrencyKey(group.ID))
	if errors.Is(err, ErrSettingNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var p GroupBillingCurrency
	if err := json.Unmarshal([]byte(raw), &p); err != nil {
		return nil, err
	}
	if !p.Enabled {
		return nil, nil
	}
	if p.Platform != group.Platform {
		return nil, errors.New("group billing platform mismatch")
	}
	return &p, p.validate()
}

func (s *SettingService) GetGroupBillingCurrency(ctx context.Context, group *Group) (PlatformBillingCurrency, error) {
	p, err := s.groupBillingCurrencyOverride(ctx, group)
	if err != nil {
		return PlatformBillingCurrency{}, err
	}
	if p != nil {
		return p.PlatformBillingCurrency, nil
	}
	return s.GetPlatformBillingCurrency(ctx, group.Platform)
}

// GetGroupBillingCurrency validates the target group before exposing its override.
func (s *ModelPlazaService) GetGroupBillingCurrency(ctx context.Context, id int64) (GroupBillingCurrency, error) {
	g, err := s.groupRepo.GetByID(ctx, id)
	if err != nil {
		return GroupBillingCurrency{}, err
	}
	settings := s.resolver.currencySettings
	p, err := settings.groupBillingCurrencyOverride(ctx, g)
	if err != nil {
		return GroupBillingCurrency{}, err
	}
	if p != nil {
		return *p, nil
	}
	inherited, err := settings.GetPlatformBillingCurrency(ctx, g.Platform)
	return GroupBillingCurrency{PlatformBillingCurrency: inherited}, err
}

func (s *ModelPlazaService) UpdateGroupBillingCurrency(ctx context.Context, id int64, p GroupBillingCurrency) (GroupBillingCurrency, error) {
	g, err := s.groupRepo.GetByID(ctx, id)
	if err != nil {
		return p, err
	}
	p.Platform = g.Platform
	if !p.Enabled {
		p.PlatformBillingCurrency = defaultPlatformBillingCurrency(g.Platform)
	}
	if err := p.validate(); err != nil {
		return p, err
	}
	if id <= 0 {
		return p, apperrors.BadRequest("INVALID_GROUP", "Invalid group ID")
	}
	p.UpdatedAt = time.Now().UTC().Format(time.RFC3339Nano)
	raw, err := json.Marshal(p)
	if err != nil {
		return p, err
	}
	if err := s.resolver.currencySettings.settingRepo.Set(ctx, groupBillingCurrencyKey(id), string(raw)); err != nil {
		return p, err
	}
	return s.GetGroupBillingCurrency(ctx, id)
}

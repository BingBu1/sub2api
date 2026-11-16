//go:build unit

package repository

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

// Exercise the serialized candidate projection, not just the full account:
// production rejected the only account before the scheduler hydrated it.
func TestSchedulerCachePreservesSeedanceEndpointCapabilities(t *testing.T) {
	for _, tc := range []struct {
		name         string
		capabilities []string
		videos, ark  bool
	}{
		{"videos", []string{"seedance_videos"}, true, true},
		{"ark", []string{"seedance"}, false, true},
		{"chat", []string{"chat_completions"}, false, false},
		{"unset", nil, false, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			cache := newSchedulerCacheUnit(t)
			account := service.Account{
				ID: 17, Platform: service.PlatformOpenAI, Type: service.AccountTypeAPIKey,
				Status: service.StatusActive, Schedulable: true, GroupIDs: []int64{19},
				Credentials: map[string]any{
					"base_url": "https://video.example", "openai_capabilities": tc.capabilities,
					"model_mapping": map[string]string{"doubao-seedance-2-0-260128": "doubao-seedance-2-0-260128"},
				},
			}
			require.NoError(t, cache.SetAccount(context.Background(), &account))
			payload, err := cache.rdb.Get(context.Background(), schedulerAccountMetaKey("17")).Bytes()
			require.NoError(t, err)
			candidate, err := decodeCachedAccount(payload)
			require.NoError(t, err)
			require.Equal(t, tc.videos, candidate.SupportsOpenAIEndpointCapability(service.OpenAIEndpointCapabilitySeedanceVideos))
			require.Equal(t, tc.ark, candidate.SupportsOpenAIEndpointCapability(service.OpenAIEndpointCapabilitySeedance))
			require.True(t, candidate.IsModelSupportedInGroup(&account.GroupIDs[0], "doubao-seedance-2-0-260128"))
		})
	}
}

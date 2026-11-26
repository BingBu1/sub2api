//go:build unit

package service

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPlazaSeedanceDiscountPricesAndEstimateDisclosure(t *testing.T) {
	for _, tc := range []struct {
		model  string
		prices []float64
		paid   []float64
	}{
		{"Seedance2.0-Discount", []float64{46, 28, 51, 31}, []float64{38.18, 23.24, 42.33, 25.73}},
		{"Seedance2.5-Discount", []float64{70, 42, 77, 46}, []float64{58.10, 34.86, 63.91, 38.18}},
	} {
		t.Run(tc.model, func(t *testing.T) {
			a := videosTestAccount()
			a.Credentials["model_mapping"] = map[string]any{"public-video": tc.model}
			tariff := plazaSeedanceTariff([]Account{*a}, 19, PlatformOpenAI, "public-video")
			require.NotNil(t, tariff)
			tiers := plazaSeedanceVideoTokenTiers(tariff)
			require.Len(t, tiers, 4)
			for i, tier := range tiers {
				require.True(t, tier.Estimated)
				require.Contains(t, []string{"720p", "1080p"}, tier.Resolution)
				require.Equal(t, i%2 == 1, tier.ReferenceVideo)
				require.InDelta(t, tc.prices[i], tier.SourcePriceCNY*1e6, 1e-9)
				require.InDelta(t, tc.paid[i], tier.OutputPrice*1e6*0.83, 1e-9)
			}
			_, err := seedanceVideosTariff(tc.model)
			require.NoError(t, err)
		})
	}
	require.False(t, isSeedanceDiscountModel("Seedance2.0-Unknown"))
}

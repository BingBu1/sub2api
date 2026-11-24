package service

// Only opt-in Videos accounts use these tariffs. Ark accounts and accounts
// mapping the same public alias to conflicting native models must not receive
// an arbitrary quote selected by repository ordering.
func plazaSeedanceTariff(accounts []Account, groupID int64, platform, model string) *SeedanceVideosTariff {
	if platform != PlatformOpenAI {
		return nil
	}
	var tariff *SeedanceVideosTariff
	for i := range accounts {
		a := &accounts[i]
		if a.Platform != platform || !a.IsModelSupportedInGroup(&groupID, model) ||
			!a.SupportsOpenAIEndpointCapability(OpenAIEndpointCapabilitySeedance) {
			continue
		}
		if !a.SupportsOpenAIEndpointCapability(OpenAIEndpointCapabilitySeedanceVideos) {
			return nil
		}
		candidate, err := seedanceVideosTariff(a.GetMappedModel(model))
		if err != nil || (tariff != nil && candidate.Model != tariff.Model) {
			return nil
		}
		tariff = candidate
	}
	return tariff
}

func plazaSeedanceVideoTokenTiers(tariff *SeedanceVideosTariff) []PlazaVideoTokenTier {
	var tiers []PlazaVideoTokenTier
	for _, resolution := range []string{"480p", "720p", "1080p", "4k"} {
		rates, ok := tariff.Rates[resolution]
		if !ok {
			continue
		}
		for i, price := range rates {
			source := price / 1e6
			// Seedance quotes are always native CNY, including mixed groups.
			converted := source
			tiers = append(tiers, PlazaVideoTokenTier{
				Resolution: resolution, ReferenceVideo: i == 1,
				OutputPrice: converted, SourcePriceCNY: source,
				Estimated: isSeedanceDiscountModel(tariff.Model),
			})
		}
	}
	return tiers
}

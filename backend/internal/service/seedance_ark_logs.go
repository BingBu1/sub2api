package service

// UsesSeedanceArkLogs explicitly opts into an Ark relay whose authoritative
// token usage is available from /api/log/token. Official Ark is unchanged.
func (a *Account) UsesSeedanceArkLogs() bool {
	if a == nil || !a.SupportsOpenAIEndpointCapability(OpenAIEndpointCapabilitySeedanceVideos) {
		return false
	}
	configured, _ := a.openAIEndpointCapabilitySet()
	return configured["seedance_ark_logs"]
}

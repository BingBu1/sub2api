//go:build unit

package service

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

const videosTestModel = "doubao-seedance-2-0-260128"

func videosTestAccount() *Account {
	a := seedanceTestAccount()
	a.Credentials["base_url"] = "https://relay.example/v1"
	a.Credentials["openai_capabilities"] = []string{"seedance_videos"}
	a.Credentials["model_mapping"] = map[string]any{"video": videosTestModel}
	return a
}

func videosTestLog(task string, tokens float64, final bool) map[string]any {
	other := map[string]any{"task_id": task, "billing_mode": "tiered_expr", "is_task": true, "usage_facts": map[string]any{"tokens": tokens, "resolution": "480p", "video_input": "none"}}
	if final {
		other["actual_quota"], other["pre_consumed_quota"] = 95727, 90811
	}
	raw, _ := json.Marshal(other)
	return map[string]any{"type": 2, "model_name": videosTestModel, "quota": 4916, "other": string(raw)}
}

func videosTestLogs(logs ...map[string]any) string {
	raw, _ := json.Marshal(map[string]any{"success": true, "data": logs})
	return string(raw)
}

func TestSeedanceVideosUsesFinalTokensNotPrechargeOrAdjustment(t *testing.T) {
	final := videosTestLog("task-1", 50638, true)
	precharge := videosTestLog("task-1", 48037.5, false)
	other := videosTestLog("task-other", 900000, true)
	u, err := parseSeedanceVideosSettlement([]byte(videosTestLogs(other, precharge, final)), "task-1", videosTestModel)
	require.NoError(t, err)
	require.Equal(t, 50638, u.Tokens)
	tariff, err := seedanceVideosTariff(videosTestModel)
	require.NoError(t, err)
	cost, err := tariff.CostCNY(u)
	require.NoError(t, err)
	require.InDelta(t, 2.329348, cost, 1e-10)
	for _, logs := range []string{videosTestLogs(precharge), videosTestLogs(other), `{"success":false,"data":[]}`, videosTestLogs(videosTestLog("task-1", 50638.5, true)), videosTestLogs(final, videosTestLog("task-1", 50639, true))} {
		_, err = parseSeedanceVideosSettlement([]byte(logs), "task-1", videosTestModel)
		require.Error(t, err)
	}
	refund := videosTestLog("task-1", 50638, false)
	refund["type"] = 6
	_, err = parseSeedanceVideosSettlement([]byte(videosTestLogs(final, refund)), "task-1", videosTestModel)
	require.Error(t, err)
	_, err = parseSeedanceVideosSettlement([]byte(videosTestLogs(final)), "task-1", "other-model")
	require.Error(t, err)
}

func TestSeedanceVideosTariffsAndCurrency(t *testing.T) {
	for _, tc := range []struct {
		model, resolution string
		plain, reference  float64
	}{
		{videosTestModel, "480p", 46, 28}, {videosTestModel, "1080p", 51, 31}, {videosTestModel, "4k", 26, 16},
		{"doubao-seedance-2-5-260628", "720p", 70, 42}, {"doubao-seedance-2-5-260628", "1080p", 77, 46},
		{"doubao-seedance-2-0-fast-260128", "480p", 37, 22}, {"doubao-seedance-2-0-mini-260615", "720p", 23, 14},
	} {
		tariff, err := seedanceVideosTariff(tc.model)
		require.NoError(t, err)
		for i, input := range []string{"none", "video"} {
			cost, err := tariff.CostCNY(&SeedanceVideosUsage{Model: tc.model, Tokens: 1000000, Resolution: tc.resolution, VideoInput: input})
			require.NoError(t, err)
			require.Equal(t, []float64{tc.plain, tc.reference}[i], cost)
		}
	}
	b, r, settings, group := currencyTestEnv(t, PlatformOpenAI)
	svc := &OpenAIGatewayService{billingService: b, resolver: r}
	base := 2.329348
	for _, currency := range []string{"USD", "CNY"} {
		setCurrency(t, settings, PlatformOpenAI, currency, 7.3)
		cost, err := svc.calculateOpenAIRecordUsageCost(WithRequestPricingSnapshot(context.Background()), &OpenAIForwardResult{SeedanceVideosCostCNY: &base}, &APIKey{Group: group}, []string{videosTestModel}, .86, 1, 1, .86, UsageTokens{OutputTokens: 50638}, "", nil, false, time.Now())
		require.NoError(t, err)
		want := base * .86
		if currency == "USD" {
			want /= 7.3
		}
		require.InDelta(t, want, cost.ActualCost, 1e-10)
		require.Equal(t, string(BillingModeToken), cost.BillingMode)
	}
}

func TestSeedanceVideosArkTranslationAndOptIn(t *testing.T) {
	body := []byte(`{"model":"video","content":[{"type":"text","text":"waves"},{"type":"image_url","image_url":{"url":"https://example.com/a.png"},"role":"first_frame"},{"type":"video_url","video_url":{"url":"https://example.com/a.mp4"}}],"duration":-1,"resolution":"480p","ratio":"16:9","watermark":false}`)
	upstream := &grokMediaContentUpstreamStub{response: grokMediaContentStatusResponse(`{"id":"task-1","status":"queued"}`)}
	svc := &OpenAIGatewayService{httpUpstream: upstream}
	c, w := grokMediaContentTestContext(http.MethodPost, "/api/v3/contents/generations/tasks", nil)
	result, err := svc.ForwardSeedance(context.Background(), c, videosTestAccount(), SeedanceEndpointCreate, "", body)
	require.NoError(t, err)
	require.JSONEq(t, `{"id":"task-1"}`, w.Body.String())
	require.NotNil(t, result.SeedanceVideosTariff)
	require.Zero(t, result.Usage.OutputTokens)
	require.Equal(t, "https://relay.example/v1/videos", upstream.request.URL.String())
	raw, err := io.ReadAll(upstream.request.Body)
	require.NoError(t, err)
	require.Equal(t, videosTestModel, gjson.GetBytes(raw, "model").String())
	require.Equal(t, int64(-1), gjson.GetBytes(raw, "seconds").Int())
	require.Equal(t, "waves", gjson.GetBytes(raw, "prompt").String())
	require.Len(t, gjson.GetBytes(raw, "metadata.content").Array(), 2)
	require.False(t, gjson.GetBytes(raw, "content").Exists())
	require.Equal(t, "first_frame", gjson.GetBytes(raw, "metadata.content.0.role").String())
	require.True(t, videosTestAccount().SupportsOpenAIEndpointCapability(OpenAIEndpointCapabilitySeedance))
	require.False(t, seedanceTestAccount().SupportsOpenAIEndpointCapability(OpenAIEndpointCapabilitySeedanceVideos))
	c, _ = grokMediaContentTestContext(http.MethodPost, "/v1/videos", nil)
	_, err = svc.ForwardSeedance(context.Background(), c, seedanceTestAccount(), SeedanceVideosEndpointCreate, "", body)
	require.Error(t, err)
	require.Len(t, upstream.requests, 1)
	for _, field := range []string{"callback_url", "tools", "future_field"} {
		invalid, _ := sjson.SetBytes(body, field, "unsupported")
		_, _, err := seedanceVideosBody(invalid, true)
		require.Error(t, err)
	}
}

func TestSeedanceVideosStatusAndContent(t *testing.T) {
	for _, endpoint := range []GrokMediaEndpoint{SeedanceEndpointStatus, SeedanceVideosEndpointStatus, SeedanceVideosEndpointContent} {
		upstream := &grokMediaContentUpstreamStub{responses: []*http.Response{
			grokMediaContentStatusResponse(`{"id":"task-1","model":"` + videosTestModel + `","status":"completed"}`),
			grokMediaContentStatusResponse(videosTestLogs(videosTestLog("task-1", 50638, true))),
			{StatusCode: 200, Header: http.Header{"Content-Type": []string{"video/mp4"}}, Body: io.NopCloser(strings.NewReader("MP4")), ContentLength: 3},
		}}
		svc := &OpenAIGatewayService{httpUpstream: upstream}
		c, w := grokMediaContentTestContext(http.MethodGet, "/v1/videos/task-1", nil)
		result, err := svc.ForwardSeedance(context.Background(), c, videosTestAccount(), endpoint, "seedance:task-1", nil)
		require.NoError(t, err)
		require.Equal(t, 50638, result.Usage.OutputTokens)
		require.Zero(t, result.VideoCount)
		for _, req := range upstream.requests {
			require.Equal(t, "Bearer ark-secret", req.Header.Get("Authorization"))
		}
		if endpoint == SeedanceVideosEndpointContent {
			require.Equal(t, "MP4", w.Body.String())
			require.Equal(t, "video/mp4", w.Header().Get("Content-Type"))
		} else {
			require.Equal(t, int64(50638), gjson.Get(w.Body.String(), "usage.completion_tokens").Int())
		}
		if endpoint == SeedanceEndpointStatus {
			require.Equal(t, "succeeded", gjson.Get(w.Body.String(), "status").String())
			require.Equal(t, "/api/v3/contents/generations/tasks/task-1/content", gjson.Get(w.Body.String(), "content.video_url").String())
		}
	}
}

func TestSeedanceVideosMissingUsageFailedJobsAndNoRetry(t *testing.T) {
	for _, status := range []string{"queued", "in_progress", "failed", "completed"} {
		upstream := &grokMediaContentUpstreamStub{responses: []*http.Response{
			grokMediaContentStatusResponse(`{"id":"task-1","model":"` + videosTestModel + `","status":"` + status + `"}`),
			grokMediaContentStatusResponse(videosTestLogs(videosTestLog("task-1", 48037.5, false))),
		}}
		svc := &OpenAIGatewayService{httpUpstream: upstream}
		c, w := grokMediaContentTestContext(http.MethodGet, "/v1/videos/task-1", nil)
		result, err := svc.ForwardSeedance(context.Background(), c, videosTestAccount(), SeedanceVideosEndpointStatus, "seedance:task-1", nil)
		if status == "completed" {
			require.Error(t, err)
			require.Nil(t, result)
			require.Equal(t, 503, w.Code)
			require.Equal(t, "5", w.Header().Get("Retry-After"))
		} else {
			require.NoError(t, err)
			require.Zero(t, result.Usage.OutputTokens)
			require.Len(t, upstream.requests, 1)
		}
	}
	upstream := &grokMediaContentUpstreamStub{response: grokMediaContentStatusResponse(`{"error":{"message":"busy"}}`)}
	upstream.response.StatusCode = 429
	svc := &OpenAIGatewayService{httpUpstream: upstream}
	c, w := grokMediaContentTestContext(http.MethodPost, "/v1/videos", nil)
	_, err := svc.ForwardSeedance(context.Background(), c, videosTestAccount(), SeedanceVideosEndpointCreate, "", []byte(`{"model":"video","prompt":"waves"}`))
	require.Error(t, err)
	require.Equal(t, 429, w.Code)
	require.Len(t, upstream.requests, 1)
	for _, id := range []string{"", "../other", "a?key=b", "a/b", "%2e%2e"} {
		c, _ = grokMediaContentTestContext(http.MethodGet, "/v1/videos/task-1", nil)
		_, err = svc.ForwardSeedance(context.Background(), c, videosTestAccount(), SeedanceVideosEndpointStatus, "seedance:"+id, nil)
		require.Error(t, err)
	}
	require.Len(t, upstream.requests, 1)
}

type seedanceUsageCache struct {
	GatewayCache
	values map[string][]byte
}

func (c *seedanceUsageCache) GetGrokVideoPendingBilling(_ context.Context, key string) ([]byte, error) {
	return c.values[key], nil
}
func (c *seedanceUsageCache) SetGrokVideoPendingBilling(_ context.Context, key string, b []byte, _ time.Duration) error {
	c.values[key] = b
	return nil
}

func TestSeedanceVideosRetainsVerifiedUsage(t *testing.T) {
	upstream := &grokMediaContentUpstreamStub{response: grokMediaContentStatusResponse(videosTestLogs(videosTestLog("task-1", 50638, true)))}
	svc := &OpenAIGatewayService{httpUpstream: upstream, cache: &seedanceUsageCache{values: map[string][]byte{}}}
	for range 2 {
		u, err := svc.seedanceVideosFinalUsage(context.Background(), videosTestAccount(), "https://relay.example", "task-1", videosTestModel)
		require.NoError(t, err)
		require.Equal(t, 50638, u.Tokens)
	}
	require.Len(t, upstream.requests, 1)
}

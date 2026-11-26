//go:build unit

package service

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

func discountTestAccount() *Account {
	a := arkLogsTestAccount()
	a.Credentials["model_mapping"] = map[string]any{"Seedance2.0": "Seedance2.0-Discount", "Seedance2.5": "Seedance2.5-Discount"}
	return a
}

func TestSeedanceDiscountEstimateUnitsAndReference(t *testing.T) {
	for _, tc := range []struct {
		body      string
		tokens    int
		reference string
	}{
		{`{"duration":5,"resolution":"720p"}`, 108000, "none"},
		{`{"duration":5,"resolution":"1080p","ratio":"9:16"}`, 243000, "none"},
		{`{"duration":5,"resolution":"720p","content":[{"type":"video_url"}],"reference_video_seconds":4}`, 194400, "video"},
	} {
		tariff, err := seedanceVideosTariff("Seedance2.0-Discount")
		require.NoError(t, err)
		body, err := configureSeedanceDiscountEstimate([]byte(tc.body), true, tariff)
		require.NoError(t, err)
		require.Equal(t, tc.tokens, tariff.EstimatedUsage.Tokens)
		require.Equal(t, tc.reference, tariff.EstimatedUsage.VideoInput)
		require.False(t, gjson.GetBytes(body, "reference_video_seconds").Exists())
	}
	for _, body := range []string{
		`{"duration":-1}`, `{"duration":16}`, `{"duration":3}`, `{"duration":"5"}`,
		`{"resolution":"480p"}`, `{"resolution":"4k"}`, `{"ratio":"1:1"}`,
		`{"frames":120}`, `{"draft":true}`, `{"reference_video_seconds":4}`,
		`{"content":[{"type":"video_url"}]}`, `{"content":[{"type":"video_url"}],"reference_video_seconds":0}`,
	} {
		tariff, _ := seedanceVideosTariff("Seedance2.0-Discount")
		_, err := configureSeedanceDiscountEstimate([]byte(body), true, tariff)
		require.Error(t, err, body)
	}
	tariff, _ := seedanceVideosTariff("Seedance2.5-Discount")
	_, err := configureSeedanceDiscountEstimate([]byte(`{"duration":30}`), true, tariff)
	require.NoError(t, err)
}

func TestSeedanceDiscountCreateFreezesEstimateAndStripsLocalField(t *testing.T) {
	for _, endpoint := range []GrokMediaEndpoint{SeedanceEndpointCreate, SeedanceVideosEndpointCreate} {
		body := []byte(`{"model":"Seedance2.0","content":[{"type":"text","text":"waves"},{"type":"video_url","video_url":{"url":"https://example.com/ref.mp4"},"role":"reference_video"}],"duration":5,"resolution":"720p","reference_video_seconds":4}`)
		if endpoint == SeedanceVideosEndpointCreate {
			body = []byte(`{"model":"Seedance2.0","prompt":"waves","seconds":5,"metadata":{"resolution":"720p","content":[{"type":"video_url","video_url":{"url":"https://example.com/ref.mp4"},"role":"reference_video"}],"reference_video_seconds":4}}`)
		}
		upstream := &grokMediaContentUpstreamStub{response: grokMediaContentStatusResponse(`{"id":"task-1"}`)}
		svc := &OpenAIGatewayService{httpUpstream: upstream}
		c, w := grokMediaContentTestContext(http.MethodPost, "/api/v3/contents/generations/tasks", nil)
		result, err := svc.ForwardSeedance(context.Background(), c, discountTestAccount(), endpoint, "", body)
		require.NoError(t, err)
		require.Zero(t, result.Usage.OutputTokens)
		require.Equal(t, 194400, result.SeedanceVideosTariff.EstimatedUsage.Tokens)
		require.Equal(t, "estimated_tokens", gjson.Get(w.Body.String(), "billing.basis").String())
		forwarded, err := io.ReadAll(upstream.request.Body)
		require.NoError(t, err)
		require.False(t, gjson.GetBytes(forwarded, "reference_video_seconds").Exists())
		require.Equal(t, "Seedance2.0-Discount", gjson.GetBytes(forwarded, "model").String())
		// Pending billing survives serialization with its admitted dimensions.
		raw, err := json.Marshal(result.SeedanceVideosTariff)
		require.NoError(t, err)
		var restored SeedanceVideosTariff
		require.NoError(t, json.Unmarshal(raw, &restored))
		require.Equal(t, 194400, restored.EstimatedUsage.Tokens)
	}
}

func TestSeedanceDiscountSuccessUsesEstimateNotQuotaAndFailureIsFree(t *testing.T) {
	for _, status := range []string{"succeeded", "failed", "running"} {
		tariff, _ := seedanceVideosTariff("Seedance2.0-Discount")
		_, err := configureSeedanceDiscountEstimate([]byte(`{"duration":5,"resolution":"720p"}`), true, tariff)
		require.NoError(t, err)
		upstream := &grokMediaContentUpstreamStub{response: grokMediaContentStatusResponse(`{"id":"task-1","status":"` + status + `","usage":{"completion_tokens":339041}}`)}
		svc := &OpenAIGatewayService{httpUpstream: upstream}
		c, w := grokMediaContentTestContext(http.MethodGet, "/api/v3/contents/generations/tasks/task-1", nil)
		result, err := svc.ForwardSeedance(WithSeedanceVideosTariff(context.Background(), tariff), c, discountTestAccount(), SeedanceEndpointStatus, "seedance:task-1", nil)
		require.NoError(t, err)
		require.Len(t, upstream.requests, 1, "Discount settlement must not use quota logs")
		if status == "succeeded" {
			require.Equal(t, 108000, result.Usage.OutputTokens)
			require.True(t, gjson.Get(w.Body.String(), "usage.estimated").Bool())
			cost, err := tariff.CostCNY(result.SeedanceVideosUsage)
			require.NoError(t, err)
			require.InDelta(t, 4.12344, cost*0.83, 1e-10)
		} else {
			require.Zero(t, result.Usage.OutputTokens)
			require.Nil(t, result.SeedanceVideosUsage)
		}
	}
}

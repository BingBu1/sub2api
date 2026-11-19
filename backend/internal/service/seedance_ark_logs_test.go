//go:build unit

package service

import (
	"context"
	"io"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

func arkLogsTestAccount() *Account {
	a := videosTestAccount()
	a.Credentials["openai_capabilities"] = []string{"seedance_ark_logs"}
	a.Credentials["base_url"] = "https://relay.example/api/v3/"
	return a
}

func TestSeedanceArkLogsPreservesNativeBody(t *testing.T) {
	body := []byte(`{"model":"video","content":[{"type":"text","text":"waves"},{"type":"video_url","video_url":{"url":"https://example.com/input.mp4"},"role":"reference_video"}],"duration":5,"resolution":"720p","camera_fixed":true,"return_last_frame":true,"omni_reference_task_type":"reference"}`)
	upstream := &grokMediaContentUpstreamStub{response: grokMediaContentStatusResponse(`{"id":"task-1"}`)}
	svc := &OpenAIGatewayService{httpUpstream: upstream}
	c, w := grokMediaContentTestContext(http.MethodPost, "/api/v3/contents/generations/tasks", nil)
	result, err := svc.ForwardSeedance(context.Background(), c, arkLogsTestAccount(), SeedanceEndpointCreate, "", body)
	require.NoError(t, err)
	require.JSONEq(t, `{"id":"task-1"}`, w.Body.String())
	require.Equal(t, "https://relay.example/api/v3/contents/generations/tasks", upstream.request.URL.String())
	require.NotNil(t, result.SeedanceVideosTariff)
	forwarded, err := io.ReadAll(upstream.request.Body)
	require.NoError(t, err)
	for _, field := range []string{"content", "duration", "resolution", "camera_fixed", "return_last_frame", "omni_reference_task_type"} {
		require.Equal(t, gjson.GetBytes(body, field).Raw, gjson.GetBytes(forwarded, field).Raw)
	}
	require.Equal(t, videosTestModel, gjson.GetBytes(forwarded, "model").String())
	require.False(t, gjson.GetBytes(forwarded, "prompt").Exists())
}

func TestSeedanceArkLogsCorrectsQuotaAndRequiresFinalSettlement(t *testing.T) {
	for _, final := range []bool{true, false} {
		upstream := &grokMediaContentUpstreamStub{responses: []*http.Response{
			grokMediaContentStatusResponse(`{"id":"task-1","status":"succeeded","content":{"video_url":"https://cdn.example/result.mp4"},"usage":{"completion_tokens":275052}}`),
			grokMediaContentStatusResponse(videosTestLogs(videosTestLog("task-1", 87299, final))),
		}}
		svc := &OpenAIGatewayService{httpUpstream: upstream}
		tariff, err := seedanceVideosTariff(videosTestModel)
		require.NoError(t, err)
		c, w := grokMediaContentTestContext(http.MethodGet, "/api/v3/contents/generations/tasks/task-1", nil)
		result, err := svc.ForwardSeedance(WithSeedanceVideosTariff(context.Background(), tariff), c, arkLogsTestAccount(), SeedanceEndpointStatus, "seedance:task-1", nil)
		if !final {
			require.Error(t, err)
			require.Nil(t, result)
			require.Equal(t, 503, w.Code)
			continue
		}
		require.NoError(t, err)
		require.Equal(t, 87299, result.Usage.OutputTokens)
		require.Equal(t, videosTestModel, result.UpstreamModel)
		require.Equal(t, int64(87299), gjson.Get(w.Body.String(), "usage.completion_tokens").Int())
		require.Equal(t, int64(87299), gjson.Get(w.Body.String(), "usage.total_tokens").Int())
		require.Equal(t, "https://cdn.example/result.mp4", gjson.Get(w.Body.String(), "content.video_url").String())
		require.Equal(t, "/api/log/token", upstream.requests[1].URL.Path)
	}
}

func TestSeedanceFinalPartialRefundStillHasActualUsage(t *testing.T) {
	row := videosTestLog("task-1", 108899, true)
	row["type"] = 6
	usage, err := parseSeedanceVideosSettlement([]byte(videosTestLogs(row)), "task-1", videosTestModel)
	require.NoError(t, err)
	require.Equal(t, 108899, usage.Tokens)
}

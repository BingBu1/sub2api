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

func TestSeedanceVideosArkCreatePreservesOptionsAndPublicResponse(t *testing.T) {
	body := []byte(`{"model":"video","prompt":"waves","seconds":5,"seed":9007199254740993,"metadata":{"resolution":"720p","ratio":"16:9","watermark":false,"camera_fixed":true,"return_last_frame":true,"generate_audio":false,"content":[{"type":"image_url","image_url":{"url":"https://example.com/first.png"},"role":"first_frame"}]}}`)
	upstream := &grokMediaContentUpstreamStub{response: grokMediaContentStatusResponse(`{"id":"task-1"}`)}
	svc := &OpenAIGatewayService{httpUpstream: upstream}
	c, w := grokMediaContentTestContext(http.MethodPost, "/v1/videos", nil)
	result, err := svc.ForwardSeedance(context.Background(), c, arkLogsTestAccount(), SeedanceVideosEndpointCreate, "", body)
	require.NoError(t, err)
	require.Len(t, upstream.requests, 1)
	require.Equal(t, "/api/v3/contents/generations/tasks", upstream.request.URL.Path)
	raw, err := io.ReadAll(upstream.request.Body)
	require.NoError(t, err)
	require.Equal(t, "9007199254740993", gjson.GetBytes(raw, "seed").Raw)
	require.Equal(t, "false", gjson.GetBytes(raw, "watermark").Raw)
	require.Equal(t, "false", gjson.GetBytes(raw, "generate_audio").Raw)
	require.True(t, gjson.GetBytes(raw, "camera_fixed").Bool())
	require.True(t, gjson.GetBytes(raw, "return_last_frame").Bool())
	require.Equal(t, "first_frame", gjson.GetBytes(raw, "content.1.role").String())
	require.Equal(t, "waves", gjson.GetBytes(raw, "content.0.text").String())
	require.Equal(t, int64(5), gjson.GetBytes(raw, "duration").Int())
	require.Equal(t, videosTestModel, gjson.GetBytes(raw, "model").String())
	require.False(t, gjson.GetBytes(raw, "metadata").Exists())
	require.JSONEq(t, `{"id":"task-1","object":"video","status":"queued","model":"video","seconds":5}`, w.Body.String())
	require.Equal(t, "seedance:task-1", result.ResponseID)
	require.NotNil(t, result.SeedanceVideosTariff)
	require.Zero(t, result.Usage.OutputTokens)
}

func TestSeedanceVideosOptionsValidationAndLegacyIsolation(t *testing.T) {
	for _, body := range []string{
		`{"model":"video","prompt":"waves","metadata":{"watermark":"false"}}`,
		`{"model":"video","prompt":"waves","seed":1,"metadata":{"seed":2}}`,
		`{"model":"video","prompt":"waves","seed":9007199254740992,"metadata":{"seed":9007199254740993}}`,
		`{"model":"video","prompt":"waves","seed":1.5}`,
		`{"model":"video","prompt":"waves","metadata":{"seed":null}}`,
		`{"model":"video","prompt":"waves","size":"1280x720","metadata":{"resolution":"1080p"}}`,
		`{"model":"video","prompt":"waves","metadata":{"future_setting":true}}`,
		`{"model":"video","prompt":"waves","callback_url":"https://example.com"}`,
		`{"model":"video","prompt":"waves","metadata":{"content":[{"type":"draft_task","draft_task":{"id":"other"}}]}}`,
	} {
		_, err := ParseSeedanceVideosRequest([]byte(body))
		require.Error(t, err, body)
	}
	for _, body := range []string{`{"watermark":false}`, `{"metadata":{"seed":0}}`} {
		require.True(t, SeedanceVideosRequiresArk([]byte(body)))
	}
	require.True(t, arkLogsTestAccount().SupportsOpenAIEndpointCapability(OpenAIEndpointCapabilitySeedanceArkLogs))
	require.False(t, videosTestAccount().SupportsOpenAIEndpointCapability(OpenAIEndpointCapabilitySeedanceArkLogs))
	upstream := &grokMediaContentUpstreamStub{}
	svc := &OpenAIGatewayService{httpUpstream: upstream}
	c, w := grokMediaContentTestContext(http.MethodPost, "/v1/videos", nil)
	_, err := svc.ForwardSeedance(context.Background(), c, videosTestAccount(), SeedanceVideosEndpointCreate, "", []byte(`{"model":"video","prompt":"waves","metadata":{"watermark":false}}`))
	require.Error(t, err)
	require.Equal(t, http.StatusBadRequest, w.Code)
	require.Empty(t, upstream.requests)
}

func TestSeedanceVideosArkSizeAndReferenceMapping(t *testing.T) {
	body, info, err := seedanceVideosToArk([]byte(`{"model":"video","prompt":"waves","size":"1080x1920","images":["https://example.com/image.png"],"metadata":{"content":[{"type":"video_url","video_url":{"url":"https://example.com/ref.mp4"},"role":"reference_video"}],"omni_reference_task_type":"reference"}}`))
	require.NoError(t, err)
	require.Equal(t, "1080p", info.Resolution)
	require.Equal(t, "9:16", gjson.GetBytes(body, "ratio").String())
	require.Equal(t, "reference_video", gjson.GetBytes(body, "content.1.role").String())
	require.Equal(t, "reference_image", gjson.GetBytes(body, "content.2.role").String())
	require.Equal(t, "reference", gjson.GetBytes(body, "omni_reference_task_type").String())
	require.Equal(t, int64(5), gjson.GetBytes(body, "duration").Int())
}

func TestSeedanceVideosArkDoesNotRetryRejectedCreate(t *testing.T) {
	upstream := &grokMediaContentUpstreamStub{response: grokMediaContentStatusResponse(`{"error":{"message":"invalid option"}}`)}
	upstream.response.StatusCode = 400
	svc := &OpenAIGatewayService{httpUpstream: upstream}
	c, w := grokMediaContentTestContext(http.MethodPost, "/v1/videos", nil)
	_, err := svc.ForwardSeedance(context.Background(), c, arkLogsTestAccount(), SeedanceVideosEndpointCreate, "", []byte(`{"model":"video","prompt":"waves","metadata":{"watermark":false}}`))
	require.Error(t, err)
	require.Equal(t, 400, w.Code)
	require.Len(t, upstream.requests, 1)
}

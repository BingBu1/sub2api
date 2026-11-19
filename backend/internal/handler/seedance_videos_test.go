//go:build unit

package handler

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	middleware "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

func TestSeedanceVideosHandlerRoutesOptionsOnlyToArk(t *testing.T) {
	for _, capability := range []string{"seedance_videos", "seedance_ark_logs"} {
		t.Run(capability, func(t *testing.T) {
			h, slots, bindings, upstream := newGrokMediaSlotHandler(t, false, false, service.PlatformOpenAI, capability)
			upstream.call = func(req *http.Request, _ int64) (*http.Response, error) {
				require.Equal(t, "/api/v3/contents/generations/tasks", req.URL.Path)
				body, err := io.ReadAll(req.Body)
				require.NoError(t, err)
				require.Equal(t, "false", gjson.GetBytes(body, "watermark").Raw)
				require.Equal(t, "0", gjson.GetBytes(body, "seed").Raw)
				return &http.Response{StatusCode: 200, Header: http.Header{"Content-Type": []string{"application/json"}}, Body: io.NopCloser(strings.NewReader(`{"id":"task-options"}`))}, nil
			}
			c, w := grokMediaSlotContext(context.Background(), true)
			key, _ := middleware.GetAPIKeyFromContext(c)
			key.Group.Platform = service.PlatformOpenAI
			c.Request = httptest.NewRequest(http.MethodPost, "/v1/videos", strings.NewReader(`{"model":"doubao-seedance-2-0-260128","prompt":"waves","metadata":{"watermark":false,"seed":0}}`))
			c.Request.Header.Set("Content-Type", "application/json")
			h.SeedanceVideos(c)
			if capability == "seedance_ark_logs" {
				require.Equal(t, 200, w.Code, w.Body.String())
				require.Equal(t, 1, upstream.calls)
				require.Equal(t, "video", gjson.Get(w.Body.String(), "object").String())
				require.Len(t, bindings.pending, 1)
			} else {
				require.Equal(t, 503, w.Code, w.Body.String())
				require.Zero(t, upstream.calls)
				require.Empty(t, bindings.pending)
			}
			slots.assertReleased(t)
		})
	}
}

func TestSeedanceVideosHandlerOwnershipAndSettlementDedup(t *testing.T) {
	h, slots, bindings, upstream := newGrokMediaSlotHandler(t, false, false, service.PlatformOpenAI, "seedance_videos")
	upstream.call = func(req *http.Request, _ int64) (*http.Response, error) {
		require.Contains(t, req.URL.Path, "/v1/videos")
		return &http.Response{StatusCode: 200, Header: http.Header{"Content-Type": []string{"application/json"}}, Body: io.NopCloser(strings.NewReader(`{"id":"task-videos","status":"queued"}`))}, nil
	}
	newContext := func(method string) (*gin.Context, *httptest.ResponseRecorder) {
		c, w := grokMediaSlotContext(context.Background(), method == http.MethodPost)
		key, _ := middleware.GetAPIKeyFromContext(c)
		key.Group.Platform = service.PlatformOpenAI
		body := ""
		if method == http.MethodPost {
			body = `{"model":"doubao-seedance-2-0-260128","prompt":"waves","seconds":5}`
		}
		c.Request = httptest.NewRequest(method, "/v1/videos", strings.NewReader(body))
		c.Request.Header.Set("Content-Type", "application/json")
		c.Params = gin.Params{{Key: "request_id", Value: "task-videos"}}
		return c, w
	}
	c, w := newContext(http.MethodPost)
	h.SeedanceVideos(c)
	require.Equal(t, 200, w.Code, w.Body.String())
	require.Len(t, bindings.pending, 1)
	slots.assertReleased(t)
	c, w = newContext(http.MethodGet)
	h.SeedanceVideos(c)
	require.Equal(t, 200, w.Code, w.Body.String())
	slots.assertReleased(t)
	for _, mismatch := range []string{"user", "key", "group", "task"} {
		c, w = newContext(http.MethodGet)
		key, _ := middleware.GetAPIKeyFromContext(c)
		switch mismatch {
		case "user":
			c.Set(string(middleware.ContextKeyUser), middleware.AuthSubject{UserID: 11, Concurrency: 5})
		case "key":
			key.ID = 21
		case "group":
			gid := int64(25)
			key.GroupID = &gid
		case "task":
			c.Params = gin.Params{{Key: "request_id", Value: "other"}}
		}
		before := upstream.calls
		h.SeedanceVideos(c)
		require.Equal(t, 404, w.Code)
		require.Equal(t, before, upstream.calls)
		slots.assertReleased(t)
	}
	c, _ = newContext(http.MethodGet)
	key, _ := middleware.GetAPIKeyFromContext(c)
	subject, _ := middleware.GetAuthSubjectFromContext(c)
	result := &service.OpenAIForwardResult{ResponseID: "seedance:task-videos", Usage: service.OpenAIUsage{OutputTokens: 50638}}
	require.Nil(t, prepareSeedanceCompletionBilling(context.Background(), h, key, subject, result.ResponseID, result), "must not claim without verified final usage")
	require.Empty(t, bindings.billed)
	result.SeedanceVideosUsage = &service.SeedanceVideosUsage{Model: "doubao-seedance-2-0-260128", Tokens: 50638, Resolution: "480p", VideoInput: "none"}
	for i := range 10 {
		billed := prepareSeedanceCompletionBilling(context.Background(), h, key, subject, result.ResponseID, result)
		if i == 0 {
			require.NotNil(t, billed)
			require.NotNil(t, billed.SeedanceVideosCostCNY)
			require.InDelta(t, 2.329348, *billed.SeedanceVideosCostCNY, 1e-10)
			require.Zero(t, billed.VideoCount)
		} else {
			require.Nil(t, billed)
		}
	}
	require.Len(t, bindings.billed, 1)
}

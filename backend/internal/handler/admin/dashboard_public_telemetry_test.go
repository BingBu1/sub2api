package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/pkg/usagestats"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type publicTelemetryUsageRepo struct {
	service.UsageLogRepository
	statsCalls int
}

func (r *publicTelemetryUsageRepo) GetDashboardStats(context.Context) (*usagestats.DashboardStats, error) {
	r.statsCalls++
	return &usagestats.DashboardStats{TotalTokens: 683130000}, nil
}

func TestPublicTelemetryReturnsOnlyAggregatesAndCaches(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &publicTelemetryUsageRepo{}
	handler := NewDashboardHandler(service.NewDashboardService(repo, nil, nil, nil), nil)
	router := gin.New()
	router.GET("/public/telemetry", func(c *gin.Context) { handler.GetPublicTelemetry(c, nil) })

	for i := 0; i < 2; i++ {
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/public/telemetry", nil))
		require.Equal(t, http.StatusOK, recorder.Code)
		require.Equal(t, "public, max-age=10", recorder.Header().Get("Cache-Control"))
		var body struct {
			Data map[string]any `json:"data"`
		}
		require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &body))
		require.Equal(t, float64(683130000), body.Data["total_tokens"])
		require.Nil(t, body.Data["success_rate"])
		require.NotContains(t, body.Data, "total_cost")
		require.NotContains(t, body.Data, "total_users")
	}
	require.Equal(t, 1, repo.statsCalls)
}

package admin

import (
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type publicTelemetrySnapshot struct {
	TotalTokens      int64    `json:"total_tokens"`
	SuccessRate      *float64 `json:"success_rate"`
	AverageOutputTPS *float64 `json:"average_output_tps"`
	UpdatedAt        string   `json:"updated_at"`
}

// GetPublicTelemetry exposes only aggregate, non-account data for the public home page.
func (h *DashboardHandler) GetPublicTelemetry(c *gin.Context, opsService *service.OpsService) {
	h.publicTelemetryMu.Lock()
	defer h.publicTelemetryMu.Unlock()

	if h.publicTelemetry != nil && time.Since(h.publicTelemetryAt) < 15*time.Second {
		c.Header("Cache-Control", "public, max-age=10")
		response.Success(c, h.publicTelemetry)
		return
	}

	stats, err := h.dashboardService.GetDashboardStats(c.Request.Context())
	if err != nil {
		response.Error(c, 500, "Failed to get public telemetry")
		return
	}

	now := time.Now().UTC()
	snapshot := &publicTelemetrySnapshot{
		TotalTokens: stats.TotalTokens,
		UpdatedAt:   stats.StatsUpdatedAt,
	}

	if opsService != nil {
		ops, err := opsService.GetDashboardOverview(c.Request.Context(), &service.OpsDashboardFilter{
			StartTime: now.Add(-24 * time.Hour), EndTime: now,
		})
		if err == nil && ops != nil {
			if ops.RequestCountTotal > 0 {
				rate := float64(ops.SuccessCount) / float64(ops.RequestCountTotal) * 100
				snapshot.SuccessRate = &rate
			}
			if ops.OutputTPS != nil && ops.OutputTPS.SampleCount > 0 {
				snapshot.AverageOutputTPS = ops.OutputTPS.Avg
			}
		}
	}

	h.publicTelemetry = snapshot
	h.publicTelemetryAt = now
	c.Header("Cache-Control", "public, max-age=10")
	response.Success(c, snapshot)
}

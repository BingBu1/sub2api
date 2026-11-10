package handler

import (
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

// These handlers are registered only in the administrator route group.
func (h *ModelPlazaHandler) GetBillingCurrency(c *gin.Context) {
	p, err := h.settingService.GetPlatformBillingCurrency(c.Request.Context(), c.Param("platform"))
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, p)
}

func (h *ModelPlazaHandler) UpdateBillingCurrency(c *gin.Context) {
	var p service.PlatformBillingCurrency
	if err := c.ShouldBindJSON(&p); err != nil {
		response.BadRequest(c, "Invalid billing currency settings")
		return
	}
	p.Platform = c.Param("platform")
	p, err := h.settingService.UpdatePlatformBillingCurrency(c.Request.Context(), p)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, p)
}

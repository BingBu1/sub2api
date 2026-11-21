package handler

import (
	"strconv"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

func groupCurrencyID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		response.BadRequest(c, "Invalid group ID")
		return 0, false
	}
	return id, true
}

func (h *ModelPlazaHandler) GetGroupBillingCurrency(c *gin.Context) {
	id, ok := groupCurrencyID(c)
	if !ok {
		return
	}
	p, err := h.plazaService.GetGroupBillingCurrency(c.Request.Context(), id)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, p)
}

func (h *ModelPlazaHandler) UpdateGroupBillingCurrency(c *gin.Context) {
	id, ok := groupCurrencyID(c)
	if !ok {
		return
	}
	var p service.GroupBillingCurrency
	if err := c.ShouldBindJSON(&p); err != nil {
		response.BadRequest(c, "Invalid group billing currency settings")
		return
	}
	p, err := h.plazaService.UpdateGroupBillingCurrency(c.Request.Context(), id, p)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, p)
}

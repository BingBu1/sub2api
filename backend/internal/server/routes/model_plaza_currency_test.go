package routes

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/handler"
	servermiddleware "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestModelPlazaCurrencyRequiresAdminAuthentication(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	h := &handler.Handlers{Admin: &handler.AdminHandlers{}, ModelPlaza: &handler.ModelPlazaHandler{}}
	adminAuth := servermiddleware.AdminAuthMiddleware(func(c *gin.Context) {
		if c.GetHeader("Authorization") == "" {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		c.AbortWithStatus(http.StatusForbidden)
	})
	RegisterAdminRoutes(router.Group("/api/v1"), h, adminAuth,
		servermiddleware.AuditLogMiddleware(func(c *gin.Context) { c.Next() }),
		servermiddleware.StepUpAuthMiddleware(func(c *gin.Context) { c.Next() }), nil, nil)
	for _, method := range []string{http.MethodGet, http.MethodPut} {
		for _, auth := range []string{"", "Bearer user-token"} {
			request := httptest.NewRequest(method, "/api/v1/admin/model-plaza/billing-currency/openai", strings.NewReader(`{"currency":"CNY","usd_to_cny":7}`))
			request.Header.Set("Content-Type", "application/json")
			request.Header.Set("Authorization", auth)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, request)
			if auth == "" {
				require.Equal(t, http.StatusUnauthorized, w.Code)
			} else {
				require.Equal(t, http.StatusForbidden, w.Code)
			}
		}
	}
}

package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/pkg/ip"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type regionalAuthStub struct{ err error }

func (s regionalAuthStub) GetRegionalByKey(_ context.Context, key string) (*service.APIKey, error) {
	if s.err != nil {
		return nil, s.err
	}
	if key != "valid" {
		return nil, service.ErrAPIKeyNotFound
	}
	return &service.APIKey{ID: 1, UserID: 2, User: &service.User{ID: 2, Status: service.StatusActive}, IPWhitelist: []string{"127.0.0.1"}, CompiledIPWhitelist: ip.CompileIPRules([]string{"127.0.0.1"})}, nil
}
func TestRegionalAuthMiddlewareLocalIdentityAndIP(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		name, header, key, path, remote string
		err                             error
		status                          int
	}{
		{name: "bearer", header: "Authorization", key: "Bearer valid", status: 204},
		{name: "anthropic", header: "x-api-key", key: "valid", status: 204},
		{name: "google", header: "x-goog-api-key", key: "valid", status: 204},
		{name: "missing", status: 401},
		{name: "unknown", header: "x-api-key", key: "wrong", status: 401},
		{name: "revoked", header: "x-api-key", key: "valid", err: service.ErrAPIKeyNotFound, status: 401},
		{name: "expired-view", header: "x-api-key", key: "valid", err: service.ErrRegionalAuthUnavailable, status: 503},
		{name: "ip-denied", header: "x-api-key", key: "valid", remote: "192.0.2.1:1234", status: 403},
		{name: "query-key", path: "/?key=valid", status: 400},
	} {
		t.Run(tc.name, func(t *testing.T) {
			router := gin.New()
			router.Use(RegionalAPIKeyAuth(regionalAuthStub{err: tc.err}, &config.Config{}))
			router.GET("/", func(c *gin.Context) {
				key, ok := GetAPIKeyFromContext(c)
				require.True(t, ok)
				require.Equal(t, int64(1), key.ID)
				c.Status(204)
			})
			path := tc.path
			if path == "" {
				path = "/"
			}
			req := httptest.NewRequest(http.MethodGet, path, nil)
			req.RemoteAddr = "127.0.0.1:1234"
			if tc.remote != "" {
				req.RemoteAddr = tc.remote
			}
			if tc.header != "" {
				req.Header.Set(tc.header, tc.key)
			}
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			require.Equal(t, tc.status, w.Code, w.Body.String())
		})
	}
}

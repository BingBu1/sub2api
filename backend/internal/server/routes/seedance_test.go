package routes

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

func TestSeedanceNativeRoutes(t *testing.T) {
	router := newGatewayRoutesTestRouter()
	for _, prefix := range []string{"/api/v3", "/v3", "/v1", ""} {
		for _, method := range []string{http.MethodPost, http.MethodGet, http.MethodDelete} {
			path := prefix + "/contents/generations/tasks"
			if method != http.MethodPost {
				path += "/task-1"
			}
			w := httptest.NewRecorder()
			router.ServeHTTP(w, httptest.NewRequest(method, path, strings.NewReader(`{"model":"seedance","content":[{"type":"text","text":"waves"}]}`)))
			require.NotEqual(t, http.StatusNotFound, w.Code, method+" "+path)
		}
	}
}

func TestSeedanceRejectsOtherPlatforms(t *testing.T) {
	for _, platform := range []string{service.PlatformGrok, service.PlatformAnthropic, service.PlatformGemini} {
		w := httptest.NewRecorder()
		newGatewayRoutesTestRouter(platform).ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v3/contents/generations/tasks", strings.NewReader(`{"model":"seedance","content":[{}]}`)))
		require.Equal(t, http.StatusForbidden, w.Code)
	}
}

func TestSeedanceVideosRoutesDispatchOpenAI(t *testing.T) {
	for _, prefix := range []string{"/v1", ""} {
		for _, suffix := range []string{"", "/task-1", "/task-1/content"} {
			method := http.MethodGet
			if suffix == "" {
				method = http.MethodPost
			}
			path := prefix + "/videos" + suffix
			req := httptest.NewRequest(method, path, strings.NewReader(`{"model":"doubao-seedance-2-0-260128","prompt":"waves"}`))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			newGatewayRoutesTestRouter(service.PlatformOpenAI).ServeHTTP(w, req)
			require.NotEqual(t, http.StatusNotFound, w.Code, path)
			require.NotContains(t, w.Body.String(), "Videos API is not supported")
		}
	}
}

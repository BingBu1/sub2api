//go:build unit

package admin

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

func TestSettingsBackendSupportContactRoundTrip(t *testing.T) {
	h, repo := newStepUpSwitchTestHandler(t, map[string]string{
		service.SettingKeyContactInfo: "Public contact",
	})
	get := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(get)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/settings", nil)
	h.GetSettings(c)
	require.Equal(t, http.StatusOK, get.Code)
	require.Equal(t, "", gjson.Get(get.Body.String(), "data.backend_support_contact").String())

	for _, contact := range []string{"WeChat: dedicated support", ""} {
		rec := doUpdateSettings(t, h, map[string]any{"backend_support_contact": contact}, nil)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		require.Equal(t, contact, repo.values[service.SettingKeyBackendSupportContact])
		require.Equal(t, "Public contact", repo.values[service.SettingKeyContactInfo])
		require.Equal(t, contact, gjson.Get(rec.Body.String(), "data.backend_support_contact").String())
		rec = doUpdateSettings(t, h, map[string]any{"contact_info": "Public contact"}, nil)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		require.Equal(t, contact, repo.values[service.SettingKeyBackendSupportContact], "omitted fields keep their saved value")
	}
	require.Contains(t, diffSettings(&service.SystemSettings{}, &service.SystemSettings{BackendSupportContact: "Console contact"}, nil, nil, UpdateSettingsRequest{}), "backend_support_contact")
}

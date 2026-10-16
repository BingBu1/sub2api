package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/authguard"
	ippkg "github.com/Wei-Shaw/sub2api/internal/pkg/ip"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const (
	authFailureLimit  = 10
	authFailureWindow = 15 * time.Minute
	authBanDuration   = time.Hour
)

// Check and record use the same atomic script. A ban has a fixed expiry;
// blocked requests neither extend it nor perform password hashing.
var authAbuseScript = redis.NewScript(`
local banned = redis.call('PTTL', KEYS[2])
if banned == -1 then
  redis.call('PEXPIRE', KEYS[2], ARGV[3])
  return tonumber(ARGV[3])
end
if banned > 0 then return banned end
if ARGV[1] == 'check' then return 0 end
local failures = redis.call('INCR', KEYS[1])
if failures == 1 or redis.call('PTTL', KEYS[1]) == -1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
if failures >= tonumber(ARGV[4]) then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  redis.call('DEL', KEYS[1])
  return tonumber(ARGV[3])
end
return 0
`)

// AuthAbuseGuard protects the public auth namespace and enables database signup
// accounting for every creation path, including OAuth callbacks/completion.
// It deliberately uses the trusted proxy chain, never legacy raw-header trust.
func AuthAbuseGuard(client *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		address := ippkg.GetTrustedClientIP(c)
		key := authguard.IPKey(address)
		c.Request = c.Request.WithContext(authguard.WithRegistrationIP(c.Request.Context(), address))
		if key == "" || client == nil {
			abortRateLimit(c, time.Minute)
			return
		}

		ttl, err := runAuthAbuse(c.Request.Context(), client, key, "check")
		if err != nil {
			slog.Error("auth abuse guard unavailable")
			abortRateLimit(c, time.Minute)
			return
		}
		if ttl > 0 {
			abortRateLimit(c, time.Duration(ttl)*time.Millisecond)
			return
		}

		c.Next()
		if !isCredentialAttempt(c) {
			return
		}
		switch c.Writer.Status() {
		case http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden:
			// Preserve failure history across successful logins so a known valid
			// credential cannot be used to reset an attacker's password spray.
			// Client cancellation must not discard an already evaluated failure.
			ctx, cancel := context.WithTimeout(context.WithoutCancel(c.Request.Context()), 2*time.Second)
			defer cancel()
			if _, err := runAuthAbuse(ctx, client, key, "failure"); err != nil {
				slog.Error("auth abuse guard could not record failure")
			}
		}
	}
}

func runAuthAbuse(ctx context.Context, client *redis.Client, key, action string) (int64, error) {
	// Hash tags keep both keys in the same slot if Redis Cluster is adopted.
	prefix := "auth_abuse:{" + key + "}:"
	return authAbuseScript.Run(ctx, client, []string{prefix + "failures", prefix + "banned"},
		action, authFailureWindow.Milliseconds(), authBanDuration.Milliseconds(), authFailureLimit).Int64()
}

func isCredentialAttempt(c *gin.Context) bool {
	if c.Request.Method != http.MethodPost {
		return false
	}
	path := c.FullPath()
	return strings.HasSuffix(path, "/login") ||
		strings.HasSuffix(path, "/login/2fa") ||
		strings.HasSuffix(path, "/bind-login") ||
		strings.HasSuffix(path, "/passkey/login/finish")
}

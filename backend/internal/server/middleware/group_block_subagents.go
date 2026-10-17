package middleware

import (
	"net/http"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

const groupSubagentFrameCheckKey = "group_subagent_frame_check"
const GroupSubagentsBlockedMessage = "Subagent requests are disabled for this group"

type groupSubagentFrameCheck func([]byte) bool

// GroupBlockSubagents applies to authenticated employee ingress before routing
// or upstream normalization. Internal admin tests and quality jobs do not enter
// this chain and do not require a caller-controlled bypass.
func GroupBlockSubagents() gin.HandlerFunc {
	return func(c *gin.Context) {
		key, ok := GetAPIKeyFromContext(c)
		if !ok || key == nil || key.Group == nil || !key.Group.BlockSubagents || c.Request == nil {
			c.Next()
			return
		}
		original := c.Copy()
		original.Request = c.Request.Clone(c.Request.Context())
		check := groupSubagentFrameCheck(func(body []byte) bool {
			return service.IsCodexSubagentRequest(original, body)
		})
		var body []byte
		if isResponsesWebSocketRoute(c) {
			c.Set(groupSubagentFrameCheckKey, check)
		} else if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead && c.Request.Method != http.MethodDelete {
			var readOK bool
			body, readOK = readAdmissionRequestBody(c)
			if !readOK {
				return
			}
		}
		if check(body) {
			markGroupSubagentRejected(c)
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": gin.H{
				"type": "permission_error", "code": "subagents_blocked", "message": GroupSubagentsBlockedMessage,
			}})
			return
		}
		c.Next()
	}
}

// CheckGroupSubagentFrame rejects marked first and subsequent WS frames using
// the ingress header snapshot, even after composite routing changes the group.
func CheckGroupSubagentFrame(c *gin.Context, body []byte) bool {
	if c != nil {
		if value, ok := c.Get(groupSubagentFrameCheckKey); ok {
			if check, ok := value.(groupSubagentFrameCheck); ok && check(body) {
				markGroupSubagentRejected(c)
				return true
			}
		}
	}
	return false
}

func markGroupSubagentRejected(c *gin.Context) {
	service.MarkOpsClientBusinessLimited(c, service.OpsClientBusinessLimitedReasonLocalPolicyDenied)
	MarkIngressRejected(c, IngressRejectSubagentsBlocked)
}

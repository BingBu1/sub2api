package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

const (
	SeedanceVideosEndpointCreate           GrokMediaEndpoint        = "seedance_videos_create"
	SeedanceVideosEndpointStatus           GrokMediaEndpoint        = "seedance_videos_status"
	SeedanceVideosEndpointContent          GrokMediaEndpoint        = "seedance_videos_content"
	OpenAIEndpointCapabilitySeedanceVideos OpenAIEndpointCapability = "seedance_videos"
)

func (e GrokMediaEndpoint) IsSeedanceVideos() bool {
	return e == SeedanceVideosEndpointCreate || e == SeedanceVideosEndpointStatus || e == SeedanceVideosEndpointContent
}

// Values are native-model CNY per million actual output tokens, before any
// reseller discount. Freeze the table at submission, never price from log.quota
// (a settlement log can contain only the adjustment to an earlier precharge).
type SeedanceVideosTariff struct {
	Model string                `json:"model"`
	Rates map[string][2]float64 `json:"rates"` // no reference video, reference video
}

type SeedanceVideosUsage struct {
	Model      string
	Tokens     int
	Resolution string
	VideoInput string
}

type seedanceVideosTariffContextKey struct{}

func WithSeedanceVideosTariff(ctx context.Context, tariff *SeedanceVideosTariff) context.Context {
	return context.WithValue(ctx, seedanceVideosTariffContextKey{}, tariff)
}

func seedanceVideosTariff(model string) (*SeedanceVideosTariff, error) {
	t := &SeedanceVideosTariff{Model: model, Rates: map[string][2]float64{}}
	switch model {
	case "doubao-seedance-2-0-260128":
		t.Rates = map[string][2]float64{"480p": {46, 28}, "720p": {46, 28}, "1080p": {51, 31}, "4k": {26, 16}}
	case "doubao-seedance-2-5-260628":
		t.Rates = map[string][2]float64{"480p": {70, 42}, "720p": {70, 42}, "1080p": {77, 46}}
	case "doubao-seedance-2-0-fast-260128":
		t.Rates = map[string][2]float64{"480p": {37, 22}, "720p": {37, 22}}
	case "doubao-seedance-2-0-mini-260615":
		t.Rates = map[string][2]float64{"480p": {23, 14}, "720p": {23, 14}}
	default:
		return nil, fmt.Errorf("Seedance Videos requires a supported native doubao model")
	}
	return t, nil
}

func (t *SeedanceVideosTariff) CostCNY(u *SeedanceVideosUsage) (float64, error) {
	if t == nil || u == nil || t.Model != u.Model || u.Tokens <= 0 {
		return 0, fmt.Errorf("missing or mismatched Seedance settlement")
	}
	rates, ok := t.Rates[u.Resolution]
	if !ok || (u.VideoInput != "none" && u.VideoInput != "video") {
		return 0, fmt.Errorf("unknown Seedance settlement tier")
	}
	i := 0
	if u.VideoInput == "video" {
		i = 1
	}
	price := rates[i]
	if price <= 0 || math.IsNaN(price) || math.IsInf(price, 0) {
		return 0, fmt.Errorf("invalid Seedance tariff")
	}
	return float64(u.Tokens) * price / 1e6, nil
}

// Public Videos accepts JSON only. Ark bodies are explicitly translated so
// unsupported callback/tools fields cannot silently disappear at the relay.
func seedanceVideosBody(body []byte, ark bool) ([]byte, GrokMediaRequestInfo, error) {
	var info GrokMediaRequestInfo
	if !gjson.ValidBytes(body) || !gjson.ParseBytes(body).IsObject() {
		return nil, info, fmt.Errorf("request body must be a JSON object")
	}
	if ark {
		var err error
		info, err = ParseSeedanceRequest(body)
		if err != nil {
			return nil, info, err
		}
		payload := map[string]any{"model": info.Model, "prompt": info.Prompt}
		metadata := map[string]any{}
		var content []any
		for _, item := range gjson.GetBytes(body, "content").Array() {
			if item.Get("type").String() != "text" {
				content = append(content, item.Value())
			}
		}
		if len(content) > 0 {
			metadata["content"] = content
		}
		var unsupported string
		gjson.ParseBytes(body).ForEach(func(k, v gjson.Result) bool {
			switch k.String() {
			case "model", "content":
			case "duration":
				payload["seconds"] = v.Value()
			case "resolution", "ratio", "watermark", "seed", "generate_audio", "camera_fixed", "return_last_frame", "draft", "service_tier":
				metadata[k.String()] = v.Value()
			default:
				unsupported = k.String()
			}
			return unsupported == ""
		})
		if unsupported != "" {
			return nil, info, fmt.Errorf("Seedance Videos does not support field %s", unsupported)
		}
		payload["metadata"] = metadata
		body, err = json.Marshal(payload)
		if err != nil {
			return nil, info, err
		}
	}
	model := gjson.GetBytes(body, "model")
	if model.Type != gjson.String || strings.TrimSpace(model.String()) == "" {
		return nil, info, fmt.Errorf("model is required")
	}
	info.Model = strings.TrimSpace(model.String())
	prompt := gjson.GetBytes(body, "prompt")
	if prompt.Exists() && prompt.Type != gjson.String {
		return nil, info, fmt.Errorf("prompt must be a string")
	}
	info.Prompt = prompt.String()
	metadata := gjson.GetBytes(body, "metadata")
	if metadata.Exists() && !metadata.IsObject() {
		return nil, info, fmt.Errorf("metadata must be an object")
	}
	for _, field := range []string{"callback_url", "tools", "web_search"} {
		if gjson.GetBytes(body, field).Exists() || metadata.Get(field).Exists() {
			return nil, info, fmt.Errorf("Seedance Videos does not support %s", field)
		}
	}
	seconds := gjson.GetBytes(body, "seconds")
	if !seconds.Exists() {
		body, _ = sjson.SetBytes(body, "seconds", 5)
		info.DurationSeconds = 5
	} else {
		n := seconds.Float()
		if seconds.Type != gjson.Number || math.Trunc(n) != n || (n != -1 && (n < 4 || n > 30)) {
			return nil, info, fmt.Errorf("seconds must be -1 or an integer between 4 and 30")
		}
		info.DurationSeconds = int(n)
	}
	info.Resolution = metadata.Get("resolution").String()
	if info.Resolution == "" {
		info.Resolution = "720p"
		body, _ = sjson.SetBytes(body, "metadata.resolution", info.Resolution)
	}
	content := metadata.Get("content")
	if content.Exists() && !content.IsArray() {
		return nil, info, fmt.Errorf("metadata.content must be an array")
	}
	for _, item := range content.Array() {
		switch item.Get("type").String() {
		case "image_url":
			info.InputImageURLs = append(info.InputImageURLs, item.Get("image_url.url").String())
		case "video_url", "audio_url":
		default:
			return nil, info, fmt.Errorf("metadata.content supports image_url, video_url and audio_url; put text in prompt")
		}
	}
	images := gjson.GetBytes(body, "images")
	if images.Exists() && !images.IsArray() {
		return nil, info, fmt.Errorf("images must be an array")
	}
	for _, item := range images.Array() {
		if item.Type != gjson.String {
			return nil, info, fmt.Errorf("images must contain URL strings")
		}
		info.InputImageURLs = append(info.InputImageURLs, item.String())
	}
	if strings.TrimSpace(info.Prompt) == "" && len(content.Array()) == 0 && len(images.Array()) == 0 {
		return nil, info, fmt.Errorf("prompt or input media is required")
	}
	return body, info, nil
}

func ParseSeedanceVideosRequest(body []byte) (GrokMediaRequestInfo, error) {
	_, info, err := seedanceVideosBody(body, false)
	return info, err
}

func seedanceVideosBase(base string) string {
	return strings.TrimSuffix(strings.TrimRight(base, "/"), "/v1")
}

// Only a final settlement record is authoritative. Precharges have usage_facts
// too, sometimes fractional/estimated tokens, but no actual_quota field.
func parseSeedanceVideosSettlement(body []byte, taskID, model string) (*SeedanceVideosUsage, error) {
	if !gjson.ValidBytes(body) || !gjson.GetBytes(body, "success").Bool() || !gjson.GetBytes(body, "data").IsArray() {
		return nil, fmt.Errorf("invalid Seedance usage log response")
	}
	var found *SeedanceVideosUsage
	for _, log := range gjson.GetBytes(body, "data").Array() {
		other := gjson.Parse(log.Get("other").String())
		if other.Get("task_id").String() != taskID {
			continue
		}
		logType := log.Get("type").Int()
		final := other.Get("actual_quota").Type == gjson.Number && other.Get("pre_consumed_quota").Type == gjson.Number
		// A type=6 row may be a partial refund after an overestimated hold.
		// Only a successful task's final, positive settlement is chargeable.
		if logType == 6 && (!final || other.Get("actual_quota").Float() <= 0) {
			return nil, fmt.Errorf("Seedance task was refunded")
		}
		if (logType != 2 && logType != 6) || !final || other.Get("actual_quota").Float() <= 0 || other.Get("billing_mode").String() != "tiered_expr" || !other.Get("is_task").Bool() {
			continue
		}
		tokens := other.Get("usage_facts.tokens")
		n := tokens.Float()
		if log.Get("model_name").String() != model || tokens.Type != gjson.Number || n <= 0 || n > 1e9 || math.Trunc(n) != n {
			return nil, fmt.Errorf("invalid Seedance final token usage")
		}
		u := &SeedanceVideosUsage{Model: model, Tokens: int(n), Resolution: other.Get("usage_facts.resolution").String(), VideoInput: other.Get("usage_facts.video_input").String()}
		tariff, err := seedanceVideosTariff(model)
		if err != nil {
			return nil, err
		}
		if _, err = tariff.CostCNY(u); err != nil {
			return nil, err
		}
		if found != nil && *found != *u {
			return nil, fmt.Errorf("conflicting Seedance final usage")
		}
		found = u
	}
	if found == nil {
		return nil, fmt.Errorf("Seedance final usage is not available yet")
	}
	return found, nil
}

func (s *OpenAIGatewayService) seedanceVideosRequest(ctx context.Context, account *Account, method, target string, body []byte) (*http.Response, error) {
	key := strings.TrimSpace(account.GetCredential("api_key"))
	if key == "" {
		return nil, fmt.Errorf("Seedance account missing api_key")
	}
	req, err := http.NewRequestWithContext(WithHTTPUpstreamRedirectsDisabled(ctx), method, target, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	account.ApplyHeaderOverrides(req.Header)
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	proxy := ""
	if account.ProxyID != nil && account.Proxy != nil {
		proxy = account.Proxy.URL()
	}
	return s.httpUpstream.Do(req, proxy, account.ID, account.Concurrency)
}

// Retain verified usage for subsequent polls/downloads after it leaves the
// upstream's bounded recent-log window. Ownership is checked by the handler;
// the cache is also isolated by upstream account and task ID.
func (s *OpenAIGatewayService) seedanceVideosFinalUsage(ctx context.Context, account *Account, base, id, model string) (*SeedanceVideosUsage, error) {
	cacheKey := fmt.Sprintf("seedance-videos-usage:%d:%s", account.ID, id)
	if s.cache != nil {
		if raw, err := s.cache.GetGrokVideoPendingBilling(ctx, cacheKey); err == nil && len(raw) > 0 {
			var usage SeedanceVideosUsage
			if json.Unmarshal(raw, &usage) == nil && usage.Model == model {
				if tariff, err := seedanceVideosTariff(model); err == nil {
					if _, err = tariff.CostCNY(&usage); err == nil {
						return &usage, nil
					}
				}
			}
		}
	}
	resp, err := s.seedanceVideosRequest(ctx, account, http.MethodGet, base+"/api/log/token", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Seedance usage log unavailable")
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, (16<<20)+1))
	if err != nil {
		return nil, err
	}
	if len(raw) > 16<<20 {
		return nil, fmt.Errorf("Seedance usage log too large")
	}
	usage, err := parseSeedanceVideosSettlement(raw, id, model)
	if err != nil {
		return nil, err
	}
	if s.cache != nil {
		encoded, _ := json.Marshal(usage)
		if err = s.cache.SetGrokVideoPendingBilling(ctx, cacheKey, encoded, 24*time.Hour); err != nil {
			return nil, fmt.Errorf("could not retain Seedance final usage")
		}
	}
	return usage, nil
}

func (s *OpenAIGatewayService) forwardSeedanceVideos(ctx context.Context, c *gin.Context, account *Account, endpoint GrokMediaEndpoint, taskID string, body []byte) (*OpenAIForwardResult, error) {
	if endpoint == SeedanceEndpointDelete {
		c.JSON(http.StatusMethodNotAllowed, gin.H{"error": gin.H{"type": "unsupported_operation", "message": "This Seedance upstream does not support task deletion"}})
		return nil, fmt.Errorf("Seedance Videos cannot delete tasks")
	}
	base, err := s.validateUpstreamBaseURL(account.GetCredential("base_url"))
	if err != nil {
		return nil, err
	}
	base = strings.TrimSuffix(strings.TrimSuffix(seedanceVideosBase(base), "/api/v3"), "/v3")
	nativeArk := account.UsesSeedanceArkLogs() && (endpoint == SeedanceEndpointCreate || endpoint == SeedanceEndpointStatus)
	create := endpoint == SeedanceEndpointCreate || endpoint == SeedanceVideosEndpointCreate
	ark := endpoint == SeedanceEndpointCreate || endpoint == SeedanceEndpointStatus
	content := endpoint == SeedanceVideosEndpointContent
	id := strings.TrimPrefix(taskID, "seedance:")
	target, method := base+"/v1/videos", http.MethodGet
	result := &OpenAIForwardResult{ResponseID: taskID, UpstreamEndpoint: "/v1/videos"}
	if create {
		var info GrokMediaRequestInfo
		if nativeArk {
			info, err = ParseSeedanceRequest(body)
			info.Resolution = strings.ToLower(strings.TrimSpace(gjson.GetBytes(body, "resolution").String()))
			if info.Resolution == "" {
				info.Resolution = "720p"
			}
			info.DurationSeconds = int(gjson.GetBytes(body, "duration").Int())
			// A draft ID can refer to another customer's task on a shared account.
			// Do not forward it until draft ownership is supported by the gateway.
			for _, item := range gjson.GetBytes(body, "content").Array() {
				if item.Get("type").String() == "draft_task" {
					return nil, fmt.Errorf("Seedance draft task references are not supported")
				}
			}
		} else {
			body, info, err = seedanceVideosBody(body, ark)
		}
		if err != nil {
			return nil, err
		}
		result.Model, result.BillingModel = info.Model, info.Model
		result.UpstreamModel = account.GetMappedModel(info.Model)
		result.SeedanceVideosTariff, err = seedanceVideosTariff(result.UpstreamModel)
		if err != nil {
			return nil, err
		}
		if _, ok := result.SeedanceVideosTariff.Rates[info.Resolution]; !ok {
			return nil, fmt.Errorf("unsupported Seedance model resolution")
		}
		if result.UpstreamModel != "doubao-seedance-2-5-260628" && info.DurationSeconds > 15 {
			return nil, fmt.Errorf("this Seedance model supports at most 15 seconds")
		}
		body, err = sjson.SetBytes(body, "model", result.UpstreamModel)
		if err != nil {
			return nil, err
		}
		method = http.MethodPost
	} else {
		if id == "" {
			return nil, fmt.Errorf("missing Seedance task ID")
		}
		if err = validateUpstreamPathSegment("Seedance task ID", id); err != nil {
			return nil, err
		}
		target += "/" + id
	}
	if nativeArk {
		target, err = buildSeedanceURL(base, endpoint, id)
		if err != nil {
			return nil, err
		}
		result.UpstreamEndpoint = "/api/v3/contents/generations/tasks"
	}
	started := time.Now()
	resp, err := s.seedanceVideosRequest(ctx, account, method, target, body)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	responseBody, err := ReadUpstreamResponseBody(resp.Body, s.cfg, c, openAITooLargeError)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 300 {
		writeGrokMediaResponse(c, resp, responseBody, s.responseHeaderFilter)
		return nil, fmt.Errorf("Seedance Videos upstream status %d", resp.StatusCode)
	}
	if !gjson.ValidBytes(responseBody) {
		return nil, fmt.Errorf("invalid Seedance Videos response")
	}
	responseID := gjson.GetBytes(responseBody, "id").String()
	if responseID == "" || validateUpstreamPathSegment("Seedance task ID", responseID) != nil || (!create && responseID != id) {
		return nil, fmt.Errorf("invalid Seedance Videos response task ID")
	}
	result.ResponseHeaders = resp.Header.Clone()
	result.ResponseID = SeedanceTaskKey(responseID)
	status := gjson.GetBytes(responseBody, "status").String()
	if !create && (status == "completed" || (nativeArk && status == "succeeded")) {
		result.UpstreamModel = gjson.GetBytes(responseBody, "model").String()
		if nativeArk {
			tariff, ok := ctx.Value(seedanceVideosTariffContextKey{}).(*SeedanceVideosTariff)
			if !ok || tariff == nil {
				return nil, fmt.Errorf("Seedance Ark billing snapshot unavailable")
			}
			// Ark may omit model or report a private upstream model ID. Use the
			// admitted native model frozen at creation, never the quota-like usage.
			result.UpstreamModel = tariff.Model
		}
		// This API is authenticated with the inference key; never depend on a
		// human login session or store the upstream dashboard password.
		var usageErr error
		result.SeedanceVideosUsage, usageErr = s.seedanceVideosFinalUsage(ctx, account, base, id, result.UpstreamModel)
		if usageErr != nil {
			c.Header("Retry-After", "5")
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"type": "usage_pending", "message": "Video completed; final token settlement is unavailable. Retry this task; do not resubmit generation."}})
			return nil, usageErr
		}
		result.Usage.OutputTokens = result.SeedanceVideosUsage.Tokens
		if tariff, ok := ctx.Value(seedanceVideosTariffContextKey{}).(*SeedanceVideosTariff); ok {
			if _, err = tariff.CostCNY(result.SeedanceVideosUsage); err != nil {
				return nil, err
			}
		}
		responseBody, _ = sjson.SetBytes(responseBody, "usage.completion_tokens", result.Usage.OutputTokens)
		responseBody, _ = sjson.SetBytes(responseBody, "usage.total_tokens", result.Usage.OutputTokens)
	}
	if content {
		if status != "completed" {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"type": "video_not_ready", "message": "Video is not completed"}})
			return nil, fmt.Errorf("Seedance video not completed")
		}
		mediaResp, err := s.seedanceVideosRequest(ctx, account, http.MethodGet, target+"/content", nil)
		if err != nil {
			return nil, err
		}
		defer mediaResp.Body.Close()
		if mediaResp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("Seedance video download status %d", mediaResp.StatusCode)
		}
		result.Duration = time.Since(started)
		c.Header("Cache-Control", "private, no-store")
		if err := writeGrokMediaContentResponse(c, mediaResp); err != nil {
			// Generation is already complete and billable even if the client
			// disconnects while downloading. Preserve the verified usage result.
			_ = c.Error(err)
		}
		return result, nil
	}
	if ark && !nativeArk {
		if create {
			responseBody, _ = json.Marshal(map[string]string{"id": responseID})
		} else {
			mapped := map[string]string{"queued": "queued", "in_progress": "running", "completed": "succeeded", "failed": "failed"}[status]
			if mapped == "" {
				return nil, fmt.Errorf("unknown Seedance Videos status")
			}
			responseBody, _ = sjson.SetBytes(responseBody, "status", mapped)
			if status == "completed" {
				responseBody, _ = sjson.SetBytes(responseBody, "content.video_url", "/api/v3/contents/generations/tasks/"+id+"/content")
			}
		}
	}
	result.Duration = time.Since(started)
	c.Header("Cache-Control", "private, no-store")
	writeGrokMediaResponse(c, resp, responseBody, s.responseHeaderFilter)
	return result, nil
}

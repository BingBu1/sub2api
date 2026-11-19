package service

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/tidwall/gjson"
)

const OpenAIEndpointCapabilitySeedanceArkLogs OpenAIEndpointCapability = "seedance_ark_logs"

var seedanceVideosArkOptions = []string{
	"watermark", "seed", "generate_audio", "camera_fixed", "return_last_frame",
	"draft", "service_tier", "frames", "output_format", "execution_expires_after", "omni_reference_task_type",
}

// Presence matters: false and zero still carry user intent. Never fall back to
// the legacy Videos endpoint for options it rejects, or strip those options.
func SeedanceVideosRequiresArk(body []byte) bool {
	for _, field := range seedanceVideosArkOptions {
		if gjson.GetBytes(body, field).Exists() || gjson.GetBytes(body, "metadata."+field).Exists() {
			return true
		}
	}
	return false
}

// Normalize the public Videos contract before routing and before translation.
// This also ensures duplicate settings cannot silently choose a different tier.
func normalizeSeedanceVideosOptions(body []byte) ([]byte, error) {
	var payload map[string]json.RawMessage
	if err := json.Unmarshal(body, &payload); err != nil || payload == nil {
		return nil, fmt.Errorf("request body must be a JSON object")
	}
	metadata := map[string]json.RawMessage{}
	if raw, ok := payload["metadata"]; ok {
		if err := json.Unmarshal(raw, &metadata); err != nil || metadata == nil {
			return nil, fmt.Errorf("metadata must be an object")
		}
	}
	options := map[string]bool{"resolution": true, "ratio": true}
	for _, field := range seedanceVideosArkOptions {
		options[field] = true
	}
	for field := range payload {
		if options[field] {
			if other, ok := metadata[field]; ok {
				left, right := gjson.ParseBytes(other), gjson.ParseBytes(payload[field])
				if left.Type != right.Type || left.String() != right.String() {
					return nil, fmt.Errorf("conflicting %s and metadata.%s", field, field)
				}
			}
			metadata[field] = payload[field]
			delete(payload, field)
			continue
		}
		switch field {
		case "model", "prompt", "seconds", "size", "images", "metadata":
		default:
			return nil, fmt.Errorf("unsupported Seedance Videos field %s", field)
		}
	}
	for field, raw := range metadata {
		if !options[field] && field != "content" {
			return nil, fmt.Errorf("unsupported Seedance Videos metadata field %s", field)
		}
		v := gjson.ParseBytes(raw)
		switch field {
		case "watermark", "generate_audio", "camera_fixed", "return_last_frame", "draft":
			if v.Type != gjson.True && v.Type != gjson.False {
				return nil, fmt.Errorf("%s must be a boolean", field)
			}
		case "seed", "frames", "execution_expires_after":
			if v.Type != gjson.Number || strings.ContainsAny(v.Raw, ".eE") {
				return nil, fmt.Errorf("%s must be an integer", field)
			}
		case "resolution", "ratio", "service_tier", "output_format", "omni_reference_task_type":
			if v.Type != gjson.String || strings.TrimSpace(v.String()) == "" {
				return nil, fmt.Errorf("%s must be a non-empty string", field)
			}
		}
	}
	if raw, ok := metadata["resolution"]; ok {
		metadata["resolution"], _ = json.Marshal(strings.ToLower(strings.TrimSpace(gjson.ParseBytes(raw).String())))
	}
	if raw, ok := payload["size"]; ok {
		sizes := map[string][2]string{"1280x720": {"720p", "16:9"}, "720x1280": {"720p", "9:16"}, "1920x1080": {"1080p", "16:9"}, "1080x1920": {"1080p", "9:16"}}
		v := gjson.ParseBytes(raw)
		tier, valid := sizes[v.String()]
		if v.Type != gjson.String || !valid {
			return nil, fmt.Errorf("size must be 1280x720, 720x1280, 1920x1080 or 1080x1920")
		}
		for i, field := range []string{"resolution", "ratio"} {
			if old, exists := metadata[field]; exists && gjson.ParseBytes(old).String() != tier[i] {
				return nil, fmt.Errorf("size conflicts with %s", field)
			}
			metadata[field], _ = json.Marshal(tier[i])
		}
	}
	payload["metadata"], _ = json.Marshal(metadata)
	return json.Marshal(payload)
}

func seedanceVideosToArk(body []byte) ([]byte, GrokMediaRequestInfo, error) {
	body, info, err := seedanceVideosBody(body, false)
	if err != nil {
		return nil, info, err
	}
	// RawMessage preserves integer seeds exactly, including values above 2^53.
	var videos map[string]json.RawMessage
	_ = json.Unmarshal(body, &videos)
	var payload map[string]json.RawMessage
	_ = json.Unmarshal(videos["metadata"], &payload)
	var content []json.RawMessage
	if strings.TrimSpace(info.Prompt) != "" {
		text, _ := json.Marshal(map[string]string{"type": "text", "text": info.Prompt})
		content = append(content, text)
	}
	var media []json.RawMessage
	_ = json.Unmarshal(payload["content"], &media)
	content = append(content, media...)
	for _, url := range gjson.GetBytes(body, "images").Array() {
		image, _ := json.Marshal(map[string]any{"type": "image_url", "image_url": map[string]string{"url": url.String()}, "role": "reference_image"})
		content = append(content, image)
	}
	payload["model"] = videos["model"]
	payload["duration"] = videos["seconds"]
	payload["content"], _ = json.Marshal(content)
	converted, err := json.Marshal(payload)
	return converted, info, err
}

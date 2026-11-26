package service

import (
	"fmt"
	"math"
	"strings"

	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

func isSeedanceDiscountModel(model string) bool {
	return model == "Seedance2.0-Discount" || model == "Seedance2.5-Discount"
}

// Freeze explicitly disclosed estimated units at admission. The upstream's
// completion_tokens is a quota value and must never be used as token usage.
func configureSeedanceDiscountEstimate(body []byte, ark bool, tariff *SeedanceVideosTariff) ([]byte, error) {
	prefix, durationField := "metadata.", "seconds"
	if ark {
		prefix, durationField = "", "duration"
	}
	resolution := strings.ToLower(strings.TrimSpace(gjson.GetBytes(body, prefix+"resolution").String()))
	if resolution == "" {
		resolution = "720p"
	}
	width, height := 1280, 720
	switch resolution {
	case "720p":
	case "1080p":
		width, height = 1920, 1080
	default:
		return nil, fmt.Errorf("Seedance Discount supports only 720p and 1080p; 480p and 4K are unavailable")
	}
	ratio := gjson.GetBytes(body, prefix+"ratio").String()
	if ratio == "" {
		ratio = "16:9"
	}
	if ratio != "16:9" && ratio != "9:16" {
		return nil, fmt.Errorf("estimated Seedance billing requires ratio 16:9 or 9:16")
	}
	duration := gjson.GetBytes(body, durationField)
	seconds := 5.0
	limit := 15.0
	if tariff.Model == "Seedance2.5-Discount" {
		limit = 30
	}
	if duration.Exists() {
		seconds = duration.Float()
		if duration.Type != gjson.Number || math.Trunc(seconds) != seconds || seconds < 4 || seconds > limit {
			return nil, fmt.Errorf("estimated Seedance billing requires a fixed integer duration between 4 and %.0f seconds", limit)
		}
	}
	for _, field := range []string{"frames", "draft", "service_tier"} {
		if gjson.GetBytes(body, prefix+field).Exists() {
			return nil, fmt.Errorf("%s is unavailable with estimated Seedance billing", field)
		}
	}
	videoInput := "none"
	for _, media := range gjson.GetBytes(body, prefix+"content").Array() {
		if media.Get("type").String() == "video_url" {
			videoInput = "video"
		}
	}
	reference := gjson.GetBytes(body, prefix+"reference_video_seconds")
	referenceSeconds := 0.0
	if videoInput == "video" {
		referenceSeconds = reference.Float()
		if reference.Type != gjson.Number || referenceSeconds <= 0 || referenceSeconds > 3600 || math.IsNaN(referenceSeconds) || math.IsInf(referenceSeconds, 0) {
			return nil, fmt.Errorf("reference_video_seconds must declare total reference video duration (greater than 0, at most 3600) for estimated billing")
		}
	} else if reference.Exists() {
		return nil, fmt.Errorf("reference_video_seconds requires reference video input")
	}
	tokens := int(math.Ceil((seconds + referenceSeconds) * float64(width*height) * 24 / 1024))
	tariff.EstimatedUsage = &SeedanceVideosUsage{Model: tariff.Model, Tokens: tokens, Resolution: resolution, VideoInput: videoInput}
	var err error
	body, err = sjson.DeleteBytes(body, prefix+"reference_video_seconds")
	if err != nil {
		return nil, err
	}
	body, err = sjson.SetBytes(body, prefix+"resolution", resolution)
	if err != nil {
		return nil, err
	}
	body, err = sjson.SetBytes(body, prefix+"ratio", ratio)
	if err != nil {
		return nil, err
	}
	return sjson.SetBytes(body, durationField, seconds)
}

func seedanceDiscountBillingNotice(usage *SeedanceVideosUsage) map[string]any {
	return map[string]any{"basis": "estimated_tokens", "estimated_tokens": usage.Tokens,
		"resolution": usage.Resolution, "reference_video": usage.VideoInput == "video",
		"formula":                "(requested output seconds + declared reference video seconds) * width * height * 24 / 1024",
		"charge_on_success_only": true}
}

# Seedance Discount estimated billing

The public models `Seedance2.0` and `Seedance2.5` map to the upstream
`Seedance2.0-Discount` and `Seedance2.5-Discount` models. These upstream aliases
report quota units in `usage.completion_tokens`; that field is not actual video
token usage. This integration uses explicitly disclosed estimates instead.

The admission snapshot freezes the requested output duration, resolution,
reference-video duration, token estimate and base tariff. Only successful tasks
are billed. Repeated status or content requests share the existing durable task
billing deduplication key. Failed and incomplete tasks are not billed.

Estimated tokens are rounded up from:

```
(requested output seconds + declared total reference video seconds)
  * width * height * 24 / 1024
```

720p uses 1280×720; 1080p uses 1920×1080, in either landscape or portrait.
480p, 4K, square output, adaptive duration, explicit frame counts, draft mode and
service-tier overrides are not admitted under this estimate contract.
Fixed durations are 4–15 seconds for 2.0 and 4–30 seconds for 2.5, subject to
the upstream accepting the requested duration.

For reference-video input, provide `reference_video_seconds` with the sum of
input-video durations. Put it at the top level for Ark requests or in `metadata`
for Videos JSON requests. This is a caller-declared duration, not an independently
measured media duration. It is removed before forwarding upstream. Missing or
invalid declarations are rejected before generation. Input and output seconds use
the output-resolution estimate and the reference-video tariff.

| Model | Resolution | Base, no video input | Base, video input | Sale at 0.83, no video | Sale at 0.83, video |
|---|---|---:|---:|---:|---:|
| Seedance2.0 | 720p | 46 | 28 | 38.18 | 23.24 |
| Seedance2.0 | 1080p | 51 | 31 | 42.33 | 25.73 |
| Seedance2.5 | 720p | 70 | 42 | 58.10 | 34.86 |
| Seedance2.5 | 1080p | 77 | 46 | 63.91 | 38.18 |

All prices above are CNY per million estimated tokens. The configured group rate
is applied by existing billing code; it is not multiplied into the base tariff.
For example, 2.0 at 720p for five seconds without video input costs
108000 × 46 / 1000000 × 0.83 = CNY 4.12344.

The model plaza marks these prices as estimated billing. Task creation and
successful completion responses include `billing.basis: "estimated_tokens"`;
successful completion also includes `usage.estimated: true`. Ordinary native
Doubao models continue to require verified final token settlement logs.

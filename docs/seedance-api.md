# Seedance 原生 API

支持火山方舟 Ark 的异步视频任务协议，无需把 `content[]` 转换成 OpenAI `messages` 或 Grok `prompt`。

## 配置

1. 创建 OpenAI 平台的 **API Key** 账号，填写 Ark API Key，Base URL 使用 `https://ark.cn-beijing.volces.com/api/v3`。兼容服务可填写自己的 `/api/v3` 或 `/v3` Base URL。
2. 在账号的端点能力中勾选 **Seedance (Ark)**。默认不启用，避免请求误调度到其他 OpenAI 账号。支持创建、编辑与批量编辑。
3. 将账号加入 OpenAI 分组并启用分组的「允许图片生成」媒体权限；合成分组也可路由到这些账号。
4. 配置模型映射，例如将公开模型名 `seedance-video` 映射到实际 `doubao-seedance-*` 模型或 `ep-*` 推理接入点。配置对应模型的输出 token 价格；本接口不使用 Grok 的按秒视频价格。

## 调用

```bash
curl "$SUB2API_BASE_URL/api/v3/contents/generations/tasks" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "seedance-video",
    "content": [{"type": "text", "text": "海浪轻轻拍打沙滩"}],
    "duration": 5,
    "resolution": "720p",
    "ratio": "16:9",
    "generate_audio": true
  }'

# 使用创建响应中的原生 id 查询，直至 succeeded / failed / cancelled 等终态。
curl "$SUB2API_BASE_URL/api/v3/contents/generations/tasks/$TASK_ID" \
  -H "Authorization: Bearer $SUB2API_KEY"

curl -X DELETE "$SUB2API_BASE_URL/api/v3/contents/generations/tasks/$TASK_ID" \
  -H "Authorization: Bearer $SUB2API_KEY"
```

亦支持 `/v3`、`/v1` 和无版本前缀别名。Ark SDK 的 Base URL 可改为 `$SUB2API_BASE_URL/api/v3`。文本、图片、视频、音频内容、角色及扩展参数原样传递，仅按账号配置改写模型名；响应保持上游原生格式。

## 任务与计费

- 查询和删除只能访问同一用户、同一 API Key、同一分组创建的任务，并始终使用原提交账号；不会转到其他账号查询。
- 创建时不扣 token 用量。首次查询到 `succeeded` 后，根据上游 `usage.completion_tokens` 计费；重复查询由共享缓存声明和持久化用量去重共同保护。失败、排队及运行中的任务不计费。
- Redis 保存任务绑定及创建时的模型快照，默认 24 小时。需保留 Redis 状态并在有效期内查询完成结果。当前不会后台轮询；只使用回调而不查询的任务不会自动结算。
- 不开放上游的任务列表接口，防止共享账号的任务泄露给其他用户。删除遵循上游语义，不自动退款。
- 异步创建的上游错误不自动重试，以免重复创建付费任务。

协议依据：[火山官方 Go SDK](https://github.com/volcengine/volcengine-go-sdk/blob/master/service/arkruntime/model/content_generation.go)、[创建任务文档](https://www.volcengine.com/docs/82379/1520757)、[查询任务文档](https://www.volcengine.com/docs/82379/1521309)。

## Videos 上游与实际 token 日志（91token）

对于仅提供 `/v1/videos` 的 91token 上游，选择账号能力 **Seedance (Videos + actual token logs)**，Base URL 填站点根地址或 `/v1`。该能力同时支持本站 Ark 入口和 JSON Videos 入口；原有 **Seedance (Ark)** 账号仍按原协议转发。仅适用于同时提供 API Key 鉴权 `/api/log/token`、且返回以下最终结算字段的上游，不能作为任意 OpenAI Videos 服务的通用开关。

OpenAI 分组可直接调用：

```bash
curl "$SUB2API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"doubao-seedance-2-0-260128","prompt":"海浪轻轻拍打沙滩","seconds":5,"metadata":{"resolution":"480p","ratio":"16:9"}}'

curl "$SUB2API_BASE_URL/v1/videos/$TASK_ID" \
  -H "Authorization: Bearer $SUB2API_KEY"
curl "$SUB2API_BASE_URL/v1/videos/$TASK_ID/content" \
  -H "Authorization: Bearer $SUB2API_KEY" -o video.mp4
```

- Ark 的文本合并为 `prompt`，图片/视频/音频内容及角色放入 `metadata.content`，`duration` 转为 `seconds`。Videos 客户端文本放在 `prompt`，非文本媒体放在 `metadata.content`，分辨率与比例放在 `metadata.resolution/ratio`。不支持 multipart、任务删除、callback 或 web_search。未知 Ark 字段明确报错。
- Ark 状态转换为 `queued/running/succeeded/failed`；成功结果的 `content.video_url` 是本站 `/api/v3/contents/generations/tasks/{id}/content` 相对路径，下载时仍须携带原本站 API Key。Videos 状态保留 `queued/in_progress/completed/failed`，并补充核实后的 `usage.completion_tokens/total_tokens`。
- 用原上游 API Key 查询日志，严格匹配 `other.task_id` 和原生模型名。只接受 `type=2`、`billing_mode=tiered_expr`、`is_task=true` 且同时具有 `actual_quota`、`pre_consumed_quota` 的最终结算记录；实际 tokens、分辨率、是否包含参考视频取自 `usage_facts`。忽略预扣记录，不以 `quota` 补扣差额推算整笔费用，也不按时长估算 tokens。
- 原生模型官方基准价快照（2026-11-17 上游公示，单位 CNY/百万 tokens；前者无参考视频，后者有参考视频）：2.0 的 480p/720p 为 46/28，1080p 为 51/31，4k 为 26/16；2.5 的 480p/720p 为 70/42，1080p 为 77/46；fast 的 480p/720p 为 37/22；mini 的 480p/720p 为 23/14。仅支持代码中列出的四个完整原生模型 ID，拒绝无对应价格的模型。价格表在创建时保存，新增模型或调价应更新表并发布。
- 实际 tokens × 对应基准单价 × 本站用户/分组倍率；不采用上游 reseller 折扣，也不采用 Grok 视频按秒价或通用高峰因子。分组设置 `0.86` 就继续使用该倍率。CNY 基准价通过创建时保存的平台汇率转换到本站计费币种，CNY 模式的最终金额仍按人民币基准价计算。
- 模型广场按分辨率及有/无参考视频列出原价和折后价，复用上述计费价格表；美元计费时同时显示人民币参考价。此表只应用于已配置 Videos 能力且原生模型映射一致的账号，不覆盖 Ark 线路的定价。
- 例如 2.0、480p、无参考视频、50,638 tokens：基准费用 ¥2.329348，倍率 0.86 时 ¥2.00323928。上游日志的一行补扣费用不是整笔费用。
- 首次完成查询必须仍能在上游近期日志窗口中找到最终记录。接口目前不支持有效分页/按任务过滤；应持续轮询直至结算成功，避免大量其他请求挤出日志。若日志延迟、丢失、冲突或记录退款，返回 `503 usage_pending` 并提示重试原任务，绝不补造用量或重新提交生成。没有后台任务扫描器；长期不查询仍会受此限制。
- 核实后的用量按账号和任务缓存 24 小时，后续查询/下载不依赖日志继续留存。查询与下载共用同一扣费去重 ID，任务所有权仍要求同一用户、Key、分组。保留 Redis 持久化状态。

上线需另行启用此账号、选择 Videos 能力并打开分组媒体权限；本次代码发布不会自动修改现有账号状态或分组倍率。上游文档与价格来源：`https://91token.299551.com/apidoc/`、`/api/pricing`；实际用量来源为用户授权的只读日志查询。生产代码无需保存上游登录密码。

# GPT 图片按质量计费

`POST /v1/images/generations` 与 `/v1/images/edits` 可使用图片价卡的 `quality:` 档位。JSON 和 multipart 请求均读取原有 `quality` 字段；图片数量来自现有输出计数。质量不借用图片尺寸字段，尺寸统计继续保持原义。

分组 `model_pricing` 示例（源价格仍为 USD）：

```json
{
  "platform": "openai",
  "models": ["gpt-image-2"],
  "billing_mode": "image",
  "per_request_price": 0.029,
  "intervals": [
    {"tier_label": "quality:low", "per_request_price": 0.011},
    {"tier_label": "quality:medium", "per_request_price": 0.011},
    {"tier_label": "quality:high", "per_request_price": 0.029}
  ]
}
```

存在质量档位时，调用者必须明确指定价卡列出的 `quality`；缺省、`auto` 或未配置的档位返回 400，且不会请求上游。这样不会猜测上游的自动档价格。没有质量档的价卡仍按现有分辨率规则计费。不要将质量档与分辨率档混在同一张价卡。渠道映射后的模型需保留同一套质量价卡。

media2 的 OpenAI 兼容上游 base 为 `https://media2.cc`，网关转发到 `/v1/images/generations` 或 `/v1/images/edits`；本接入使用同步 OpenAI Images 协议，不代理其 `/v2/images/tasks` 异步协议。

以源价 low/medium $0.011、high/xhigh/max $0.029 为例，目标分组人民币汇率 6.7、生图独立倍率 1.2 时，实付分别为 ¥0.08844/张、¥0.23316/张。GPT Image 2 仅配置 low/medium/high；2.5 和 2.6 可另配 xhigh/max，2.6 源价由运营者确认。分组限于对应的图片模型，保留其他 OpenAI 分组的币种和倍率。

配置步骤：先创建停用的分组与账号，保存每个模型质量价卡；更新目标分组的独立币种配置；启用图片生成、独立倍率和模型白名单，完成回读后启用分组及账号。按质量计费的服务版本上线前不得启用该通道。模型列表检查不代表实际出图或扣费验收。

import type { TutorialArticle, TutorialBlock } from './tutorialContent'
import { seedanceExamples } from './seedanceExamples'
import { tutorialExamples, type TutorialShell } from './tutorialExamples'

// Customer documentation: describe ZipKiwi's contract, not the upstream's price plan.
export function seedanceArticle(language: string, root: string, api: string, shell: TutorialShell): TutorialArticle {
  const l = (zh: string, en: string) => language === 'en' ? en : zh
  const p = (zh: string, en: string): TutorialBlock => ({ type: 'paragraph', text: l(zh, en) })
  const note = (zh: string, en: string): TutorialBlock => ({ type: 'note', text: l(zh, en) })
  const code = (label: string, value: string): TutorialBlock => ({ type: 'code', label, code: value })
  const table = (headers: string[], rows: string[][]): TutorialBlock => ({ type: 'table', headers, rows })
  const s = (id: string, zh: string, en: string, ...blocks: TutorialBlock[]) => ({ id, title: l(zh, en), blocks })
  const examples = seedanceExamples(root, shell)
  const common = tutorialExamples(root, api, shell)
  const terminal = shell === 'powershell' ? 'PowerShell' : 'Bash / zsh'
  return {
    id: 'seedance', group: 'api', title: l('Seedance 视频 API', 'Seedance Video API'), shell: true,
    updated: '2026-11-19',
    description: l('ZipKiwi 接入文档：火山方舟与 JSON Videos 两种格式，支持文生视频、图片与视频参考、任务查询和人民币计费。', 'Connect to ZipKiwi using Ark or JSON Videos: text-to-video, image and video references, task polling, and CNY billing.'),
    keywords: 'Seedance 视频 火山 方舟 Ark doubao videos API 人民币 token 91token New API Sub2API',
    sections: [
      s('connect', '地址与鉴权', 'Endpoints and authentication',
        p('先在 ZipKiwi 控制台创建绑定 Seedance 分组的 API Key。所有请求使用本站密钥；创建成功只表示任务已受理，需要继续查询到完成。', 'Create a ZipKiwi key in a Seedance-enabled group. Authenticate all requests with that key. A successful submission only means the task was accepted; poll until completion.'),
        table([l('配置项', 'Setting'), l('填写内容', 'Value')], [
          [l('站点根地址', 'Site root'), root],
          [l('方舟 SDK Base URL', 'Ark SDK base URL'), `${root}/api/v3`],
          [l('Videos Base URL', 'Videos base URL'), api],
          ['Authorization', 'Bearer <your-zipkiwi-api-key>'],
          ['Content-Type', 'application/json'],
        ]),
        code(terminal, common.key),
        note('示例中的密钥、任务 ID 和 media.example.com 素材地址都是占位符，请替换后使用。密钥只放在自己的服务端或本机环境变量中。', 'Replace the key, task ID, and media.example.com placeholders. Keep your key on your server or in local environment variables.'),
        { type: 'links', items: [{ label: l('创建 API Key', 'Create an API key'), href: '/keys' }, { label: l('查看模型与价格', 'View models and prices'), href: '/model-plaza' }] }),
      s('models', '获取模型', 'Discover models',
        code(terminal, common.models),
        p('模型列表采用 OpenAI 兼容结构，从 data[].id 读取名称。当前主线路配置了以下两个模型；实际可用范围以你的 Key 返回结果和分组权限为准。模型可见不等于当前通道一定有可用额度。', 'Read model names from data[].id in the OpenAI-compatible response. The primary route currently has the two models below. Availability depends on your key and group; visibility does not guarantee channel capacity.'),
        table(['model', l('说明', 'Description')], [
          ['doubao-seedance-2-0-260128', 'Seedance 2.0'],
          ['doubao-seedance-2-5-260628', 'Seedance 2.5'],
        ]),
        p('分辨率通过 resolution 设置，使用完整模型 ID，不给模型名追加 -1080p 等后缀。下游 New API / Sub2API 获取模型时使用本站根地址和本站 Key；若返回“权限不足”，先确认下游后台账号有管理渠道的权限，并查看实际 HTTP 响应。', 'Use the full model ID and set resolution separately, without adding suffixes such as -1080p. For downstream New API / Sub2API model discovery, use the ZipKiwi root and key. If the downstream UI reports insufficient permissions, check its channel-management permissions and the actual HTTP response.')),
      s('endpoints', '接口一览', 'API reference',
        table([l('用途', 'Purpose'), 'Method', l('路径', 'Path')], [
          [l('模型列表', 'Model list'), 'GET', '/v1/models'],
          [l('方舟：创建', 'Ark: create'), 'POST', '/api/v3/contents/generations/tasks'],
          [l('方舟：查询', 'Ark: query'), 'GET', '/api/v3/contents/generations/tasks/{id}'],
          ['Videos: create', 'POST', '/v1/videos'],
          ['Videos: query', 'GET', '/v1/videos/{id}'],
          [l('下载视频', 'Download video'), 'GET', '/v1/videos/{id}/content'],
        ]),
        note('视频生成使用独立的异步接口。仅支持 Chat Completions 的客户端不能直接生成视频。本站 Videos 为 JSON 接口，不接受 SDK 默认的 multipart 文件上传请求。', 'Video generation uses dedicated asynchronous endpoints. A chat-only client cannot generate videos through Chat Completions. ZipKiwi Videos accepts JSON, not SDK requests that upload files with multipart.')),
      s('create', '方舟：创建文生视频任务', 'Ark: create a text-to-video task',
        code(terminal, examples.create),
        code(l('创建响应示意', 'Illustrative creation response'), '{\n  "id": "<task-id>"\n}'),
        p('立即保存返回的 id，后续查询和下载都使用它。创建请求超时并不代表上游未受理；不要自动重复提交，以免生成多个付费任务。', 'Save the returned id for queries and downloads. A submission timeout does not prove rejection; do not automatically resubmit and create duplicate paid tasks.')),
      s('parameters', '方舟请求参数', 'Ark request parameters',
        table([l('字段', 'Field'), l('类型', 'Type'), l('用法', 'Usage')], [
          ['model', 'string', l('必填；使用模型列表中的完整 ID。', 'Required; use an exact model ID.')],
          ['content', 'array', l('必填；文本及公网素材元素。', 'Required; text and public media elements.')],
          ['duration', 'integer', l('秒数；入门示例使用 5，其他组合由模型与通道决定。', 'Seconds; start with 5. Other combinations depend on the model and channel.')],
          ['resolution', 'string', l('推荐先用 720p；1080p 是否可用取决于通道。', 'Start with 720p; 1080p depends on channel availability.')],
          ['ratio', 'string', l('推荐 16:9 或 9:16。', 'Start with 16:9 or 9:16.')],
          ['watermark', 'boolean', l('示例为 false；由上游执行。', 'The example uses false; implemented by the upstream.')],
          ['seed', 'integer', l('可选；透传，不能保证每次生成完全一致。', 'Optional; forwarded, without guaranteeing identical output.')],
          ['camera_fixed / return_last_frame', 'boolean', l('可选；固定镜头 / 返回末帧，具体效果取决于模型。', 'Optional fixed camera / last frame; behavior depends on the model.')],
          ['omni_reference_task_type', 'string', l('视频参考示例使用 reference。', 'The video-reference example uses reference.')],
          ['frames / output_format / service_tier / execution_expires_after', l('按方舟字段类型', 'Ark field types'), l('方舟原生线路透传；不承诺所有模型都支持。', 'Forwarded on the native Ark route; model support varies.')],
          ['callback_url', 'string', l('方舟原生线路可透传，但仍必须轮询本站完成查询。', 'Forwarded on native Ark; you must still poll ZipKiwi until completion.')],
          ['generate_audio', 'boolean', l('字段可透传；当前通道不承诺有声输出。', 'Forwarded; audio output is not guaranteed on the current channel.')],
        ]),
        note('上游公开说明中，普通生成推荐 5 / 10 秒、720p / 1080p；视频参考的时长描述另有差异。本文采用 5 秒、720p 的基础示例。价格表中存在某档位不表示当前线路已开放该档位；更多时长、480p、4K 或音频支持请先确认。', 'Upstream guidance differs between ordinary generation and video references. These examples use 5 seconds at 720p. A price tier does not guarantee channel support; confirm other durations, 480p, 4K, and audio before use.')),
      s('images', '图片作为首帧或参考', 'Use an image as the first frame or reference',
        p('将下面 JSON 作为方舟创建请求体。first_frame 表示起始画面；需要主体或风格参考时改为 reference_image。图片地址必须能被上游直接读取。', 'Use this JSON as the Ark creation body. first_frame supplies the initial image; use reference_image for subject or style guidance. The URL must be directly accessible to the upstream.'),
        code('JSON', examples.image)),
      s('reference', '参考视频', 'Reference video',
        p('将参考片段放入 content，role 使用 reference_video。素材数量、长度与混合输入限制取决于实际模型；先从一段素材开始。', 'Put the reference clip in content with role reference_video. Media count, duration, and mixed-input limits depend on the model; start with one clip.'),
        code('JSON', examples.reference),
        note('本站没有素材上传接口。请先将本地素材放到自己可公开读取的 HTTPS 地址；不要使用需要登录、会过期太快或禁止外部读取的链接。', 'ZipKiwi does not provide a media upload endpoint. Host local media at a publicly readable HTTPS URL without login requirements, short expiry, or hotlink restrictions.')),
      s('query', '查询任务与状态', 'Poll task status',
        code(terminal, examples.query),
        table(['Ark status', 'Videos status', l('处理方式', 'Action')], [
          ['queued', 'queued', l('等待后再次查询原任务。', 'Wait and query the same task.')],
          ['running', 'in_progress', l('生成中，建议间隔 10 秒查询。', 'Generating; poll about every 10 seconds.')],
          ['succeeded', 'completed', l('完成，读取视频与实际 token 用量。', 'Completed; read the video result and actual token usage.')],
          ['failed / cancelled / expired', 'failed', l('停止轮询，读取错误；决定是否另建任务。', 'Stop polling and inspect the error before deciding to create another task.')],
        ]),
        code(l('方舟完成响应示意（非真实账单）', 'Illustrative Ark completion (not an actual bill)'), JSON.stringify({ id: '<task-id>', status: 'succeeded', content: { video_url: 'https://media.example.com/result.mp4' }, usage: { completion_tokens: 50638, total_tokens: 50638 } }, null, 2)),
        p('使用创建任务时的同一账号、API Key 和分组查询。建议及时轮询至成功并下载结果；本站任务归属与结算缓存默认保留约 24 小时，视频地址的有效期以实际返回结果为准。', 'Query using the same account, API key, and group used to create the task. Poll promptly until success and save the video. Task ownership and settlement caches normally last about 24 hours; video URL expiry depends on the returned result.'),
        note('503 usage_pending 表示视频已完成，但最终用量暂未核实。继续 GET 查询同一个任务 ID；不要重新 POST 生成。仅依赖回调不能完成本站结算。', '503 usage_pending means the video completed but final usage is not yet verified. Keep querying the same task ID with GET; do not POST another generation. Callbacks alone do not settle ZipKiwi billing.')),
      s('download', '下载视频', 'Download the video',
        p('方舟成功结果通常在 content.video_url 返回视频地址；请及时保存。也可使用下面的本站下载接口，携带原 API Key。若返回相对路径，应加本站根地址并按本站鉴权请求；不要把本站 Key 发给第三方视频直链。', 'Ark normally returns the video address in content.video_url. Save it promptly, or use the authenticated ZipKiwi download endpoint below. Resolve relative paths against the site root and authenticate those requests; do not send your ZipKiwi key to third-party video URLs.'),
        code(terminal, examples.download)),
      s('videos', 'JSON Videos 兼容格式', 'JSON Videos compatibility',
        code(terminal, examples.videosCreate), code(terminal, examples.videosQuery),
        table([l('方舟字段', 'Ark field'), l('本站 Videos 字段', 'ZipKiwi Videos field')], [
          ['content 中的 text', 'prompt'], ['duration', 'seconds'],
          ['resolution / ratio', 'metadata.resolution / metadata.ratio'],
          [l('图片、视频参考元素', 'Image/video references'), 'metadata.content'],
        ]),
        note('本站 seconds 必须是数字，如 5；不能照搬上游文档中的字符串 "5"。查询用 GET /v1/videos/{id}，不使用上游文档的 /v1/video/generations/{id}。Videos 不支持 callback_url、tools、web_search 或 multipart 上传。', 'ZipKiwi requires numeric seconds, such as 5, not the string "5" shown in upstream examples. Query GET /v1/videos/{id}, not the upstream /v1/video/generations/{id}. Videos does not support callback_url, tools, web_search, or multipart uploads.')),
      s('sdk', 'Python 与 JavaScript', 'Python and JavaScript',
        p('Python 示例需要 requests 包；提交一次后轮询，出现异常时保留已打印的任务 ID，继续查询该任务。JavaScript 示例用于服务端。', 'The Python example requires requests. Submit once, then poll. If an exception occurs, retain the printed task ID and resume querying it. The JavaScript example is for server-side use.'),
        code('Python', examples.python), code('JavaScript · Node.js 18+', examples.javascript)),
      s('billing', '人民币价格与余额扣除', 'CNY pricing and balance deduction',
        p('本站 Seedance 按实际生成 token 计费：费用（元）= 实际 tokens ÷ 1,000,000 × 对应人民币原价 × 本站有效倍率。有效倍率取用户专属设置或所属分组；0.86 是默认分组示例，并非每枚 Key 的固定价格。', 'Seedance is billed by actual generated tokens: CNY cost = actual tokens / 1,000,000 × the applicable CNY base rate × your effective ZipKiwi multiplier. A user override may replace the group rate; 0.86 is a default group example, not a fixed rate for every key.'),
        table([l('模型', 'Model'), l('分辨率', 'Resolution'), l('无参考视频：元/百万 tokens', 'No reference video: CNY/M tokens'), l('有参考视频：元/百万 tokens', 'With reference video: CNY/M tokens')], [
          ['2.0', '480p / 720p', '46', '28'], ['2.0', '1080p', '51', '31'], ['2.0', '4K', '26', '16'],
          ['2.5', '480p / 720p', '70', '42'], ['2.5', '1080p', '77', '46'],
        ]),
        p('价格记录日期：2026-11-19。上表是本站已配置的 token 基准价，实际可选规格以通道能力为准；最新展示价格查看模型广场。创建时保存本任务价格快照。预扣估算、按秒价格与上游折扣都不作为本站最终用量。', 'Pricing recorded November 19, 2026. These are configured token rates; available specifications depend on the channel. Check Model Plaza for displayed prices. A pricing snapshot is saved at creation. Estimates, per-second prices, and upstream discounts do not determine your final ZipKiwi usage.'),
        code(l('费用示例：2.0 / 720p / 无参考视频 / 倍率 0.86', 'Example: 2.0 / 720p / no reference video / multiplier 0.86'), '50,638 ÷ 1,000,000 × ¥46 = ¥2.329348\n¥2.329348 × 0.86 = ¥2.00323928'),
        note('本站余额按数值 1:1 扣除：Seedance 消费 ¥1 扣除 1 个余额单位，即使其他页面将余额标为 $1，也不再除以美元汇率。创建、排队和生成中不记本站 token 消费；首次查询到成功且核实最终用量后结算，重复查询不会重复扣费。', 'The balance is deducted numerically at 1:1: ¥1 of Seedance usage consumes 1 balance unit, even where another page labels it $1. No USD conversion is applied. Submission, queuing, and generation do not record token charges; settlement occurs on the first successful query with verified final usage. Repeated queries do not charge again.'),
        { type: 'links', items: [{ label: l('模型广场价格', 'Model Plaza pricing'), href: '/model-plaza' }, { label: l('查看消费记录', 'View usage records'), href: '/usage' }] }),
      s('errors', '常见错误与处理', 'Errors and troubleshooting',
        table([l('错误', 'Error'), l('处理方式', 'Action')], [
          ['400', l('核对 JSON、模型 ID、seconds 类型、规格组合及素材地址。', 'Check JSON, model IDs, numeric seconds, supported specifications, and media URLs.')],
          ['401 / 403', l('核对本站 Key、分组权限、余额和任务归属；错误正文决定具体原因。', 'Check the ZipKiwi key, group access, balance, and task ownership; inspect the error body.')],
          ['415', l('创建请求必须为 application/json。', 'Create requests must use application/json.')],
          ['429', l('降低并发，增加查询间隔。', 'Reduce concurrency and increase polling intervals.')],
          ['503 seedance_no_eligible_account', l('当前分组未选出可用 Seedance 账号；联系管理员并提供 Request ID。', 'No eligible Seedance account was selected for this group; send the request ID to support.')],
          ['503 usage_pending', l('只重试原任务的 GET 查询，等待最终用量。', 'Retry only GET for the original task while final usage becomes available.')],
          [l('素材拉取失败 / 超时', 'Media fetch failure / timeout'), l('检查素材是否公网可读以及链接有效期，不要自动重复创建。', 'Check public accessibility and URL expiry; do not automatically resubmit creation.')],
        ])),
      s('limits', '本站支持范围', 'ZipKiwi support scope',
        p('本站提供方舟与 JSON Videos 的创建、查询、下载，以及按真实 token 的人民币结算。暂不开放任务列表、任务删除、素材上传和 draft_task 样片转正片引用；不提供这些功能的调用示例。', 'ZipKiwi provides Ark and JSON Videos creation, queries, downloads, and actual-token CNY settlement. Task listing, deletion, media uploads, and draft_task references are not available.'),
        p('本文参考上游方舟兼容接口说明，并按 ZipKiwi 实际接口重新编写。上游的按秒价格、素材上传地址及任务路径不能直接套用于本站。', 'This guide uses the upstream Ark compatibility reference and is rewritten for ZipKiwi. Upstream per-second rates, upload endpoints, and task paths do not define the ZipKiwi contract.')),
    ],
    sources: [{ label: l('上游方舟协议参考（本站差异见正文）', 'Upstream Ark reference (see ZipKiwi differences above)'), href: 'https://91token.299551.com/apidoc/v2/' }],
  }
}

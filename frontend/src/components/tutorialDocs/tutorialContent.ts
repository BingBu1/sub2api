import { tutorialExamples, type TutorialShell } from './tutorialExamples'

export type TutorialGroup = 'start' | 'agents' | 'apps' | 'api' | 'advanced' | 'help'
export type TutorialBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[]; ordered: boolean }
  | { type: 'code'; label: string; code: string }
  | { type: 'note'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'links'; items: { label: string; href: string }[] }

export interface TutorialArticle {
  id: string
  group: TutorialGroup
  title: string
  description: string
  keywords: string
  shell?: boolean
  sections: { id: string; title: string; blocks: TutorialBlock[] }[]
  sources?: { label: string; href: string }[]
}

export function tutorialContent(language: string, root: string, api: string, shell: TutorialShell): TutorialArticle[] {
  const l = (zh: string, en: string) => language === 'en' ? en : zh
  const examples = tutorialExamples(root, api, shell)
  const terminal = shell === 'powershell' ? 'PowerShell' : 'Bash / zsh'
  const p = (zh: string, en: string): TutorialBlock => ({ type: 'paragraph', text: l(zh, en) })
  const note = (zh: string, en: string): TutorialBlock => ({ type: 'note', text: l(zh, en) })
  const list = (items: [string, string][], ordered = true): TutorialBlock => ({ type: 'list', items: items.map(([zh, en]) => l(zh, en)), ordered })
  const code = (label: string, content: string): TutorialBlock => ({ type: 'code', label, code: content })
  const table = (headers: [string, string][], rows: [string, string][][]): TutorialBlock => ({ type: 'table', headers: headers.map(([zh, en]) => l(zh, en)), rows: rows.map(row => row.map(([zh, en]) => l(zh, en))) })
  const links = (items: [string, string, string][]): TutorialBlock => ({ type: 'links', items: items.map(([zh, en, href]) => ({ label: l(zh, en), href })) })
  const s = (id: string, zh: string, en: string, ...blocks: TutorialBlock[]) => ({ id, title: l(zh, en), blocks })
  const source = (label: string, href: string) => ({ label, href })
  const keys = links([['打开 API 密钥', 'Open API Keys', '/keys'], ['查看模型广场', 'Open Model Plaza', '/model-plaza']])
  const verification = s('verify', '验证是否真正接通', 'Verify the connection', list([
    ['新建会话，发送一句简短测试，例如“只回复：连接成功”。', 'Open a new session and send a short prompt such as “Reply with: Connected”.'],
    ['到迅奇用量记录核对请求时间、密钥名称与模型 ID。', 'Match the request time, key name, and model ID in Zipkiwi usage records.'],
    ['确认回复和用量均正常后，再开启长上下文、工具调用或自动任务。', 'Enable long context, tools, or automated tasks after both the reply and usage look correct.'],
  ]), links([['查看用量记录', 'Open usage records', '/usage'], ['遇到问题？查看排障', 'Troubleshoot a problem', '/tutorials?guide=errors']]))

  return [
    {
      id: 'quickstart', group: 'start', title: l('快速开始', 'Quick start'),
      description: l('准备一枚密钥、一个模型和对应的接口地址，完成第一次调用。', 'Prepare a key, model, and endpoint, then verify your first request.'), keywords: '入门 注册 登录 充值 钱包 余额 quick start balance',
      sections: [
        s('prepare', '先准备好三项信息', 'Prepare three things', table([
          ['需要准备', 'What you need'], ['在哪里获取', 'Where to find it'],
        ], [
          [['API Key', 'API key'], ['控制台 → API 密钥；按工具分别创建。', 'Console → API Keys. Use a separate key per tool.']],
          [['模型 ID', 'Model ID'], ['模型广场中复制准确名称，再确认目标 Key 的分组权限。', 'Copy the exact ID from Model Plaza and check the key group.']],
          [['接口地址', 'API address'], [`OpenAI 兼容：${api}；Anthropic 兼容：${root}。`, `OpenAI compatible: ${api}; Anthropic compatible: ${root}.`]],
        ]), keys),
        s('account', '登录并确认可用额度', 'Sign in and check your allowance', list([
          ['使用自己的账号登录控制台；首次使用先检查站点是否开放注册。', 'Sign in with your own account. Check whether registration is enabled if you are new.'],
          ['在控制台核对余额、订阅与密钥额度。充值或兑换入口以账号实际可见菜单为准。', 'Check your balance, subscription, and key limits. Payment and redemption options depend on the menus available to your account.'],
          ['先用短请求测试，再根据实际需要增加额度，避免自动重试产生连续消费。', 'Start with a short request before increasing your budget or enabling retries.'],
        ]), links([['进入控制台', 'Open the console', '/dashboard']])),
        s('choose', '按你使用的工具继续', 'Choose your tool', links([
          ['CC Switch：可视化切换配置', 'CC Switch: manage configurations', '/tutorials?guide=cc-switch'],
          ['Codex：命令行与桌面配置', 'Codex: CLI and desktop setup', '/tutorials?guide=codex'],
          ['Claude Code：Anthropic 接入', 'Claude Code: Anthropic setup', '/tutorials?guide=claude-code'],
          ['OpenCode：自定义供应商', 'OpenCode: custom providers', '/tutorials?guide=opencode'],
          ['WorkBuddy / ZCode / Hermes', 'WorkBuddy / ZCode / Hermes', '/tutorials?guide=workbuddy'],
          ['开发自己的应用', 'Build your own application', '/tutorials?guide=api-responses'],
        ])),
        verification,
      ],
    },
    {
      id: 'install', group: 'start', title: l('安装与运行环境', 'Installation & environment'),
      description: l('按系统选择官方安装入口，确认终端和编辑器可以正常工作。', 'Choose official downloads for your system and check your terminal and editor.'), keywords: 'Node npm Windows macOS Linux 安装 下载 环境 终端 PowerShell VSCode',
      sections: [
        s('downloads', '从官方入口安装', 'Use official downloads', links([
          ['Node.js 官方下载', 'Download Node.js', 'https://nodejs.org/en/download'],
          ['Visual Studio Code', 'Visual Studio Code', 'https://code.visualstudio.com/download'],
          ['CC Switch 发布页', 'CC Switch releases', 'https://github.com/farion1231/cc-switch/releases'],
          ['Codex 安装说明', 'Codex installation', 'https://developers.openai.com/codex/cli/'],
          ['Claude Code 安装说明', 'Claude Code installation', 'https://code.claude.com/docs/en/setup'],
          ['OpenCode 安装说明', 'OpenCode installation', 'https://opencode.ai/docs/'],
        ]), p('根据设备选择 x64 或 ARM64，macOS 区分 Intel 与 Apple Silicon。下载页会提供当前版本，不必寻找教程截图中的旧安装包。', 'Choose x64 or ARM64 for your device, and Intel or Apple Silicon on macOS. Use the current official download rather than matching an old screenshot.')),
        s('terminal', '确认运行环境', 'Check the environment', p('只有通过 npm 安装的工具才需要相应 Node.js 环境。使用原生安装包时，按该工具自己的安装要求操作。需要 Node.js 时选择符合工具要求的 LTS 版本，安装后重新打开终端。', 'An npm-installed tool needs its required Node.js environment. Native installers have their own requirements. When Node.js is needed, choose a supported LTS version and open a new terminal after installation.'), code('Terminal', 'node --version\nnpm --version'), code('Codex · npm', 'npm install -g @openai/codex\ncodex --version')),
        s('issues', '安装后命令找不到', 'If the command is missing', list([
          ['关闭旧终端和编辑器后重开，确认 PATH 已更新。', 'Reopen your terminal and editor so they pick up PATH changes.'],
          ['在同一个环境内安装和运行：Windows、WSL、容器与 SSH 远端的安装目录彼此独立。', 'Install and run in the same environment. Windows, WSL, containers, and SSH hosts have separate installations.'],
          ['遇到权限或执行策略提示，先按工具官方说明排查，不需要全局关闭系统保护。', 'Follow the tool’s official troubleshooting steps for permission or execution-policy errors.'],
        ])),
      ], sources: [source('Node.js', 'https://nodejs.org/en/download'), source('Codex CLI', 'https://developers.openai.com/codex/cli/')],
    },
    {
      id: 'keys', group: 'start', title: l('API 密钥与额度', 'API keys & limits'),
      description: l('创建、管理、轮换密钥，分清账号余额和密钥限制。', 'Create, manage, and rotate keys, and distinguish account balance from key limits.'), keywords: 'key sk token 密钥 令牌 额度 余额 过期 撤销 充值 IP',
      sections: [
        s('create', '创建一枚专用密钥', 'Create a dedicated key', list([
          ['登录控制台，进入 API 密钥，选择创建密钥。', 'Sign in and open API Keys, then create a key.'],
          ['按“设备-工具-用途”命名，例如 Windows-Codex-个人项目。', 'Name it by device, tool, and purpose, such as Windows-Codex-project.'],
          ['选择支持目标协议与模型的分组，检查额度、有效期和 IP 限制后保存。', 'Choose a group supporting your protocol and model, then review budget, expiry, and IP limits.'],
          ['复制密钥，在客户端的 API Key 字段填写；网站登录密码不能代替 API Key。', 'Copy the key into the client’s API Key field. Your site password is not an API key.'],
        ]), keys),
        s('limits', '余额充足也可能受限制', 'A balance does not remove other limits', table([['检查项', 'Check'], ['说明', 'Meaning']], [
          [['账号余额 / 订阅', 'Balance / subscription'], ['决定账号是否还有可用的调用权益。', 'Determines the account’s remaining allowance.']],
          [['密钥额度 / 时间窗口', 'Key budget / time window'], ['可能设置累计或周期消费上限。字段为 0 的含义请看页面提示。', 'May impose a total or periodic spending limit. Read the field help for what zero means.']],
          [['有效期 / IP 限制', 'Expiry / IP rules'], ['过期或出口 IP 不匹配时，即使账号有余额也无法使用。', 'An expired key or an unmatched source IP can block a funded account.']],
          [['分组 / 模型权限', 'Group / model access'], ['更换分组后，模型列表和客户端配置可能需要重新生成。', 'Regenerate model lists and client configuration after changing groups.']],
        ])),
        s('rotate', '轮换与泄露处理', 'Rotate or revoke a key', list([
          ['先创建新密钥，配置到客户端并完成短请求验证。', 'Create a replacement key and test it in the client.'],
          ['确认新密钥产生正常用量后，撤销旧密钥。', 'Revoke the old key after confirming usage on the replacement.'],
          ['如密钥已泄露，立即撤销并检查异常消费；不要把完整密钥发到工单、群聊或截图里。', 'Revoke a leaked key immediately and review usage. Redact keys in tickets, chats, and screenshots.'],
        ])),
      ],
    },
    {
      id: 'models', group: 'start', title: l('模型、分组与价格', 'Models, groups & pricing'),
      description: l('找到能调用的模型，读懂倍率、Token 和实际费用。', 'Find accessible models and understand multipliers, tokens, and charges.'), keywords: 'model ID pricing token 倍率 缓存 长上下文 计费 价格 分组',
      sections: [
        s('select', '按密钥权限选择模型', 'Choose a model for your key', list([
          ['在模型广场按平台与分组筛选，复制完整模型 ID。', 'Filter Model Plaza by platform and group and copy the full model ID.'],
          ['模型显示名、品牌名与请求中的 ID 可能不同，注意大小写和后缀。', 'A display name or brand is not necessarily the request ID. Preserve case and suffixes.'],
          ['再用目标 Key 查询 /v1/models，并发送一次最小请求确认实际权限。', 'Query /v1/models with the target key and send a minimal request to confirm access.'],
        ]), keys),
        s('pricing', '读懂实际价格', 'Understand the displayed price', list([
          ['分别查看输入、输出、缓存、长上下文与按次计费项目。', 'Check input, output, cache, long-context, and per-request charges separately.'],
          ['以模型广场实时公示和用量记录为准；已显示实付价格时，不要再次乘分组倍率。', 'Use current Model Plaza prices and usage records. Do not multiply an already effective price again.'],
          ['缺少价格不代表免费；模型支持图片输入也不等于支持生成图片。', 'A missing price does not mean free usage. Image input does not imply image generation.'],
        ], false)),
        s('cost', '减少不必要的消费', 'Avoid unnecessary usage', p('长对话会反复携带上下文，自动 Agent 也可能调用辅助模型或重试。先控制单次输出、并发和重试次数，再逐步增加任务规模。价格、容量与模型开放范围均以当前账号页面为准。', 'Long conversations resend context, and agents may call auxiliary models or retry. Start with bounded output, concurrency, and retries before scaling. Current account pages determine prices, limits, and available models.'), links([['查看模型列表接口', 'List models with the API', '/tutorials?guide=api-models']])),
      ],
    },
    {
      id: 'endpoints', group: 'start', title: l('接口地址与协议', 'Endpoints & protocols'),
      description: l('分清网站地址、Base URL 和完整请求地址，避免重复 /v1。', 'Distinguish website URLs, base URLs, and full endpoints to avoid duplicate /v1 paths.'), keywords: 'base URL endpoint 端点 域名 地址 协议 v1 404 authentication bearer',
      sections: [
        s('addresses', '按字段填写正确地址', 'Use the address the field expects', table([['场景', 'Scenario'], ['填写内容', 'Value']], [
          [['OpenAI 兼容 Base URL', 'OpenAI-compatible base URL'], [api, api]],
          [['Claude Code / Anthropic Base URL', 'Claude Code / Anthropic base URL'], [root, root]],
          [['Responses 完整请求地址', 'Full Responses endpoint'], [`${api}/responses`, `${api}/responses`]],
          [['Chat Completions 完整请求地址', 'Full Chat Completions endpoint'], [`${api}/chat/completions`, `${api}/chat/completions`]],
          [['Messages 完整请求地址', 'Full Messages endpoint'], [`${api}/messages`, `${api}/messages`]],
        ]), note('这些示例随本站公开设置中的 API 地址生成。特定分组如果在“使用密钥”中提供了专属路径，请优先使用那里生成的地址。', 'Examples use this site’s configured API address. If Use Key provides a group-specific path, use that generated address first.')),
        s('auth', '协议与鉴权要配套', 'Match authentication to the protocol', code('OpenAI-compatible', 'Authorization: Bearer <your-api-key>\nContent-Type: application/json'), code('Anthropic-compatible', 'x-api-key: <your-api-key>\nanthropic-version: 2023-06-01\nContent-Type: application/json'), p('Responses 使用 input；Chat Completions 和 Messages 使用 messages，但 Messages 还有自己的必填参数与响应结构。改变地址不能自动把一种请求格式变成另一种。', 'Responses uses input. Chat Completions and Messages use messages, but Messages has its own required fields and response shape. Changing a URL does not convert a request format.')),
        s('duplicates', '遇到 404 先看最终请求路径', 'Check the final path for a 404', p('SDK 通常自动追加端点。若最终请求出现 /v1/v1/messages 或 /responses/responses，说明把完整端点填进了 Base URL。也有客户端要求完整地址，应以字段说明为准。', 'SDKs usually append endpoints. Paths such as /v1/v1/messages or /responses/responses indicate a duplicated suffix. Some clients explicitly require a full endpoint; follow that field’s help.')),
      ],
    },
    {
      id: 'cc-switch', group: 'agents', title: 'CC Switch',
      description: l('从密钥页导入供应商，在多个 Agent 配置之间切换。', 'Import a provider from API Keys and switch between agent configurations.'), keywords: 'CCSwitch CCS cc switch 导入 供应商 切换 ccswitch',
      sections: [
        s('install', '安装并启动 CC Switch', 'Install and open CC Switch', p('从项目发布页下载对应系统的安装包，安装后至少启动一次，供系统注册 ccswitch:// 链接。CC Switch 负责管理配置，目标 Agent 仍需单独安装。', 'Download the installer for your system from the project’s releases and launch it once to register ccswitch:// links. Install the target agent separately.'), links([['CC Switch 官方发布页', 'CC Switch releases', 'https://github.com/farion1231/cc-switch/releases']])),
        s('import', '使用迅奇导入入口', 'Import from Zipkiwi', list([
          ['关闭正在运行旧配置的 Agent，打开迅奇的 API 密钥页面。', 'Close agents using an old configuration and open Zipkiwi API Keys.'],
          ['找到目标密钥，点击“导入 CCS”，允许浏览器打开外部应用。', 'Select Import to CCS for the target key and allow the browser to open the external app.'],
          ['在 CC Switch 中检查应用类型、供应商、接口地址、密钥和模型。', 'Review the target app, provider, endpoint, key, and model in CC Switch.'],
          ['保存并启用该配置，重新启动 Codex、Claude Code 等目标工具。', 'Save and enable the profile, then restart the target tool.'],
        ]), keys),
        s('manual', '导入没有打开怎么办', 'If the import does not open', list([
          ['确认软件已启动，浏览器没有拦截外部协议，且当前软件版本支持该导入类型。', 'Check that CC Switch is running, external protocols are permitted, and the import type is supported.'],
          ['也可在对应 Agent 分类手动新增迅奇供应商，按本站该工具教程填写地址与密钥。', 'Alternatively, add a Zipkiwi provider under the target agent and use that tool’s guide here.'],
          ['导入成功只表示配置已写入；如果仍走旧线路，完整退出 Agent 后重试。', 'Import success confirms a saved configuration. Fully quit the agent if it still uses the previous route.'],
        ], false)), verification,
      ], sources: [source('CC Switch', 'https://github.com/farion1231/cc-switch')],
    },
    {
      id: 'codex', group: 'agents', title: 'Codex', shell: true,
      description: l('使用控制台快速配置，或手动接入 Responses 兼容供应商。', 'Use Quick Configure or add a Responses-compatible provider manually.'), keywords: 'codex config.toml OpenAI CLI desktop env_key responses Windows',
      sections: [
        s('quick', '优先使用快速配置', 'Start with Quick Configure', list([
          ['安装 Codex 后，在 API 密钥列表找到目标 Key，点击“快速配置”。', 'Install Codex, find the target key in API Keys, and select Quick Configure.'],
          ['选择实际运行 Codex 的系统，按需导入该 Key 可见的模型目录。', 'Choose the operating system where Codex runs and optionally import models visible to the key.'],
          ['下载并检查脚本内容，按页面提示执行；随后完整退出并重开 Codex。', 'Download and review the generated script, follow its instructions, then fully restart Codex.'],
          ['选择生成的供应商与模型。修改 Key 分组后重新生成配置。', 'Select the generated provider and model. Regenerate configuration after changing key groups.'],
        ]), keys),
        s('manual', '手动配置作为备用', 'Manual configuration', p('先备份现有配置。macOS/Linux 通常位于 ~/.codex/config.toml，Windows 通常位于 %USERPROFILE%\\.codex\\config.toml；自定义 CODEX_HOME 或远程环境请使用对应路径。合并下列字段，替换模型 ID，避免重复定义同一个 TOML 表。', 'Back up your configuration. Typical paths are ~/.codex/config.toml on macOS/Linux and %USERPROFILE%\\.codex\\config.toml on Windows. Respect a custom CODEX_HOME or remote environment. Merge these fields, replace the model ID, and avoid duplicate TOML tables.'), code('~/.codex/config.toml', examples.codex), code(terminal, `${examples.key}\ncodex`), note('上述环境变量只对当前终端及其子进程有效。从桌面图标启动的 Codex 不一定继承；桌面使用优先采用控制台生成的配置方式。', 'The variable applies to the current terminal and its child processes. An app started from a desktop icon may not inherit it; prefer the console-generated setup for desktop use.')),
        s('protocol', '确认使用 Responses', 'Confirm the Responses protocol', p('该配置通过 ZIPKIWI_API_KEY 读取密钥，wire_api 使用 responses。Key 分组和目标模型必须支持该请求路径。已登录的官方账号、其他配置文件或旧进程可能让客户端继续使用原供应商，最终以本站用量记录判断。', 'This configuration reads ZIPKIWI_API_KEY and selects the Responses wire API. The group and model must support that route. Existing login state, another config file, or an old process can retain a previous provider; verify in Zipkiwi usage records.')), verification,
      ], sources: [source('Codex CLI', 'https://developers.openai.com/codex/cli/'), source('Codex model providers', 'https://developers.openai.com/codex/config-advanced/'), source('Codex configuration reference', 'https://developers.openai.com/codex/config-reference/')],
    },
    {
      id: 'claude-code', group: 'agents', title: 'Claude Code', shell: true,
      description: l('通过 Anthropic Messages 协议接入，正确设置地址、令牌与模型。', 'Connect through Anthropic Messages with the correct URL, token, and model.'), keywords: 'Claude Code Anthropic ANTHROPIC_AUTH_TOKEN BASE_URL Sonnet Opus Haiku',
      sections: [
        s('prepare', '确认分组支持 Messages', 'Check Messages support', p('从 Claude Code 官方页面安装工具。然后在迅奇密钥页选择“使用密钥 → Claude Code”，优先采用该分组生成的命令，特别是带专属路径或模型映射的分组。', 'Install Claude Code from its official setup page. In Zipkiwi, use Use Key → Claude Code and prefer the group-generated commands, especially for dedicated paths or model mappings.'), keys),
        s('configure', '在新终端配置并启动', 'Configure and launch in a new terminal', p('将占位符替换为自己的 Key 和当前分组可用的准确模型 ID。这里使用当前终端的环境变量，不会自动写入系统设置。', 'Replace the placeholders with your key and an exact model ID available to its group. These variables apply to the current terminal and do not modify system settings.'), code(terminal, examples.claude)),
        s('models', '主模型与辅助模型', 'Main and auxiliary models', list([
          ['不要把 /v1/messages 填进 ANTHROPIC_BASE_URL；默认兼容入口使用站点根地址。', 'Do not put /v1/messages in ANTHROPIC_BASE_URL. The standard compatible setup uses the site root.'],
          ['若工具额外调用 Haiku、Sonnet 或 Opus 默认模型，检查这些模型在 Key 分组中是否可用；按控制台配置映射，不能只改主模型。', 'Check any default Haiku, Sonnet, or Opus auxiliary model the tool calls. Apply console-generated mappings where required instead of changing only the main model.'],
          ['不要同时保留指向不同服务的旧环境变量、设置文件和代理配置。先确认客户端实际读取了哪套配置。', 'Review conflicting environment variables, settings files, or proxies and confirm which configuration the client reads.'],
        ], false)), verification,
      ], sources: [source('Claude Code setup', 'https://code.claude.com/docs/en/setup'), source('Claude Code LLM gateway', 'https://code.claude.com/docs/en/llm-gateway')],
    },
    {
      id: 'opencode', group: 'agents', title: 'OpenCode', shell: true,
      description: l('复制控制台生成的配置，或创建自定义 OpenAI 兼容供应商。', 'Use the console-generated configuration or add a custom OpenAI-compatible provider.'), keywords: 'opencode.json OpenCode provider model npm ai-sdk',
      sections: [
        s('generated', '先使用控制台配置', 'Use the generated setup first', p('在 API 密钥页面选择“使用密钥 → OpenCode”，复制生成的 opencode.json，保存到页面提示的位置。不同分组可能使用不同适配器和路径，生成的配置优先于下面的通用示例。', 'Select Use Key → OpenCode in API Keys. Save the generated opencode.json at the path shown. Groups can require different adapters or routes; the generated setup takes precedence over this generic example.'), keys),
        s('custom', '手动配置 OpenAI 兼容接口', 'Add an OpenAI-compatible provider', p('此示例使用 Chat Completions 兼容适配器。先确认该分组支持此协议，将两处 <model-id> 替换为相同的实际 ID。在项目根目录使用 opencode.json，或按 OpenCode 文档放入用户配置目录。', 'This example uses a Chat Completions-compatible adapter. Confirm group support and replace both <model-id> values with the same real ID. Put opencode.json in the project root or use the documented user config location.'), code('opencode.json', examples.opencode), code(terminal, `${examples.key}\nopencode`)),
        s('selection', '选择供应商中的模型', 'Select the provider model', p('在模型选择器选择 zipkiwi/<model-id> 对应项。如果报 model not found，核对 provider 标识、模型键和实际请求 ID；不要只修改显示名称。', 'Select the model under the zipkiwi provider. For model-not-found errors, check the provider ID, model key, and request ID rather than changing only a display label.')), verification,
      ], sources: [source('OpenCode providers', 'https://opencode.ai/docs/providers/'), source('OpenCode config', 'https://opencode.ai/docs/config/')],
    },
    {
      id: 'vscode', group: 'agents', title: l('VS Code 插件', 'VS Code extensions'),
      description: l('在编辑器中使用 Codex、Claude Code 或兼容扩展，注意本地与远程环境。', 'Use Codex, Claude Code, or compatible extensions, with the correct local or remote environment.'), keywords: 'VSCode VS Code IDE 扩展 插件 WSL SSH remote Codex Claude',
      sections: [
        s('install', '安装官方扩展', 'Install the official extension', links([
          ['Codex 扩展文档', 'Codex IDE documentation', 'https://developers.openai.com/codex/ide/'],
          ['Claude Code 扩展文档', 'Claude Code VS Code documentation', 'https://code.claude.com/docs/en/vs-code'],
          ['VS Code 官方下载', 'Download VS Code', 'https://code.visualstudio.com/download'],
        ]), p('在扩展市场核对发布者身份。只安装与你使用的工具对应的扩展，先按它的命令行或供应商教程配置，再重载编辑器窗口。', 'Verify the publisher in the extension marketplace. Install the extension for your chosen tool, follow its provider or CLI setup, and reload the editor window.')),
        s('remote', '配置应写到实际运行的位置', 'Configure the environment that runs the extension', list([
          ['普通本地窗口：检查本机用户配置和环境变量。', 'Local window: check the local user configuration and environment.'],
          ['WSL、SSH 或 Dev Container：检查扩展运行在本地还是远端，并在相应环境内配置。', 'WSL, SSH, or Dev Container: identify where the extension runs and configure that environment.'],
          ['终端能用但插件不能用：完整退出编辑器后重开，确认启动进程能读取密钥与供应商配置。', 'CLI works but extension fails: fully restart the editor and check the environment inherited by its process.'],
        ], false)),
        s('other', '其他支持自定义供应商的扩展', 'Other extensions with custom providers', p(`若扩展明确提供自定义 OpenAI 兼容接口，可填写 ${api}、API Key 与模型 ID；若只接受官方账号登录，则先查看该扩展文档是否开放自定义端点。`, `For an extension with an explicit custom OpenAI-compatible option, use ${api}, your API key, and model ID. For account-login-only extensions, first check whether custom endpoints are supported.`), links([['Codex 配置教程', 'Codex setup', '/tutorials?guide=codex'], ['Claude Code 配置教程', 'Claude Code setup', '/tutorials?guide=claude-code']])), verification,
      ], sources: [source('Codex IDE', 'https://developers.openai.com/codex/ide/'), source('Claude Code VS Code', 'https://code.claude.com/docs/en/vs-code')],
    },
    {
      id: 'workbuddy', group: 'apps', title: 'WorkBuddy',
      description: l('在模型设置中添加迅奇，自定义 API 地址并选择模型。', 'Add Zipkiwi in model settings with a custom API address and model.'), keywords: 'WorkBuddy CodeBuddy 腾讯 自定义模型 办公',
      sections: [
        s('add', '添加自定义模型', 'Add a custom model', list([
          ['从官方页面安装并打开 WorkBuddy，进入设置中的模型配置。', 'Install and open WorkBuddy from its official page and open model settings.'],
          ['新增模型，选择自定义 API / Custom，名称填写迅奇（ZipKiwi）。', 'Add a model using Custom API / Custom and name the provider 迅奇（ZipKiwi）.'],
          [`按标准 OpenAI 兼容方式填写 ${api}、本站 API Key 和准确模型 ID。`, `For standard OpenAI compatibility, enter ${api}, your Zipkiwi key, and the exact model ID.`],
          ['保存后在对话模型选择器中选中这个自定义模型，再新建任务测试。', 'Save, select the custom model in the conversation picker, and test in a new task.'],
        ])),
        s('url', '自定义协议开关', 'The custom-protocol switch', p(`WorkBuddy 默认使用标准 /chat/completions 路径并处理地址补全。若开启“自定义协议”，工具会直接使用填写的完整地址；此时应核对最终请求是否为 ${api}/chat/completions。不要同时手动和自动追加路径。`, `WorkBuddy normally handles the standard /chat/completions suffix. Its custom-protocol option uses the supplied URL directly; then check that the full endpoint is ${api}/chat/completions. Avoid duplicating an automatic suffix.`)),
        s('capabilities', '能力与用量', 'Capabilities and usage', p('工具调用、图片输入和推理选项应按实际模型能力设置。模型名称保存成功不代表请求成功；费用和限制以迅奇用量记录为准。', 'Set tools, image input, and reasoning options to match the model’s capabilities. Saving a model name does not verify requests; inspect Zipkiwi usage and limits.')), verification,
      ], sources: [source('WorkBuddy', 'https://www.codebuddy.cn/work/'), source('WorkBuddy model configuration', 'https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Model')],
    },
    {
      id: 'zcode', group: 'apps', title: 'ZCode',
      description: l('新增自定义供应商，分别配置 OpenAI 或 Anthropic 兼容地址。', 'Add a custom provider using the appropriate OpenAI or Anthropic-compatible URL.'), keywords: 'ZCode Z.ai 自定义供应商 model settings',
      sections: [
        s('provider', '在模型设置添加供应商', 'Add a provider in model settings', list([
          ['打开对话中的模型选择器，进入“管理模型 / 模型设置”。', 'Open the conversation’s model picker and go to Manage models / Model settings.'],
          ['点击添加供应商，自定义名称填写迅奇（ZipKiwi）。', 'Add a provider and name it 迅奇（ZipKiwi）.'],
          [`选择与 Key 分组匹配的协议：OpenAI 兼容填写 ${api}，Anthropic 兼容填写 ${root}。`, `Match the key group: use ${api} for OpenAI compatibility or ${root} for Anthropic compatibility.`],
          ['填写本站 API Key，添加模型并复制实际模型 ID，然后保存、启用。', 'Enter the Zipkiwi API key, add the exact model ID, save, and enable it.'],
        ])),
        s('select', '选择新供应商并发起任务', 'Select the provider and start a task', p('在会话中选择迅奇下的模型。使用本站 Key 时，选择自定义供应商入口；其他平台的官方账号、编程套餐和固定地址不代表已切到迅奇。', 'Choose the model under Zipkiwi in your conversation. Use the custom provider for a Zipkiwi key; another platform’s account, coding plan, or preset endpoint does not select Zipkiwi.')), verification,
      ], sources: [source('ZCode', 'https://zcode.z.ai/'), source('ZCode model configuration', 'https://zcode.z.ai/cn/docs/configuration')],
    },
    {
      id: 'hermes', group: 'apps', title: 'Hermes Agent',
      description: l('为 Hermes 选择自定义兼容端点，同时检查辅助模型。', 'Choose a custom-compatible endpoint for Hermes and review auxiliary models.'), keywords: 'Hermes Nous Research base_url auxiliary 模型 agent',
      sections: [
        s('install', '使用上游项目的安装说明', 'Use the upstream installation guide', p('先按 Nous Research 上游项目说明安装。社区桌面封装的目录与界面可能不同，操作时以当前安装版本的说明为准。', 'Install using the Nous Research upstream guide. Community desktop wrappers can use different interfaces and directories; follow the documentation for the version you installed.'), links([['Hermes Agent 上游项目', 'Hermes Agent upstream project', 'https://github.com/NousResearch/hermes-agent']])),
        s('configure', '选择自定义供应商', 'Choose a custom provider', code('Terminal', examples.hermes), list([
          ['在交互配置中选择自定义 / OpenAI-compatible 供应商。', 'Choose a custom / OpenAI-compatible provider in the interactive model setup.'],
          [`填写 ${api} 作为基础地址，输入独立的迅奇 Key。`, `Use ${api} as the base URL and enter a dedicated Zipkiwi key.`],
          ['模型 ID 从当前 Key 可见模型列表复制，不要保留不可用的默认模型。', 'Copy the model ID from the models available to the key instead of keeping an unavailable default.'],
          ['检查辅助模型、摘要或视觉任务配置，避免部分调用继续走旧供应商。', 'Review auxiliary, summarization, and vision model settings so secondary calls use the intended provider.'],
        ])), verification,
      ], sources: [source('Hermes Agent', 'https://github.com/NousResearch/hermes-agent'), source('Hermes providers', 'https://hermes-agent.nousresearch.com/docs/integrations/providers/')],
    },
    {
      id: 'chat-clients', group: 'apps', title: l('Cherry Studio 与其他客户端', 'Cherry Studio & other clients'),
      description: l('用标准兼容字段接入桌面聊天客户端。', 'Connect desktop chat clients using standard compatible-provider settings.'), keywords: 'Cherry Studio Chatbox Cline Roo Code OpenAI compatible 客户端 聊天',
      sections: [
        s('fields', '使用自定义供应商入口', 'Use a custom provider', p('适用于明确支持自定义 OpenAI 兼容服务的客户端。界面名称随版本变化，通常在“设置 → 模型服务 / Provider”中添加自定义服务。', 'Use a client that explicitly supports custom OpenAI-compatible services. Labels vary by version; look for a custom provider under model or provider settings.'), table([['字段', 'Field'], ['填写内容', 'Value']], [
          [['供应商名称', 'Provider name'], ['迅奇（ZipKiwi）', '迅奇（ZipKiwi）']],
          [['协议', 'Protocol'], ['与 Key 分组匹配的 OpenAI 兼容协议', 'The OpenAI-compatible protocol supported by the key group']],
          [['API 地址 / Base URL', 'API URL / Base URL'], [api, api]],
          [['API Key', 'API key'], ['本站 API 密钥', 'Your Zipkiwi API key']],
          [['模型', 'Model'], ['复制实际模型 ID；没有拉取列表按钮时手动新增。', 'Copy the exact ID; add it manually if there is no model-list action.']],
        ])),
        s('check', '保存后选择模型', 'Select the model after saving', p('添加服务后，还要在聊天窗口选中该服务下的模型。若客户端要求“完整接口地址”，请填写对应协议的完整端点；如果提供“检测”按钮，检测成功后仍需发送真实对话。', 'After adding the service, select one of its models in the chat window. For a full-endpoint field, use the complete protocol endpoint. Send a real conversation even after a connection test succeeds.')), verification,
      ], sources: [source('Cherry Studio', 'https://github.com/CherryHQ/cherry-studio')],
    },
    {
      id: 'chatgpt', group: 'apps', title: l('ChatGPT 与 API 的区别', 'ChatGPT and API access'),
      description: l('区分账号登录、官方订阅和中转站 API Key 的使用场景。', 'Understand account sign-in, official subscriptions, and gateway API keys.'), keywords: 'ChatGPT Plus Pro 订阅 会员 登录 API 区别 Codex',
      sections: [
        s('difference', '先区分你使用的入口', 'Identify the access method', table([['使用方式', 'Access method'], ['应该查看什么', 'What to check']], [
          [['ChatGPT 官方网页 / 客户端', 'Official ChatGPT web / app'], ['按应用自身的账号登录与订阅说明操作。', 'Use the app’s account sign-in and subscription instructions.']],
          [['Codex 自定义供应商', 'Codex custom provider'], ['按 Codex 教程配置本站 API 地址与 Key。', 'Configure the Zipkiwi endpoint and key using the Codex guide.']],
          [['第三方 API 聊天客户端', 'Third-party API chat client'], ['确认支持自定义供应商，再填写地址、Key 与模型。', 'Confirm custom-provider support, then configure the URL, key, and model.']],
        ])),
        s('account', '分别查看余额和订阅', 'Check balances and subscriptions separately', p('迅奇的余额和 Key 不等于 OpenAI 官方订阅权益。网站密码、API Key 和授权回调也属于不同凭据，按字段名称填写。要验证是否经由迅奇调用，请查看本站用量记录。', 'Zipkiwi balance and API keys are separate from an official OpenAI subscription. Site passwords, API keys, and authorization callbacks are different credentials. Check Zipkiwi usage records to verify gateway requests.'), links([['接入 Codex', 'Connect Codex', '/tutorials?guide=codex'], ['配置聊天客户端', 'Configure a chat client', '/tutorials?guide=chat-clients']])),
      ], sources: [source('Codex authentication', 'https://developers.openai.com/codex/auth/')],
    },
    {
      id: 'api-models', group: 'api', title: l('查询可用模型', 'List available models'), shell: true,
      description: l('使用目标 Key 获取模型目录，确认精确 ID 和调用权限。', 'Retrieve the model catalog with your target key and check exact IDs.'), keywords: 'GET models API 模型目录 列表',
      sections: [
        s('key', '先设置环境变量', 'Set the key environment variable', p('下面的 Key 只设置到当前终端。替换占位符后再执行，不要直接复制真实 Key 到代码仓库。', 'This sets the key for the current terminal. Replace the placeholder and keep real keys out of source control.'), code(terminal, examples.key)),
        s('request', '发送模型列表请求', 'Request the model catalog', code(terminal, examples.models), p('响应通常包含模型条目的 id。复制完整 ID 用于后续请求；列表会随密钥、分组及站点开放范围变化。', 'Model entries normally expose an id. Copy it exactly for later requests; the catalog depends on the key, group, and site availability.')),
        s('empty', '列表为空或请求失败', 'Empty list or failed request', p('401 先检查 Key，403 检查分组权限。模型出现在目录里也不保证每种功能都可用，仍需用最小请求验证目标协议。', 'For 401, check the key; for 403, check group permissions. A catalog entry does not verify every feature; test the target protocol with a minimal request.')),
      ], sources: [source('OpenAI Models API', 'https://developers.openai.com/api/reference/resources/models/methods/list')],
    },
    {
      id: 'api-responses', group: 'api', title: 'Responses API', shell: true,
      description: l('用 input 发送最小请求，也是 Codex 配置使用的协议。', 'Send a minimal input request using the protocol configured for Codex.'), keywords: 'POST responses input output_text Codex API',
      sections: [
        s('prepare', '准备密钥和模型', 'Prepare the key and model', p('确认目标分组支持 Responses，先设置环境变量，并将示例中的模型占位符替换为实际 ID。首次测试不附加工具、图片或复杂推理参数。', 'Confirm Responses support, set the environment variable, and replace the model placeholder. Start without tools, images, or advanced reasoning options.'), code(terminal, examples.key)),
        s('request', '发送最小请求', 'Send a minimal request', code(terminal, examples.responses), p('检查响应是否包含实际输出内容与用量。不同客户端会对 output 做不同展示，SDK 可通过自身的文本提取方式读取结果。', 'Check the response for output and usage. Clients render output differently; SDKs provide their own text-extraction helpers.')),
        s('next', '继续接入应用', 'Continue in your application', links([['Python 与 Node.js SDK', 'Python and Node.js SDKs', '/tutorials?guide=sdk'], ['流式输出与重试', 'Streaming and retries', '/tutorials?guide=streaming']])), verification,
      ], sources: [source('OpenAI Responses API', 'https://developers.openai.com/api/reference/resources/responses/methods/create')],
    },
    {
      id: 'api-chat', group: 'api', title: 'Chat Completions API', shell: true,
      description: l('通过 messages 数组接入兼容聊天接口和已有应用。', 'Use a messages array with compatible chat clients and existing applications.'), keywords: 'POST chat completions messages choices message content',
      sections: [
        s('prepare', '选择兼容分组', 'Choose a compatible group', p('确认 Key 分组与模型支持 Chat Completions。使用通用聊天客户端时先测试此接口，不能仅凭模型名称判断兼容性。', 'Confirm Chat Completions support for the key group and model. Test this endpoint before using a generic chat client.'), code(terminal, examples.key)),
        s('request', '发送对话消息', 'Send conversation messages', code(terminal, examples.chat), p('常见非流式结果位于 choices 中的 message.content。首次只传一条用户消息，确认成功后再增加历史消息和其他参数。', 'A typical non-streaming response contains message.content inside choices. Start with one user message before adding history and options.')),
        s('pitfalls', '不要混用两种响应结构', 'Use the correct response parser', p('Chat Completions 和 Responses 的请求字段、流式事件和返回结构不同。若 HTTP 成功但客户端没有文字，检查客户端是否在用错误的协议解析响应。', 'Chat Completions and Responses have different fields, stream events, and response shapes. A successful HTTP status with no visible text may indicate the wrong response parser.')), verification,
      ], sources: [source('OpenAI Chat Completions', 'https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create')],
    },
    {
      id: 'api-messages', group: 'api', title: 'Anthropic Messages API', shell: true,
      description: l('为支持 Messages 的应用配置版本头、密钥和必填参数。', 'Set the version header, key, and required parameters for Messages applications.'), keywords: 'Anthropic Messages x-api-key anthropic-version max_tokens',
      sections: [
        s('prepare', '检查协议和鉴权', 'Check protocol and authentication', p('先确认该 Key 分组开放 Messages 路径。直接 HTTP 请求需要 x-api-key、anthropic-version 与 JSON Content-Type，SDK 则按它的配置方式自动处理。', 'Confirm Messages access for the key group. Direct HTTP uses x-api-key, anthropic-version, and a JSON Content-Type; SDKs manage headers through their own settings.'), code(terminal, examples.key)),
        s('request', '发送最小 Messages 请求', 'Send a minimal Messages request', code(terminal, examples.messages)),
        s('format', '与 OpenAI 兼容接口的区别', 'Differences from OpenAI-compatible APIs', p('Messages 使用自己的 content 块与停止原因字段；不要套用 choices[0] 解析。需要设置系统提示时，按 Messages 文档使用顶层 system 参数，而不是直接照搬其他协议的消息。', 'Messages has its own content blocks and stop reasons. Do not parse it as choices[0]. Use the documented top-level system field for system instructions.')), verification,
      ], sources: [source('Anthropic Messages', 'https://platform.claude.com/docs/en/api/messages/create')],
    },
    {
      id: 'sdk', group: 'api', title: l('Python 与 Node.js SDK', 'Python & Node.js SDKs'), shell: true,
      description: l('用环境变量管理密钥，在服务端覆盖 SDK 的 API 地址。', 'Keep keys in environment variables and override the SDK base URL on the server.'), keywords: 'Python Node.js JavaScript SDK openai pip npm examples',
      sections: [
        s('env', '准备项目环境', 'Prepare the project environment', p('示例使用 OpenAI SDK 的 Responses 接口，先完成对应协议的最小 HTTP 请求测试。密钥在终端中设置，模型 ID 按账号实际可用值替换。', 'These examples use Responses in the OpenAI SDK. First verify that protocol with a minimal HTTP request. Set the key in the terminal and replace the model ID.'), code(terminal, examples.key)),
        s('python', 'Python', 'Python', code('Terminal', 'python -m pip install openai'), code('example.py', examples.python), code('Terminal', 'python example.py')),
        s('node', 'Node.js', 'Node.js', code('Terminal', 'npm install openai'), code('example.mjs', examples.node), code('Terminal', 'node example.mjs')),
        s('production', '放到服务端运行', 'Run on the server', p('不要把真实 Key 打包进网页、移动端或公开仓库。浏览器应用由你自己的服务端代发请求；按项目需要设置超时和有限重试，并记录脱敏后的错误信息。', 'Keep real keys out of browser bundles, mobile apps, and public repositories. Use your server to make requests, with appropriate timeouts, bounded retries, and redacted errors.')),
      ], sources: [source('OpenAI quickstart', 'https://developers.openai.com/api/docs/quickstart'), source('openai-python', 'https://github.com/openai/openai-python'), source('openai-node', 'https://github.com/openai/openai-node')],
    },
    {
      id: 'images', group: 'advanced', title: l('图片生成与编辑', 'Image generation & editing'), shell: true,
      description: l('先确认生图权限，再发送文本生图或图片编辑请求。', 'Confirm image-generation access before sending generation or editing requests.'), keywords: 'image generation edit 生图 绘图 图像 图片 generations edits b64_json',
      sections: [
        s('access', '先确认模型与计费', 'Confirm model access and billing', p('只有分组、模型与当前通道均开放生图时才能使用。图片理解模型不等于生图模型，文本 API 成功也不能验证图片生成权限。先在模型广场查看实际模型 ID、价格和参数说明。', 'Image generation requires support from the group, model, and active channel. Image understanding is a different capability, and a successful text request does not verify image access. Check model IDs, prices, and parameters in Model Plaza.'), keys),
        s('generate', '文本生成图片', 'Generate an image from text', code(terminal, examples.key), code(terminal, examples.images), p('将 <image-model-id> 替换为当前可用生图模型。先生成一张图片；size、质量与数量支持范围取决于实际模型，参数报错时按模型说明缩减字段。', 'Replace <image-model-id> with an available image model and start with one image. Size, quality, and count depend on that model; adjust optional fields to its supported parameters.')),
        s('result', '保存生成结果', 'Save the result', p('检查 data 中的图片字段。返回 b64_json 时先 Base64 解码保存为图片；返回 URL 时及时下载。不要只看到 HTTP 200 就判定生成完成，还要确认图片内容确实可读取。', 'Inspect the image fields in data. Decode b64_json into a file or promptly download a returned URL. Verify that the resulting image is readable.')),
        s('edit', '编辑已有图片', 'Edit an existing image', p(`支持图片编辑的通道使用 ${api}/images/edits，并按模型要求上传图片与提示词，通常为 multipart/form-data。让上传库生成 multipart 边界，不要手动固定为 application/json。mask、多图、透明背景等能力逐项按模型说明确认。`, `Image-editing channels use ${api}/images/edits with the image and prompt, usually as multipart/form-data. Let the upload library create the multipart boundary rather than fixing Content-Type to application/json. Check masks, multiple images, and transparency support individually.`), code(shell === 'powershell' ? 'PowerShell · curl.exe' : 'Bash / zsh · curl', examples.imagesEdit), note('替换模型 ID 与本机图片路径后再执行。Windows 示例明确使用 curl.exe，避免旧版 PowerShell 的 curl 别名产生不同参数行为。', 'Replace the model ID and local image path first. The Windows example explicitly uses curl.exe to avoid the curl alias in older PowerShell versions.')),
      ], sources: [source('OpenAI image generation', 'https://developers.openai.com/api/docs/guides/image-generation')],
    },
    {
      id: 'streaming', group: 'advanced', title: l('流式输出与重试', 'Streaming & retries'), shell: true,
      description: l('先跑通非流式请求，再逐步启用流式、工具和自动任务。', 'Verify a non-streaming request before adding streaming, tools, and automated tasks.'), keywords: 'stream SSE timeout retry tools 流式 断流 超时 并发 重试 tool call',
      sections: [
        s('stream', '从最小流式请求开始', 'Start with a minimal stream', p('Bash 示例使用 curl -N 关闭输出缓冲。PowerShell 的 Invoke-RestMethod 示例用于查看原始结果，不代表终端会逐 Token 展示；开发实时界面时请使用 SDK 的流式迭代方式。', 'The Bash example uses curl -N to disable output buffering. Invoke-RestMethod in PowerShell is a response check, not a token-by-token UI. Use your SDK’s stream iterator for real-time applications.'), code(terminal, examples.key), code(terminal, examples.stream)),
        s('timeout', '排查断流或超时', 'Diagnose stream interruptions', list([
          ['先测试同一 Key、同一模型的非流式请求。', 'Test a non-streaming request with the same key and model.'],
          ['非流式成功时，检查客户端 SSE 解析、代理缓冲和长连接超时设置。', 'If it succeeds, inspect SSE parsing, proxy buffering, and connection timeouts.'],
          ['记录请求时间与 Request ID，区分客户端中断和服务端返回错误。', 'Record the time and request ID to distinguish a client disconnect from a server error.'],
        ])),
        s('retries', '设置有限重试', 'Use bounded retries', p('401、403 和格式错误通常需要先改配置；429 或暂时性服务错误可按返回提示延迟后重试。对自动任务设置最大重试次数与退避，避免立即循环请求。中断后重新发送整项任务可能再次计费。', 'Fix authentication, access, and format errors before retrying. For 429 or transient errors, respect the response guidance and use bounded backoff. Resending an interrupted task may incur another charge.')),
        s('tools', '逐项启用 Agent 能力', 'Enable agent capabilities incrementally', p('工具调用、视觉、推理和超长上下文需要模型与通道共同支持。基础对话成功后，一次只增加一种能力，便于定位参数和格式问题。', 'Tools, vision, reasoning, and long context require both model and channel support. Add one feature at a time after basic conversation works.')),
      ], sources: [source('OpenAI streaming', 'https://developers.openai.com/api/docs/guides/streaming-responses')],
    },
    {
      id: 'errors', group: 'help', title: l('常见报错排查', 'Troubleshooting'),
      description: l('按状态码和现象定位问题，少走反复重装的弯路。', 'Find the cause by status code and symptom before reinstalling tools.'), keywords: '401 403 404 400 422 429 500 502 503 504 超时 报错 失败 无响应 model not found',
      sections: [
        s('status', '先看状态码和错误正文', 'Read the status and error body', table([['现象', 'Symptom'], ['优先检查', 'Check first']], [
          [['401', '401'], ['Key 是否完整、启用且未过期；是否误用了网站密码。', 'Check for a complete, active, unexpired key rather than a site password.']],
          [['403', '403'], ['账号、密钥、IP 和分组是否允许该模型或协议。', 'Check account, key, IP, group, model, and protocol access.']],
          [['404 / model not found', '404 / model not found'], ['检查重复 /v1、完整端点和模型 ID；以错误正文区分路由与模型。', 'Check duplicate /v1, full endpoints, and model IDs. Read the error body to distinguish routing from model errors.']],
          [['400 / 422', '400 / 422'], ['核对协议、JSON 和必填字段；先删除可选参数，用最小请求测试。', 'Check protocol, JSON, and required fields. Remove optional settings and test a minimal request.']],
          [['429', '429'], ['查看错误正文，再检查余额、周期额度、限速、并发与重试。', 'Read the error body and check balance, periodic limits, rate limits, concurrency, and retries.']],
          [['5xx / 超时', '5xx / timeout'], ['记录时间与 Request ID；短暂等待后有限重试，持续发生时提交工单。', 'Record time and request ID. Use bounded retries for transient failures, and contact support if they persist.']],
        ])),
        s('no-usage', '客户端有回复，本站没有用量', 'The client replies but Zipkiwi shows no usage', p('核对时间范围和密钥筛选。如果仍没有记录，检查当前选中的供应商、旧进程、官方登录状态和其他配置覆盖。完整退出客户端后新建会话重试。', 'Check the usage time range and key filter. Then review the selected provider, old processes, official login state, and configuration overrides. Fully quit and restart the client with a new session.')),
        s('isolate', '用最小请求定位问题', 'Isolate the problem with a minimal request', list([
          ['先查询 /v1/models，确认 Key 能正常鉴权。', 'Query /v1/models to check authentication.'],
          ['使用该 Key 的实际模型 ID，发送对应协议的短文本请求。', 'Send a short prompt using the correct protocol and an actual model ID for the key.'],
          ['HTTP 成功、客户端失败：检查客户端协议、配置加载位置与响应解析。', 'HTTP succeeds but client fails: inspect client protocol, config location, and parsing.'],
          ['HTTP 也失败：保留脱敏错误正文、请求时间和模型 ID，继续按状态码排查。', 'HTTP also fails: keep the redacted error body, time, and model ID and follow the status-code checks.'],
        ]), links([['查询模型目录', 'List models', '/tutorials?guide=api-models'], ['核对接口地址', 'Check endpoints', '/tutorials?guide=endpoints'], ['提交问题', 'Contact support', '/tutorials?guide=support']])),
      ],
    },
    {
      id: 'support', group: 'help', title: l('工单与联系支持', 'Tickets & support'),
      description: l('准备必要信息，通过工单或站点联系方式获取帮助。', 'Prepare the right details and contact support using tickets or the site’s contact information.'), keywords: '工单 联系我们 支持 反馈 support ticket 联系方式 群号',
      sections: [
        s('ticket', '普通用户提交工单', 'Submit a user ticket', list([
          ['登录普通用户账号，在控制台打开“工单”页面。', 'Sign in to a regular user account and open Support Tickets in the console.'],
          ['站点开启工单功能后，可创建工单并填写问题类型、标题和具体描述。', 'When tickets are enabled, create a ticket with its category, title, and description.'],
          ['提交后在工单详情跟进回复，补充信息时继续使用同一个工单。', 'Follow replies in the ticket detail page and keep follow-up information in the same ticket.'],
        ]), links([['打开工单页面', 'Open Support Tickets', '/support-tickets']]), note('如果看不到工单菜单，先检查账号角色和站点是否开启功能；管理员使用的工单管理入口与普通用户不同。也可以点击顶部“联系我们”，查看本站已设置的联系方式。', 'If the menu is missing, check the account role and whether tickets are enabled. Administrators use a different management entry. The top Contact Us menu also shows the site’s configured contact details.')),
        s('details', '这些信息能加快处理', 'Include these details', list([
          ['客户端名称、版本、操作系统及实际运行环境。', 'Client name and version, operating system, and runtime environment.'],
          ['发生时间及所在时区、模型 ID、Key 名称或脱敏标识。', 'Error time and time zone, model ID, and key name or redacted identifier.'],
          ['HTTP 状态码、错误正文、Request ID，以及可重复的最小操作步骤。', 'HTTP status, error body, request ID, and minimal reproduction steps.'],
          ['脱敏截图：遮盖完整 Key、密码、验证码、授权回调与个人敏感信息。', 'Redacted screenshots without complete keys, passwords, verification codes, authorization callbacks, or private data.'],
        ], false)),
      ],
    },
  ]
}

export function tutorialSearchText(article: TutorialArticle): string {
  return [article.title, article.description, article.keywords, ...article.sections.flatMap(section => [section.title, ...section.blocks.flatMap(block => {
    if (block.type === 'paragraph' || block.type === 'note') return [block.text]
    if (block.type === 'list') return block.items
    if (block.type === 'table') return [...block.headers, ...block.rows.flat()]
    if (block.type === 'links') return block.items.map(item => item.label)
    return [block.label, block.code]
  })])].join(' ').toLocaleLowerCase()
}

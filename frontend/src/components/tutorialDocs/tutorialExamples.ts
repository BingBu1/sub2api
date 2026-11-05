import { sanitizeUrl } from '@/utils/url'

export type TutorialShell = 'powershell' | 'bash'

export function tutorialEndpoints(configured: string, origin: string) {
  const url = new URL(sanitizeUrl(configured) || origin)
  url.search = ''
  url.hash = ''
  url.username = ''
  url.password = ''
  const root = url.toString().replace(/\/+$/, '').replace(/\/v1$/i, '')
  return { root, api: `${root}/v1` }
}

const bashQuote = (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`
const psQuote = (value: string) => `'${value.replace(/'/g, "''")}'`

export function tutorialExamples(root: string, api: string, shell: TutorialShell) {
  const powershell = shell === 'powershell'
  const key = powershell
    ? '$env:ZIPKIWI_API_KEY="<your-api-key>"'
    : 'export ZIPKIWI_API_KEY="<your-api-key>"'

  function request(endpoint: string, body?: object, anthropic = false) {
    if (powershell) {
      const headers = anthropic
        ? '$headers = @{ "x-api-key" = $env:ZIPKIWI_API_KEY; "anthropic-version" = "2023-06-01"; "Content-Type" = "application/json" }'
        : '$headers = @{ Authorization = "Bearer $env:ZIPKIWI_API_KEY"; "Content-Type" = "application/json" }'
      return `${headers}\n${body ? `$body = @'\n${JSON.stringify(body, null, 2)}\n'@\n` : ''}Invoke-RestMethod -Uri ${psQuote(`${api}/${endpoint}`)} -Method ${body ? 'Post' : 'Get'} -Headers $headers${body ? ' -Body ([System.Text.Encoding]::UTF8.GetBytes($body))' : ''}`
    }
    const headers = anthropic
      ? '-H "x-api-key: $ZIPKIWI_API_KEY" \\\n  -H "anthropic-version: 2023-06-01"'
      : '-H "Authorization: Bearer $ZIPKIWI_API_KEY"'
    return `curl${body && 'stream' in body && body.stream ? ' -N' : ''} ${bashQuote(`${api}/${endpoint}`)} \\\n  ${headers}${body ? ` \\\n  -H "Content-Type: application/json" \\\n  -d ${bashQuote(JSON.stringify(body, null, 2))}` : ''}`
  }

  return {
    key,
    codex: `model = "<model-id>"\nmodel_provider = "zipkiwi"\n\n[model_providers.zipkiwi]\nname = "迅奇（ZipKiwi）"\nbase_url = ${JSON.stringify(api)}\nenv_key = "ZIPKIWI_API_KEY"\nwire_api = "responses"\nrequires_openai_auth = false`,
    claude: powershell
      ? `${key}\n$env:ANTHROPIC_BASE_URL=${psQuote(root)}\n$env:ANTHROPIC_AUTH_TOKEN=$env:ZIPKIWI_API_KEY\n$env:ANTHROPIC_MODEL="<model-id>"\nclaude`
      : `${key}\nexport ANTHROPIC_BASE_URL=${bashQuote(root)}\nexport ANTHROPIC_AUTH_TOKEN="$ZIPKIWI_API_KEY"\nexport ANTHROPIC_MODEL="<model-id>"\nclaude`,
    opencode: JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      provider: { zipkiwi: { npm: '@ai-sdk/openai-compatible', name: '迅奇（ZipKiwi）', options: { baseURL: api, apiKey: '{env:ZIPKIWI_API_KEY}' }, models: { '<model-id>': { name: '<model-id>' } } } },
      model: 'zipkiwi/<model-id>',
    }, null, 2),
    models: request('models'),
    responses: request('responses', { model: '<model-id>', input: 'Reply with: Connected' }),
    chat: request('chat/completions', { model: '<model-id>', messages: [{ role: 'user', content: 'Reply with: Connected' }] }),
    messages: request('messages', { model: '<model-id>', max_tokens: 128, messages: [{ role: 'user', content: 'Reply with: Connected' }] }, true),
    stream: request('chat/completions', { model: '<model-id>', stream: true, messages: [{ role: 'user', content: 'Say hello in one sentence' }] }),
    images: request('images/generations', { model: '<image-model-id>', prompt: 'A white ceramic cup on a blue table', n: 1, size: '1024x1024' }),
    imagesEdit: powershell
      ? `curl.exe ${psQuote(`${api}/images/edits`)} -H "Authorization: Bearer $env:ZIPKIWI_API_KEY" -F "model=<image-model-id>" -F "prompt=Make the background blue" -F "image=@<path-to-image.png>"`
      : `curl ${bashQuote(`${api}/images/edits`)} -H "Authorization: Bearer $ZIPKIWI_API_KEY" -F "model=<image-model-id>" -F "prompt=Make the background blue" -F "image=@<path-to-image.png>"`,
    python: `import os\nfrom openai import OpenAI\n\nclient = OpenAI(\n    api_key=os.environ["ZIPKIWI_API_KEY"],\n    base_url=${JSON.stringify(api)},\n)\nresponse = client.responses.create(\n    model="<model-id>",\n    input="Reply with: Connected",\n)\nprint(response.output_text)`,
    node: `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  apiKey: process.env.ZIPKIWI_API_KEY,\n  baseURL: ${JSON.stringify(api)},\n});\nconst response = await client.responses.create({\n  model: "<model-id>",\n  input: "Reply with: Connected",\n});\nconsole.log(response.output_text);`,
    hermes: `hermes model`,
  }
}

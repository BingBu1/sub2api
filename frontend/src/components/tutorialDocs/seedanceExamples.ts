import type { TutorialShell } from './tutorialExamples'

const bashQuote = (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`
const psQuote = (value: string) => `'${value.replace(/'/g, "''")}'`

export function seedanceExamples(root: string, shell: TutorialShell) {
  const ark = `${root}/api/v3/contents/generations/tasks`
  const videos = `${root}/v1/videos`
  const powershell = shell === 'powershell'
  const body = {
    model: 'doubao-seedance-2-0-260128',
    content: [{ type: 'text', text: '清晨的海边，一只金毛犬奔向浪花，逆光，镜头平稳跟随。' }],
    duration: 5,
    resolution: '720p',
    ratio: '16:9',
    watermark: false,
  }
  function create(url: string, payload: object) {
    const json = JSON.stringify(payload, null, 2)
    return powershell
      ? `$headers = @{ Authorization = "Bearer $env:ZIPKIWI_API_KEY"; "Content-Type" = "application/json" }\n$body = @'\n${json}\n'@\nInvoke-RestMethod -Uri ${psQuote(url)} -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($body))`
      : `curl ${bashQuote(url)} \\\n  -H "Authorization: Bearer $ZIPKIWI_API_KEY" \\\n  -H 'Content-Type: application/json' \\\n  -d ${bashQuote(json)}`
  }
  function query(url: string) {
    return powershell
      ? `$taskId = '<task-id>'\nInvoke-RestMethod -Uri (${psQuote(`${url}/`)} + [uri]::EscapeDataString($taskId)) -Headers @{ Authorization = "Bearer $env:ZIPKIWI_API_KEY" }`
      : `TASK_ID='<task-id>'\ncurl ${bashQuote(`${url}/`)}"$TASK_ID" -H "Authorization: Bearer $ZIPKIWI_API_KEY"`
  }
  return {
    create: create(ark, body),
    query: query(ark),
    image: JSON.stringify({ ...body, content: [body.content[0], { type: 'image_url', image_url: { url: 'https://media.example.com/first-frame.jpg' }, role: 'first_frame' }] }, null, 2),
    reference: JSON.stringify({ ...body, content: [body.content[0], { type: 'video_url', video_url: { url: 'https://media.example.com/reference.mp4' }, role: 'reference_video' }], omni_reference_task_type: 'reference' }, null, 2),
    videosCreate: create(videos, {
      model: body.model, prompt: body.content[0]!.text, seconds: 5,
      metadata: { resolution: '720p', ratio: '16:9' },
    }),
    videosQuery: query(videos),
    download: powershell
      ? `$taskId = '<task-id>'\nInvoke-WebRequest -Uri (${psQuote(`${videos}/`)} + [uri]::EscapeDataString($taskId) + '/content') -Headers @{ Authorization = "Bearer $env:ZIPKIWI_API_KEY" } -OutFile 'video.mp4'`
      : `TASK_ID='<task-id>'\ncurl --fail ${bashQuote(`${videos}/`)}"$TASK_ID/content" -H "Authorization: Bearer $ZIPKIWI_API_KEY" -o video.mp4`,
    python: `import os
import time
import requests

base = ${JSON.stringify(ark)}
headers = {"Authorization": "Bearer " + os.environ["ZIPKIWI_API_KEY"]}
payload = ${JSON.stringify({ ...body, watermark: undefined }, null, 2)}

# Submit once. If this request times out, do not automatically submit again.
response = requests.post(base, headers=headers, json=payload, timeout=60)
response.raise_for_status()
task_id = response.json()["id"]
print("Save this task ID:", task_id, flush=True)

# Poll the same task. On timeout, retain task_id and resume GET requests later.
for _ in range(120):
    time.sleep(10)
    response = requests.get(base + "/" + task_id, headers=headers, timeout=60)
    if response.status_code == 429:
        time.sleep(20)
        continue
    if response.status_code == 503:
        error = response.json().get("error", {})
        if error.get("type") == "usage_pending" or error.get("code") == "usage_pending":
            continue
    response.raise_for_status()
    task = response.json()
    if task["status"] == "succeeded":
        print(task["content"]["video_url"])
        print("Actual tokens:", task.get("usage", {}).get("completion_tokens"))
        break
    if task["status"] in ("failed", "cancelled", "expired"):
        raise RuntimeError(task.get("error", task))
else:
    raise TimeoutError("Resume querying task " + task_id + "; do not create a replacement automatically")`,
    javascript: `// Run on your server (Node.js 18+). Keep the key out of browser code.
const base = ${JSON.stringify(ark)};
const headers = {
  Authorization: "Bearer " + process.env.ZIPKIWI_API_KEY,
  "Content-Type": "application/json",
};
const response = await fetch(base, {
  method: "POST", headers,
  body: JSON.stringify(${JSON.stringify(body, null, 2)}),
  signal: AbortSignal.timeout(60000),
});
if (!response.ok) throw new Error(await response.text());
const { id } = await response.json();
console.log("Save this task ID:", id);
// Later, repeat this GET every 10 seconds until succeeded or failed.
const result = await fetch(base + "/" + encodeURIComponent(id), {
  headers, signal: AbortSignal.timeout(60000),
});
if (!result.ok) throw new Error(await result.text());
console.log(await result.json());`,
  }
}

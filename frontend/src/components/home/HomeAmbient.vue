<template>
  <div class="home-ambient" :class="{ 'is-ready': ready }" aria-hidden="true">
    <div class="ambient-fallback"></div>
    <canvas ref="canvas" class="ambient-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ paused: boolean; dark: boolean }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
let renderFrame: (() => void) | undefined
let dispose: (() => void) | undefined
let targetX = 0
let targetY = 0

function followPointer(event: PointerEvent) {
  if (props.paused || event.pointerType !== 'mouse') return
  targetX = (event.clientX / window.innerWidth - 0.5) * 2
  targetY = (event.clientY / window.innerHeight - 0.5) * 2
}

function resetPointer() {
  targetX = 0
  targetY = 0
}

defineExpose({ followPointer, resetPointer })

// Translucent folds frame the copy; the center remains a quiet reading area.
const vertexSource = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`
const fragmentSource = `
precision highp float;
uniform vec2 resolution;
uniform vec2 pointer;
uniform float time;
uniform float dark;

float gaussian(float x, float width) { return exp(-x * x / width); }
void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
  uv += pointer * vec2(0.025, -0.018);
  float drift = time * 0.55;
  vec3 paper = mix(vec3(0.965, 0.975, 0.974), vec3(0.045, 0.070, 0.068), dark);
  vec3 color = paper;

  // Two opposing sweeps with asymmetrical curvature and a soft optical edge.
  float curveA = uv.y + 0.80 + 0.50 * uv.x - 0.12 * uv.x * uv.x - 0.24 * sin(uv.x * 1.3 + drift);
  float curveB = uv.y - 0.83 + 0.16 * uv.x + 0.17 * uv.x * uv.x + 0.20 * sin(uv.x * 1.4 - drift * 0.85);
  float edgeA = gaussian(curveA, 0.015);
  float edgeB = gaussian(curveB, 0.020);
  float veilA = gaussian(curveA + 0.21, 0.14);
  float veilB = gaussian(curveB - 0.23, 0.18);
  float sideA = 1.0 - smoothstep(-1.5, 1.1, uv.x);
  float sideB = smoothstep(-0.9, 1.5, uv.x);
  float clearCenter = 1.0 - 0.84 * exp(-dot(uv * vec2(1.05, 1.75), uv * vec2(1.05, 1.75)));

  vec3 sage = mix(vec3(0.63, 0.80, 0.75), vec3(0.12, 0.32, 0.28), dark);
  vec3 ice = mix(vec3(0.72, 0.83, 0.89), vec3(0.12, 0.23, 0.32), dark);
  vec3 warm = mix(vec3(0.90, 0.83, 0.72), vec3(0.27, 0.26, 0.18), dark);
  vec3 lowerColor = mix(ice, sage, 0.5 + 0.5 * sin(uv.x * 1.4 + drift * 0.5));
  vec3 upperColor = mix(ice, warm, smoothstep(0.2, 1.8, uv.x));
  float flowingLight = 0.82 + 0.18 * sin(uv.x * 2.0 - drift * 1.3);
  color = mix(color, lowerColor, (veilA * 0.70 + edgeA * 0.34) * sideA * clearCenter * flowingLight);
  color = mix(color, upperColor, (veilB * 0.54 + edgeB * 0.34) * sideB * clearCenter * (1.64 - flowingLight));

  // A narrow silver crest and its diffused shadow give each veil depth.
  float crest = gaussian(curveA - 0.055, 0.00065) * sideA + gaussian(curveB + 0.055, 0.0009) * sideB;
  color = mix(color, mix(vec3(1.0), vec3(0.38, 0.52, 0.47), dark), crest * (0.42 + 0.16 * flowingLight) * clearCenter);
  float shadow = gaussian(curveA - 0.12, 0.006) * sideA + gaussian(curveB + 0.14, 0.008) * sideB;
  color -= shadow * clearCenter * mix(0.030, 0.008, dark);

  // Very subtle dithering prevents gradient banding without a texture request.
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  color += grain * 0.002;
  gl_FragColor = vec4(color, 1.0);
}
`

onMounted(() => {
  const element = canvas.value
  if (!element) return
  const gl = element.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' })
  if (!gl) return

  const shaders: WebGLShader[] = []
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) return null
    shaders.push(shader)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
  }
  const vertex = compile(gl.VERTEX_SHADER, vertexSource)
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()
  if (!vertex || !fragment || !program) {
    shaders.forEach(shader => gl.deleteShader(shader))
    if (program) gl.deleteProgram(program)
    return
  }
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  shaders.forEach(shader => gl.deleteShader(shader))
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return
  }
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
  gl.useProgram(program)
  const position = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  const uniforms = {
    resolution: gl.getUniformLocation(program, 'resolution'),
    pointer: gl.getUniformLocation(program, 'pointer'),
    time: gl.getUniformLocation(program, 'time'),
    dark: gl.getUniformLocation(program, 'dark'),
  }
  let frame = 0
  let previousTime = 0
  let elapsed = 8
  let pointerX = 0
  let pointerY = 0
  let visible = true
  let lost = false

  function draw() {
    if (lost) return
    gl!.uniform2f(uniforms.resolution, element!.width, element!.height)
    gl!.uniform2f(uniforms.pointer, pointerX, pointerY)
    gl!.uniform1f(uniforms.time, elapsed)
    gl!.uniform1f(uniforms.dark, props.dark ? 1 : 0)
    gl!.drawArrays(gl!.TRIANGLES, 0, 6)
    ready.value = true
  }
  function tick(now: number) {
    frame = 0
    if (props.paused || document.hidden || !visible || lost) return
    // Limit the background to 30 fps and avoid jumps after a hidden tab resumes.
    if (now - previousTime >= 32) {
      elapsed += Math.min((now - previousTime) / 1000, 0.05)
      previousTime = now
      pointerX += (targetX - pointerX) * 0.035
      pointerY += (targetY - pointerY) * 0.035
      draw()
    }
    frame = requestAnimationFrame(tick)
  }
  function refresh() {
    cancelAnimationFrame(frame)
    frame = 0
    draw()
    previousTime = performance.now()
    if (!props.paused && !document.hidden && visible && !lost) frame = requestAnimationFrame(tick)
  }
  function resize() {
    const rect = element!.getBoundingClientRect()
    const scale = Math.min(window.devicePixelRatio || 1, 1.4, 1050 / Math.max(rect.width, rect.height, 1))
    element!.width = Math.max(1, Math.round(rect.width * scale))
    element!.height = Math.max(1, Math.round(rect.height * scale))
    gl!.viewport(0, 0, element!.width, element!.height)
    refresh()
  }
  function onContextLost(event: Event) {
    event.preventDefault()
    lost = true
    ready.value = false
    cancelAnimationFrame(frame)
  }
  const resizeObserver = new ResizeObserver(resize)
  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? false
    refresh()
  })
  resizeObserver.observe(element)
  visibilityObserver.observe(element)
  document.addEventListener('visibilitychange', refresh)
  element.addEventListener('webglcontextlost', onContextLost)
  renderFrame = refresh
  resize()
  dispose = () => {
    renderFrame = undefined
    cancelAnimationFrame(frame)
    resizeObserver.disconnect()
    visibilityObserver.disconnect()
    document.removeEventListener('visibilitychange', refresh)
    element.removeEventListener('webglcontextlost', onContextLost)
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
  }
})

watch(() => [props.paused, props.dark], () => renderFrame?.())
onBeforeUnmount(() => dispose?.())
</script>

<style scoped>
.home-ambient { position: absolute; inset: 0; pointer-events: none; }
.ambient-canvas { display: block; width: 100%; height: 100%; opacity: 0; transition: opacity 1.4s ease; }
.is-ready .ambient-canvas { opacity: 1; }
.ambient-fallback {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 0% 80%, #a6d5c94d, transparent 48%), radial-gradient(ellipse at 100% 20%, #c6d8e24d, transparent 45%);
  transition: opacity 1s;
}
.is-ready .ambient-fallback { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .ambient-canvas, .ambient-fallback { transition: none; }
}
</style>

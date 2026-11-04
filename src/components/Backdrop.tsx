import { useEffect, useRef } from 'react'
import './Backdrop.css'

const VERTEX = `#version 300 es
in vec4 a_position;
void main() { gl_Position = a_position; }
`

/**
 * Fluid background, adapted from the DeepSeek Harness product page shader
 * (domain-warped simplex noise + curl offset, self-luminance bloom, vignette).
 * Palettes switch at runtime so the same field serves both colour schemes.
 */
const FRAGMENT = `#version 300 es
precision mediump float;

uniform vec2 u_loop1, u_loop2, u_loop3, u_loop4;
uniform vec2 u_resolution;
uniform vec2 u_grainResolution;
uniform float u_dark;
uniform float u_lightCore;
uniform float u_lightHalo;
out vec4 fragColor;

const vec3 D_C1 = vec3(0.0);
const vec3 D_C2 = vec3(0.0);
const vec3 D_C3 = vec3(32.0, 74.0, 126.0) / 255.0;
const vec3 D_C4 = vec3(206.0, 200.0, 187.0) / 255.0;
const vec3 D_C5 = vec3(0.0);

const vec3 L_C1 = vec3(0.984, 0.980, 0.976);
const vec3 L_C2 = vec3(0.956, 0.965, 0.996);
const vec3 L_C3 = vec3(0.760, 0.830, 0.985);
const vec3 L_C4 = vec3(1.0);
const vec3 L_C5 = vec3(0.880, 0.910, 0.990);

const float u_scale = 1.19;
const vec2 u_offset = vec2(-1.24, -0.48);
const float u_grain = 0.005;
const vec2 u_lightPos = vec2(0.89, 0.46);
const float u_vignette = 0.38;
const float u_bloomThreshold = 0.61;
const float u_bloomRange = 0.18;
const float u_bloomStrength = 0.4;

vec3 mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289v4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289v4(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289v3(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float fbm(vec3 p) {
  float v = 0.0, amp = 0.6;
  vec3 shift = vec3(100.0);
  for (int i = 0; i < 1; i++) {
    v += amp * snoise(p);
    p = p * 2.0 + shift;
    amp *= 0.4;
  }
  return v;
}

float fluidNoise(vec2 uv) {
  float n1 = fbm(vec3(uv * 0.6, 0.0) + vec3(u_loop1.y, 0.0, u_loop1.x));
  float n2 = fbm(vec3(uv * 0.6 + 5.2, 1.3) + vec3(0.0, u_loop1.y, u_loop1.x));
  vec2 w1 = vec2(n1, n2) * 0.6;
  float n3 = fbm(vec3((uv + w1) * 0.7 + 1.7, 3.1) + vec3(u_loop2.y, 0.0, u_loop2.x));
  float n4 = fbm(vec3((uv + w1) * 0.7 + 9.2, 5.7) + vec3(0.0, u_loop2.y, u_loop2.x));
  vec2 w2 = vec2(n3, n4) * 0.5;
  return fbm(vec3((uv + w1 + w2) * 0.5, 0.0) + vec3(u_loop3.y, 0.0, u_loop3.x));
}

vec2 curlish(vec2 uv) {
  float eps = 0.02;
  float n = snoise(vec3(uv * 0.8, 0.0) + vec3(0.0, u_loop3.y, u_loop3.x));
  float nx = snoise(vec3((uv + vec2(eps, 0.0)) * 0.8, 0.0) + vec3(0.0, u_loop3.y, u_loop3.x));
  float ny = snoise(vec3((uv + vec2(0.0, eps)) * 0.8, 0.0) + vec3(0.0, u_loop3.y, u_loop3.x));
  return vec2(-(ny - n) / eps, (nx - n) / eps) * 0.003;
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 suv = vec2(uv.x * aspect, uv.y) * u_scale + u_offset;

  vec2 curl = curlish(suv);
  vec2 uvD = suv + curl * 12.0;
  float f = fluidNoise(uvD);
  float swirl = snoise(vec3(uvD * 0.8 + f * 1.5, 0.0) + vec3(u_loop4.y, 0.0, u_loop4.x)) * 0.5 + 0.5;

  vec3 c1 = mix(D_C1, L_C1, 1.0 - u_dark);
  vec3 c2 = mix(D_C2, L_C2, 1.0 - u_dark);
  vec3 c3 = mix(D_C3, L_C3, 1.0 - u_dark);
  vec3 c4 = mix(D_C4, L_C4, 1.0 - u_dark);
  vec3 c5 = mix(D_C5, L_C5, 1.0 - u_dark);

  float n = f * 0.5 + 0.5;
  vec3 col = mix(c1, c2, smoothstep(0.2, 0.5, n));
  col = mix(col, c3, smoothstep(0.35, 0.65, n + swirl * 0.25));
  col = mix(col, c4, smoothstep(0.6, 0.85, swirl) * mix(0.55, 0.3, 1.0 - u_dark));
  col = mix(col, c5, smoothstep(0.5, 0.8, n * swirl) * 0.35);

  if (u_grain > 0.0) {
    vec2 flowOffset = (uvD - suv) * u_grainResolution.y;
    vec2 gp = floor((uv * u_grainResolution + flowOffset) / 5.0);
    float gr = hash(gp) * 2.0 - 1.0;
    col += gr * u_grain;
  }

  // Self-luminance bloom: bright fluid regions become their own light spots, so
  // the glow follows the flow instead of sitting at a fixed point.
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  float bloom = smoothstep(u_bloomThreshold - u_bloomRange, u_bloomThreshold + u_bloomRange, luma);
  col += (col * 0.85 + vec3(0.15, 0.145, 0.13)) * bloom * u_bloomStrength * mix(1.0, 0.25, 1.0 - u_dark);

  // Virtual light source: a soft core plus a wide halo on the upper right.
  float ld = length((uv - u_lightPos) * vec2(aspect, 1.0));
  float core = exp(-ld * ld * 4.5);
  float halo = exp(-ld * 1.8);
  col += vec3(1.0, 0.97, 0.9) * core * u_lightCore + vec3(0.72, 0.8, 1.0) * halo * u_lightHalo;

  float vignette = 1.0 - smoothstep(0.35, 0.75, length(uv - 0.5));
  float amount = mix(u_vignette, 0.16, 1.0 - u_dark);
  col = mix(col * (1.0 - amount), col, vignette);

  fragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('shader allocation failed')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`shader compile failed: ${log ?? 'unknown'}`)
  }
  return shader
}

const TAU = Math.PI * 2
const LOOP_PERIODS = [3000, 3300, 3900, 4200]
const LOOP_SPEEDS = [0.17 * 0.06, 0.17 * 0.05, 0.17 * 0.04, 0.17 * 0.035]

type Props = {
  /** Extra class for positioning tweaks from the page that renders it. */
  className?: string
}

/**
 * Fluid shader behind a page head. Renders a single static frame when the visitor
 * prefers reduced motion, pauses offscreen or on a hidden tab, and degrades to a
 * CSS gradient when WebGL2 is unavailable.
 */
export default function Backdrop({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Test environments may not implement matchMedia or IntersectionObserver.
    const query = (value: string) =>
      typeof window.matchMedia === 'function' ? window.matchMedia(value) : null
    const reduceMotion = query('(prefers-reduced-motion: reduce)')
    const darkScheme = query('(prefers-color-scheme: dark)')

    let gl: WebGL2RenderingContext | null = null
    try {
      gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
        preserveDrawingBuffer: false,
      })
    } catch {
      gl = null
    }
    if (!gl) {
      canvas.dataset.fallback = 'true'
      return
    }

    let program: WebGLProgram
    try {
      const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX)
      const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
      program = gl.createProgram()!
      gl.attachShader(program, vertex)
      gl.attachShader(program, fragment)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`program link failed: ${gl.getProgramInfoLog(program) ?? 'unknown'}`)
      }
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      gl.useProgram(program)
    } catch {
      canvas.dataset.fallback = 'true'
      return
    }

    const buffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const resolution = gl.getUniformLocation(program, 'u_resolution')
    const grainResolution = gl.getUniformLocation(program, 'u_grainResolution')
    const dark = gl.getUniformLocation(program, 'u_dark')
    const lightCore = gl.getUniformLocation(program, 'u_lightCore')
    const lightHalo = gl.getUniformLocation(program, 'u_lightHalo')

    // The four loop layers drive the noise drift; their periods never repeat together.
    const layers = LOOP_PERIODS.map((period, index) => ({
      period,
      uniform: gl!.getUniformLocation(program, `u_loop${index + 1}`),
      elapsed: 0,
      radius: (LOOP_SPEEDS[index] * period) / TAU,
    }))

    const isTouch =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: none), (pointer: coarse)').matches
    gl.uniform1f(lightCore, isTouch ? 0 : 0.14)
    gl.uniform1f(lightHalo, isTouch ? 0 : 0.2)

    let raf = 0
    let visible = true
    let lastFrame = 0
    let width = 0
    let height = 0
    const interval = 1000 / 30

    const sizeCanvas = () => {
      const cssWidth = canvas.clientWidth
      const cssHeight = canvas.clientHeight
      if (!cssWidth || !cssHeight) return false
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const pixelWidth = cssWidth * dpr
      const pixelHeight = cssHeight * dpr
      const scale = Math.min(1, 1600 / pixelWidth, Math.sqrt(1_000_000 / (pixelWidth * pixelHeight)))
      const nextWidth = Math.max(1, Math.floor(pixelWidth * scale))
      const nextHeight = Math.max(1, Math.floor(pixelHeight * scale))
      if (nextWidth !== width || nextHeight !== height) {
        width = nextWidth
        height = nextHeight
        canvas.width = width
        canvas.height = height
        gl!.uniform2f(resolution, width, height)
        gl!.uniform2f(grainResolution, pixelWidth, pixelHeight)
      }
      return true
    }

    const advanceLoops = (deltaSeconds: number) => {
      layers.forEach((layer) => {
        layer.elapsed = ((layer.elapsed + deltaSeconds) % layer.period + layer.period) % layer.period
        const angle = (layer.elapsed / layer.period) * TAU
        gl!.uniform2f(layer.uniform, layer.radius * Math.sin(angle), layer.radius * (1 - Math.cos(angle)))
      })
    }

    let lastDraw = 0
    const draw = (now: number) => {
      if (!sizeCanvas()) return
      const delta = reduceMotion?.matches || !lastDraw ? 0 : Math.min(now - lastDraw, 100) * 0.001
      lastDraw = now
      advanceLoops(delta)
      gl!.uniform1f(dark, darkScheme?.matches ? 1 : 0)
      gl!.viewport(0, 0, width, height)
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!visible || document.hidden) return
      if (now - lastFrame < interval) return
      lastFrame = now
      draw(now)
    }

    draw(performance.now())
    if (!reduceMotion?.matches) raf = requestAnimationFrame(loop)

    const onMotionChange = () => {
      cancelAnimationFrame(raf)
      if (reduceMotion?.matches) draw(performance.now())
      else raf = requestAnimationFrame(loop)
    }
    const onSchemeChange = () => draw(performance.now())
    const onVisibility = () => {
      if (!document.hidden) draw(performance.now())
    }
    const onResize = () => draw(performance.now())

    const observer =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            (entries) => {
              visible = entries.some((entry) => entry.isIntersecting)
            },
            { threshold: 0 },
          )
        : null
    observer?.observe(canvas)

    reduceMotion?.addEventListener('change', onMotionChange)
    darkScheme?.addEventListener('change', onSchemeChange)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
      reduceMotion?.removeEventListener('change', onMotionChange)
      darkScheme?.removeEventListener('change', onSchemeChange)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      gl!.deleteBuffer(buffer)
      gl!.deleteProgram(program)
    }
  }, [])

  return (
    <div className={`backdrop ${className ?? ''}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} className="backdrop-canvas" />
      <div className="backdrop-grid" />
    </div>
  )
}

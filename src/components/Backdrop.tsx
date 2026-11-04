import { useEffect, useRef } from 'react'
import './Backdrop.css'

const VERTEX = `#version 300 es
in vec4 a_position;
void main() { gl_Position = a_position; }
`

const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_dark;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * 0.18;

  // Base canvas, three slow-drifting soft light pools. No turbulent noise: the
  // whole point is a calm wash that sits behind the content.
  vec3 base = mix(vec3(0.043, 0.047, 0.054), vec3(0.976, 0.973, 0.968), 1.0 - u_dark);
  vec3 brand = mix(vec3(0.146, 0.243, 0.560), vec3(0.545, 0.639, 0.988), 1.0 - u_dark);
  vec3 halo = mix(vec3(0.286, 0.400, 0.780), vec3(0.760, 0.830, 1.000), 1.0 - u_dark);

  vec2 c1 = vec2(0.030 * sin(t * 0.55), 0.250 + 0.035 * cos(t * 0.42));
  vec2 c2 = vec2(-0.360 + 0.050 * cos(t * 0.37 + 1.1), -0.130 + 0.040 * sin(t * 0.61));
  vec2 c3 = vec2(0.430 + 0.045 * sin(t * 0.47 + 2.2), -0.060 + 0.045 * cos(t * 0.52));

  float pool1 = exp(-dot(p - c1, p - c1) * 3.4);
  float pool2 = exp(-dot(p - c2, p - c2) * 4.6);
  float pool3 = exp(-dot(p - c3, p - c3) * 4.9);

  float strength = mix(0.36, 0.16, 1.0 - u_dark);
  vec3 color = base;
  color = mix(color, brand, pool1 * strength);
  color = mix(color, halo, pool2 * strength * 0.55);
  color = mix(color, brand, pool3 * strength * 0.5);

  // Cool the lower half slightly so the pools read as light coming from above.
  color = mix(color, base, smoothstep(0.15, 1.15, uv.y) * 0.55);

  // Dither instead of film grain: hides banding without adding visible noise.
  float dither = hash(gl_FragCoord.xy + fract(u_time) * 37.0) - 0.5;
  color += dither * 0.008;

  fragColor = vec4(color, 1.0);
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

type Props = {
  /** Extra class for positioning tweaks from the page that renders it. */
  className?: string
}

/**
 * Soft fluid shader behind a hero. Renders a single static frame when the visitor
 * prefers reduced motion, pauses when offscreen or when the tab is hidden, and
 * degrades to a CSS gradient when WebGL2 is unavailable.
 */
export default function Backdrop({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Test environments (jsdom) may not implement matchMedia or IntersectionObserver.
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
    } catch {
      canvas.dataset.fallback = 'true'
      return
    }

    const position = gl.getAttribLocation(program, 'a_position')
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const resolution = gl.getUniformLocation(program, 'u_resolution')
    const time = gl.getUniformLocation(program, 'u_time')
    const dark = gl.getUniformLocation(program, 'u_dark')

    let frame = 0
    let raf = 0
    let visible = true
    let lastFrame = 0
    const interval = 1000 / 30

    const draw = (now: number) => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (width === 0 || height === 0) return
      const scale = Math.min(window.devicePixelRatio || 1, 1.5)
      const pixelWidth = Math.min(Math.round(width * scale), 1600)
      const pixelHeight = Math.min(Math.round(height * scale), 1000)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }
      gl.viewport(0, 0, pixelWidth, pixelHeight)
      gl.useProgram(program)
      gl.uniform2f(resolution, pixelWidth, pixelHeight)
      gl.uniform1f(time, reduceMotion?.matches ? 12 : now / 1000)
      gl.uniform1f(dark, darkScheme?.matches ? 1 : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!visible || document.hidden) return
      if (now - lastFrame < interval) return
      lastFrame = now
      frame += 1
      draw(now)
    }

    draw(performance.now())

    if (!reduceMotion?.matches) {
      raf = requestAnimationFrame(loop)
    }

    const onMotionChange = () => {
      cancelAnimationFrame(raf)
      if (reduceMotion?.matches) {
        draw(performance.now())
      } else {
        raf = requestAnimationFrame(loop)
      }
    }

    const onSchemeChange = () => draw(performance.now())
    const onVisibility = () => {
      if (document.hidden) return
      draw(performance.now())
    }

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

    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
      reduceMotion?.removeEventListener('change', onMotionChange)
      darkScheme?.removeEventListener('change', onSchemeChange)
      document.removeEventListener('visibilitychange', onVisibility)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      void frame
    }
  }, [])

  return (
    <div className={`backdrop ${className ?? ''}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} className="backdrop-canvas" />
      <div className="backdrop-grid" />
    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import './SideRays.css'

type SideRaysProps = {
  className?: string
  dust?: number
  followMouse?: boolean
  glow?: number
  intensity?: number
  mouseInfluence?: number
  origin?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'
  rayColor1?: string
  rayColor2?: string
  spread?: number
}

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const fragmentShaderSource = `
  precision mediump float;

  uniform vec2 u_resolution;
  uniform vec2 u_origin;
  uniform vec2 u_mouse;
  uniform float u_time;
  uniform float u_intensity;
  uniform float u_glow;
  uniform float u_spread;
  uniform float u_dust;
  uniform float u_mouse_influence;
  uniform vec3 u_color1;
  uniform vec3 u_color2;

  varying vec2 v_uv;

  float random(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 source = mix(u_origin, u_mouse, u_mouse_influence);
    vec2 direction = v_uv - source;
    direction.x *= aspect;

    float distanceFromSource = length(direction);
    float angle = atan(direction.y, direction.x);
    float rayFrequency = 15.0 * u_spread;
    float rayPhase = sin(angle * rayFrequency + distanceFromSource * 1.6 - u_time * 0.12);
    float rays = pow(max(rayPhase, 0.0), 13.0);
    float falloff = exp(-distanceFromSource * 0.52);
    float sourceGlow = exp(-distanceFromSource * 5.5) * u_glow;

    float colorMix = smoothstep(-1.1, 1.1, angle + 0.18);
    vec3 rayColor = mix(u_color1, u_color2, colorMix);
    float cell = random(floor(v_uv * u_resolution * 0.42));
    float shimmer = step(0.994, cell) * (0.55 + 0.45 * sin(u_time * 0.8 + cell * 18.0));
    float alpha = (rays * falloff * 0.12 + sourceGlow * 0.09 + shimmer * u_dust * 0.06) * u_intensity;

    gl_FragColor = vec4(rayColor, clamp(alpha, 0.0, 0.72));
  }
`

function colorToRgb(color: string): [number, number, number] {
  const hex = color.replace('#', '')
  const normalized = hex.length === 3
    ? hex.split('').map((character) => `${character}${character}`).join('')
    : hex
  const value = Number.parseInt(normalized, 16)

  if (!Number.isFinite(value)) return [1, 1, 1]

  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ]
}

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('SideRays shader compilation failed:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}

const ORIGINS: Record<NonNullable<SideRaysProps['origin']>, [number, number]> = {
  'top-right': [1, 1],
  'top-left': [0, 1],
  'bottom-right': [1, 0],
  'bottom-left': [0, 0],
  center: [0.5, 0.5],
}

export default function SideRays({
  className = '',
  dust = 0.4,
  followMouse = true,
  glow = 1.2,
  intensity = 1.8,
  mouseInfluence = 0.3,
  origin = 'top-right',
  rayColor1 = '#F59E0B',
  rayColor2 = '#10B981',
  spread = 2.5,
}: SideRaysProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl', {
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
    })

    if (!canvas || !gl) return

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()
    if (!program) return

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('SideRays program linking failed:', gl.getProgramInfoLog(program))
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      return
    }

    const buffer = gl.createBuffer()
    if (!buffer) {
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      return
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]), gl.STATIC_DRAW)
    gl.useProgram(program)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const positionLocation = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      origin: gl.getUniformLocation(program, 'u_origin'),
      mouse: gl.getUniformLocation(program, 'u_mouse'),
      time: gl.getUniformLocation(program, 'u_time'),
      intensity: gl.getUniformLocation(program, 'u_intensity'),
      glow: gl.getUniformLocation(program, 'u_glow'),
      spread: gl.getUniformLocation(program, 'u_spread'),
      dust: gl.getUniformLocation(program, 'u_dust'),
      mouseInfluence: gl.getUniformLocation(program, 'u_mouse_influence'),
      color1: gl.getUniformLocation(program, 'u_color1'),
      color2: gl.getUniformLocation(program, 'u_color2'),
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
    let frame = 0
    let mouseX = 0.5
    let mouseY = 0.5
    let lastTimestamp = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.round(bounds.width * pixelRatio))
      const height = Math.max(1, Math.round(bounds.height * pixelRatio))
      if (canvas.width === width && canvas.height === height) return
      canvas.width = width
      canvas.height = height
      gl.viewport(0, 0, width, height)
    }

    const handlePointerMove = (event: PointerEvent) => {
      mouseX = event.clientX / Math.max(window.innerWidth, 1)
      mouseY = 1 - event.clientY / Math.max(window.innerHeight, 1)
    }

    const draw = (timestamp: number) => {
      if (!reducedMotion && timestamp - lastTimestamp < 32) {
        frame = window.requestAnimationFrame(draw)
        return
      }

      lastTimestamp = timestamp
      resize()
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
      gl.uniform2fv(uniforms.origin, ORIGINS[origin])
      gl.uniform2f(uniforms.mouse, mouseX, mouseY)
      gl.uniform1f(uniforms.time, reducedMotion ? 0 : timestamp / 1000)
      gl.uniform1f(uniforms.intensity, intensity)
      gl.uniform1f(uniforms.glow, glow)
      gl.uniform1f(uniforms.spread, spread)
      gl.uniform1f(uniforms.dust, dust)
      gl.uniform1f(uniforms.mouseInfluence, followMouse ? mouseInfluence : 0)
      gl.uniform3fv(uniforms.color1, colorToRgb(rayColor1))
      gl.uniform3fv(uniforms.color2, colorToRgb(rayColor2))
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      if (!reducedMotion) frame = window.requestAnimationFrame(draw)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    if (followMouse && !reducedMotion) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true })
    }
    frame = window.requestAnimationFrame(draw)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', handlePointerMove)
      resizeObserver.disconnect()
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    }
  }, [dust, followMouse, glow, intensity, mouseInfluence, origin, rayColor1, rayColor2, spread])

  return (
    <div aria-hidden="true" className={`side-rays ${className}`}>
      <div className="side-rays__fallback" />
      <canvas ref={canvasRef} className="side-rays__canvas" />
    </div>
  )
}

import { useEffect, useRef } from 'react'

export type WaveVariant = 'hero' | 'works' | 'contact'

type Palette = {
  bg: [string, string]
  waterDeep: string
  waterShallow: string
  specular: string
}

const variantIndex: Record<WaveVariant, number> = {
  hero: 0,
  works: 1,
  contact: 2,
}

const palettes: Record<WaveVariant, Palette> = {
  hero: {
    bg: ['#07090d', '#0c1218'],
    waterDeep: '#0c1418',
    waterShallow: '#3a5c66',
    specular: '#5a7a84',
  },
  works: {
    bg: ['#000000', '#000000'],
    waterDeep: '#051a30',
    waterShallow: '#1a5a9a',
    specular: '#4ab8e0',
  },
  contact: {
    bg: ['#000000', '#000000'],
    waterDeep: '#181818',
    waterShallow: '#707070',
    specular: '#f2f2f2',
  },
}

/** 全屏三角形 + 雨滴涟漪 / 流动光带 / 云朵夜空着色器（各区块不同样式） */
const VERTEX_SHADER = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uVariant;
uniform vec3 uWaterDeep;
uniform vec3 uWaterShallow;
uniform vec3 uSpecular;
uniform vec3 uBgTop;
uniform vec3 uBgBottom;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 dropOrigin(float id, float variant) {
  vec2 seed = vec2(id * 17.3 + variant * 4.1, id * 9.7 + variant * 2.3);
  return vec2(hash(seed) * 2.0 - 1.0, hash(seed + 1.7) * 2.0 - 1.0);
}

float rainRipple(vec2 p, vec2 origin, float t, float phase, float speed, float freq, float decay) {
  float d = length(p - origin);
  float life = fract(t * speed + phase);
  float wave = sin((d - life * 1.6) * freq);
  float fade = exp(-d * decay) * exp(-life * 2.2) * smoothstep(0.0, 0.08, life);
  return wave * fade;
}

float rainField(vec2 p, float t, float variant) {
  float sum = 0.0;
  float speed = variant < 0.5 ? 0.07 : variant < 1.5 ? 0.1 : 0.085;
  float freq = variant < 0.5 ? 11.0 : variant < 1.5 ? 14.0 : 12.5;
  float decay = variant < 0.5 ? 1.8 : variant < 1.5 ? 2.1 : 1.95;
  float weight = variant < 0.5 ? 0.32 : variant < 1.5 ? 0.28 : 0.3;

  for (int i = 0; i < 10; i++) {
    float id = float(i);
    vec2 origin = dropOrigin(id, variant);
    float phase = hash(vec2(id, variant + 2.0));
    sum += rainRipple(p, origin, t, phase, speed + hash(vec2(id, 1.0)) * 0.03, freq, decay) * weight;
  }

  float d = length(p);
  sum += sin(d * 4.2 - t * 0.28) * exp(-d * 1.2) * 0.05;
  return sum;
}

float noise21(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float silkFiber(vec2 p, float t, float seed, float speed) {
  float phase = t * speed + seed * 6.283;
  float cx = p.x;

  float curve = sin(cx * (1.1 + seed * 0.45) + phase) * (0.34 + seed * 0.14);
  curve += sin(cx * (0.42 + seed * 0.18) - phase * 0.52) * 0.21;
  curve += sin(cx * 2.2 + phase * 0.95) * 0.05;
  curve += (noise21(vec2(cx * 5.0 + seed * 12.0, phase * 0.4)) - 0.5) * 0.055;

  float bundle = 0.0;
  for (int j = 0; j < 4; j++) {
    float fj = float(j);
    float micro = (fj - 1.5) * 0.006 + sin(cx * 7.0 + phase + fj * 1.7) * 0.003;
    float dw = abs(p.y - curve - micro);
    float w = 0.0022 + seed * 0.0015;
    float core = exp(-dw * dw / (w * w));
    float aura = exp(-dw * dw / (w * w * 30.0)) * 0.1;
    bundle += core + aura;
  }
  return bundle;
}

float fiberLayer(vec2 p, float t, float layerSeed, float speed) {
  float sum = 0.0;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float seed = hash(vec2(fi, layerSeed));
    vec2 off = vec2(hash(vec2(fi, layerSeed + 1.0)) * 2.6 - 1.3, hash(vec2(fi, layerSeed + 2.0)) * 1.6 - 0.8);
    float spd = speed + hash(vec2(fi, layerSeed + 3.0)) * 0.035;
    sum += silkFiber(p + off, t, seed, spd) * (0.28 + seed * 0.22);
  }
  return sum;
}

vec3 renderFlowTrails(vec2 uv, float aspect, float t, vec3 deep, vec3 mid, vec3 bright) {
  vec3 bg = vec3(0.0);

  vec2 c = (uv - 0.5) * vec2(aspect, 1.0);
  float warpX = sin(c.y * 1.8 + t * 0.18) * 0.03;
  float warpY = cos(c.x * 1.5 - t * 0.15) * 0.03;
  c += vec2(warpX, warpY);

  vec2 pBlueLo = vec2(c.x * 0.88 + c.y * 0.52, c.y * 0.82 - c.x * 0.18);
  pBlueLo *= 2.15;
  pBlueLo += vec2(t * 0.032, t * 0.026);

  vec2 pBlueHi = vec2(c.x * 0.8 - c.y * 0.38, -c.y * 0.75 + c.x * 0.22);
  pBlueHi *= 2.0;
  pBlueHi += vec2(-t * 0.028, t * 0.034);

  vec2 pOrange = vec2(c.x + c.y * 0.55, c.y - c.x * 0.12);
  pOrange *= 1.75;
  pOrange += vec2(t * 0.02, t * 0.018);

  float blueLo = fiberLayer(pBlueLo, t, 3.7, 0.055);
  float blueHi = fiberLayer(pBlueHi, t * 0.92, 8.3, 0.048);
  float orangeRaw = fiberLayer(pOrange, t * 0.88, 15.1, 0.042);

  float orangeMask = exp(-pow(abs(c.x - c.y * 0.28) * 1.15, 2.0));
  orangeMask *= exp(-pow((uv.y - 0.48) * 2.4, 2.0) * 0.35);
  float orange = orangeRaw * orangeMask;

  float blueInt = clamp(blueLo + blueHi, 0.0, 1.1);
  float orangeInt = clamp(orange, 0.0, 0.75);

  vec3 blueCol = mix(deep, mid, smoothstep(0.02, 0.32, blueInt));
  blueCol = mix(blueCol, bright, smoothstep(0.12, 0.55, blueInt) * 0.45);

  vec3 orangeDeep = vec3(0.28, 0.1, 0.02);
  vec3 orangeMid = vec3(0.72, 0.32, 0.06);
  vec3 orangeBright = vec3(0.95, 0.62, 0.18);
  vec3 orangeCol = mix(orangeDeep, orangeMid, smoothstep(0.04, 0.35, orangeInt));
  orangeCol = mix(orangeCol, orangeBright, smoothstep(0.15, 0.55, orangeInt) * 0.5);

  vec3 result = bg;
  result += blueCol * blueInt * 0.26;
  result += bright * pow(blueInt, 3.8) * 0.07;
  result += orangeCol * orangeInt * 0.3;
  result += orangeBright * pow(orangeInt, 3.2) * 0.05;

  float vig = 1.0 - smoothstep(0.6, 1.4, length(c));
  result *= 0.82 + vig * 0.18;

  return result;
}

float cloudFbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  mat2 rot = mat2(0.82, -0.57, 0.57, 0.82);
  for (int i = 0; i < 4; i++) {
    v += a * noise21(p);
    p = rot * p * 2.06 + 0.18;
    a *= 0.5;
  }
  return v;
}

float cloudBlob(vec2 c, vec2 center, vec2 size) {
  vec2 d = (c - center) / size;
  return exp(-dot(d, d) * 1.6);
}

float cloudWall(vec2 c, float t, float side) {
  float wall = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float seed = hash(vec2(fi, side + 7.0));
    float y = (fi / 5.0 - 0.5) * 1.55 + sin(t * 0.11 + fi * 1.3 + seed * 4.0) * 0.09;
    float x = side * (0.58 + sin(t * 0.08 + seed * 5.0) * 0.07);
    vec2 size = vec2(0.2 + seed * 0.14, 0.16 + hash(vec2(fi, side + 2.0)) * 0.13);
    float blob = cloudBlob(c, vec2(x, y), size);
    blob *= 0.5 + 0.5 * cloudFbm(c * 2.8 + vec2(fi * 0.7, t * 0.04 + seed));
    wall += blob;
  }
  return clamp(wall, 0.0, 1.3);
}

float cloudBottom(vec2 c, float t) {
  float band = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float seed = hash(vec2(fi, 20.0));
    float x = (fi / 4.0 - 0.5) * 1.4 + sin(t * 0.09 + seed * 3.0) * 0.12;
    float y = -0.62 + sin(t * 0.07 + fi) * 0.04;
    vec2 size = vec2(0.28 + seed * 0.16, 0.14 + hash(vec2(fi, 21.0)) * 0.1);
    band += cloudBlob(c, vec2(x, y), size);
  }
  return clamp(band, 0.0, 1.1);
}

float starField(vec2 uv, float t) {
  vec2 p = uv * vec2(180.0, 140.0);
  vec2 id = floor(p);
  vec2 gv = fract(p) - 0.5;
  float h = hash(id);
  if (h < 0.985) return 0.0;
  float d = length(gv);
  float twinkle = 0.6 + 0.4 * sin(t * (0.9 + h * 2.0) + h * 6.28);
  return smoothstep(0.12, 0.0, d) * twinkle * 0.55;
}

float shootingStar(vec2 uv, float t) {
  float cycle = fract(t * 0.06 + 0.35);
  if (cycle > 0.18) return 0.0;
  float prog = cycle / 0.18;
  vec2 head = vec2(0.18 + prog * 0.72, 0.78 - prog * 0.38);
  vec2 q = uv - head;
  vec2 dir = normalize(vec2(0.88, -0.42));
  float along = dot(q, dir);
  float perp = abs(dot(q, vec2(-dir.y, dir.x)));
  float trail = exp(-perp * 90.0) * smoothstep(0.18, 0.0, along) * smoothstep(-0.04, 0.02, along);
  return trail * (1.0 - prog * 0.5);
}

vec3 renderCloudSky(vec2 uv, float aspect, float t) {
  vec2 c = (uv - 0.5) * vec2(aspect, 1.0);

  float leftWall = cloudWall(c, t, -1.0);
  float rightWall = cloudWall(c, t * 0.9, 1.0);
  float bottomBand = cloudBottom(c, t * 0.85);
  float density = clamp(leftWall + rightWall + bottomBand * 0.85, 0.0, 1.5);

  float leftRim = smoothstep(-0.05, -0.42, c.x) * leftWall;
  float rightRim = smoothstep(0.05, 0.42, c.x) * rightWall;
  float bottomRim = smoothstep(-0.72, -0.38, c.y) * bottomBand;
  float rim = clamp(leftRim + rightRim + bottomRim * 0.8, 0.0, 1.2);

  float centerMask = 1.0 - exp(-dot(c, c) * 2.8);
  density *= centerMask;
  rim *= centerMask;

  float body = clamp(density * 0.55, 0.0, 1.0);
  float edge = clamp(rim * 0.85, 0.0, 1.0);

  vec3 cloudCol = mix(vec3(0.15), vec3(0.55), body);
  cloudCol = mix(cloudCol, vec3(0.97), edge);

  vec3 color = vec3(0.0);
  color += cloudCol * clamp(body + edge * 0.75, 0.0, 1.0);

  float stars = starField(uv, t);
  stars *= (1.0 - clamp(density, 0.0, 1.0) * 0.95);
  color += vec3(0.9) * stars;

  color += vec3(0.85) * shootingStar(uv, t);

  return color;
}

float waveHeight(vec2 p, float t, float variant) {
  return rainField(p, t, variant);
}

vec3 waveNormal(vec2 p, float t, float variant) {
  float h = waveHeight(p, t, variant);
  float eps = 0.035;
  float hx = waveHeight(p + vec2(eps, 0.0), t, variant) - h;
  float hz = waveHeight(p + vec2(0.0, eps), t, variant) - h;
  return normalize(vec3(-hx / eps, 1.0, -hz / eps));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 bg = mix(uBgTop, uBgBottom, uv.y);

  float aspect = uResolution.x / uResolution.y;
  vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);
  float r = length(centered);

  vec2 plane = centered * 2.0;
  bool isWorks = uVariant > 0.5 && uVariant < 1.5;
  bool isContact = uVariant > 1.5;

  vec3 L = normalize(vec3(0.1, 0.72, 0.48));
  vec3 color = bg;

  if (isWorks) {
    color = renderFlowTrails(uv, aspect, uTime, uWaterDeep, uWaterShallow, uSpecular);
  } else if (isContact) {
    color = renderCloudSky(uv, aspect, uTime);
  } else {
    float ripple = waveHeight(plane, uTime, uVariant);
    vec3 N = waveNormal(plane, uTime, uVariant);

    float diff = max(dot(N, L), 0.0) * 0.28 + 0.72;
    float spec = pow(max(dot(N, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 64.0) * 0.14;

    float ringStrength = abs(ripple);
    vec3 ringColor = mix(uWaterDeep, uWaterShallow, clamp(ringStrength * 3.2, 0.0, 1.0));
    float ringMask = smoothstep(0.012, 0.2, ringStrength);

    color = mix(color, ringColor * diff, ringMask * 0.55);
    color += uSpecular * spec * ringMask;

    float edgeFade = 1.0 - smoothstep(0.82, 1.18, r) * 0.4;
    color = mix(bg, color, edgeFade);
  }

  gl_FragColor = vec4(color, 1.0);
}
`

const FULLSCREEN_TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3])

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ]
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('===> Shader compile error', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function getWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  const options: WebGLContextAttributes = { alpha: false, antialias: true }
  const ctx = canvas.getContext('webgl', options)
  return ctx instanceof WebGLRenderingContext ? ctx : null
}

function createProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource)
  if (!vs || !fs) return null

  const program = gl.createProgram()
  if (!program) return null

  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('===> Program link error', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

type Props = {
  variant: WaveVariant
  className?: string
}

export function WaveBackground({ variant, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const palette = palettes[variant]

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const gl = getWebGLContext(canvas)
    if (!gl) {
      console.error('===> WebGL not supported')
      return
    }

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)
    if (!program) return

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_TRIANGLE, gl.STATIC_DRAW)

    const aPosition = gl.getAttribLocation(program, 'aPosition')
    const uResolution = gl.getUniformLocation(program, 'uResolution')
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uVariant = gl.getUniformLocation(program, 'uVariant')
    const uWaterDeep = gl.getUniformLocation(program, 'uWaterDeep')
    const uWaterShallow = gl.getUniformLocation(program, 'uWaterShallow')
    const uSpecular = gl.getUniformLocation(program, 'uSpecular')
    const uBgTop = gl.getUniformLocation(program, 'uBgTop')
    const uBgBottom = gl.getUniformLocation(program, 'uBgBottom')

    const deep = hexToRgb(palette.waterDeep)
    const shallow = hexToRgb(palette.waterShallow)
    const specular = hexToRgb(palette.specular)
    const bgTop = hexToRgb(palette.bg[0])
    const bgBottom = hexToRgb(palette.bg[1])

    let frameId = 0
    let start = performance.now()
    let width = 0
    let height = 0
    let visible = true
    let tabActive = !document.hidden
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const frameInterval = variant === 'works' || variant === 'contact' ? 33 : 20

    const shouldAnimate = () => visible && tabActive && !reduceMotion

    const scheduleFrame = () => {
      if (shouldAnimate() && !frameId) {
        frameId = requestAnimationFrame(draw)
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = container.getBoundingClientRect()
      width = Math.max(rect.width, 1)
      height = Math.max(rect.height, 1)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    let lastFrame = 0

    const draw = (now: number) => {
      frameId = 0
      if (!shouldAnimate()) return
      if (now - lastFrame < frameInterval) {
        scheduleFrame()
        return
      }
      lastFrame = now

      const t = (now - start) / 1000

      gl.clearColor(bgTop[0], bgTop[1], bgTop[2], 1)
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(aPosition)
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform1f(uTime, t)
      gl.uniform1f(uVariant, variantIndex[variant])
      gl.uniform3f(uWaterDeep, deep[0], deep[1], deep[2])
      gl.uniform3f(uWaterShallow, shallow[0], shallow[1], shallow[2])
      gl.uniform3f(uSpecular, specular[0], specular[1], specular[2])
      gl.uniform3f(uBgTop, bgTop[0], bgTop[1], bgTop[2])
      gl.uniform3f(uBgBottom, bgBottom[0], bgBottom[1], bgBottom[2])

      gl.drawArrays(gl.TRIANGLES, 0, 3)

      scheduleFrame()
    }

    const onVisibilityChange = () => {
      tabActive = !document.hidden
      if (tabActive) scheduleFrame()
      else cancelAnimationFrame(frameId)
    }

    resize()
    draw(start)

    const ro = new ResizeObserver(() => {
      resize()
      if (visible) draw(performance.now())
    })
    ro.observe(container)

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) {
          scheduleFrame()
        } else {
          cancelAnimationFrame(frameId)
          frameId = 0
        }
      },
      { threshold: 0.08, rootMargin: '80px 0px' },
    )
    io.observe(container)

    document.addEventListener('visibilitychange', onVisibilityChange)
    scheduleFrame()

    return () => {
      cancelAnimationFrame(frameId)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    }
  }, [variant])

  return (
    <div ref={containerRef} className={`wave-bg wave-bg--${variant} ${className}`.trim()} aria-hidden>
      <canvas ref={canvasRef} className="wave-bg__canvas" />
      <div className="wave-bg__grid" />
    </div>
  )
}

import { useEffect, useRef } from 'react'

export type WaveVariant = 'hero' | 'works' | 'contact'

type WaveLayer = {
  amplitude: number
  wavelength: number
  speed: number
  phase: number
  opacity: number
  lineWidth: number
}

type Palette = {
  bg: [string, string]
  waves: string[]
  glow: string
}

type WaveLayout = {
  bandCount: number
  startY: number
  stepY: number
}

type WaveDrawContext = {
  ctx: CanvasRenderingContext2D
  width: number
  baseY: number
  layer: WaveLayer
  layerIndex: number
  time: number
  color: string
}

const palettes: Record<WaveVariant, Palette> = {
  hero: {
    bg: ['#07090d', '#0c1218'],
    waves: ['rgba(94, 234, 212, 0.38)', 'rgba(56, 189, 248, 0.26)', 'rgba(148, 163, 184, 0.16)'],
    glow: 'rgba(94, 234, 212, 0.1)',
  },
  works: {
    bg: ['#080a0f', '#10131c'],
    waves: ['rgba(129, 140, 248, 0.34)', 'rgba(167, 139, 250, 0.24)', 'rgba(56, 189, 248, 0.18)'],
    glow: 'rgba(129, 140, 248, 0.08)',
  },
  contact: {
    bg: ['#06080c', '#0d1118'],
    waves: ['rgba(52, 211, 153, 0.32)', 'rgba(45, 212, 191, 0.22)', 'rgba(148, 163, 184, 0.15)'],
    glow: 'rgba(52, 211, 153, 0.08)',
  },
}

const layerPresets: Record<WaveVariant, WaveLayer[]> = {
  hero: [
    { amplitude: 52, wavelength: 0.0032, speed: 0.28, phase: 0, opacity: 1, lineWidth: 1.8 },
    { amplitude: 38, wavelength: 0.0048, speed: -0.22, phase: 1.4, opacity: 0.9, lineWidth: 1.4 },
    { amplitude: 26, wavelength: 0.0021, speed: 0.18, phase: 2.8, opacity: 0.75, lineWidth: 2.2 },
  ],
  works: [
    { amplitude: 42, wavelength: 0.0085, speed: 0.62, phase: 0.5, opacity: 1, lineWidth: 1.3 },
    { amplitude: 34, wavelength: 0.0115, speed: -0.78, phase: 2.3, opacity: 0.88, lineWidth: 1.1 },
    { amplitude: 28, wavelength: 0.014, speed: 0.95, phase: 4.1, opacity: 0.72, lineWidth: 0.9 },
  ],
  contact: [
    { amplitude: 46, wavelength: 0.0055, speed: 0.38, phase: 0.2, opacity: 1, lineWidth: 1.6 },
    { amplitude: 36, wavelength: 0.0072, speed: -0.32, phase: 1.6, opacity: 0.88, lineWidth: 1.2 },
    { amplitude: 24, wavelength: 0.0095, speed: 0.52, phase: 3.4, opacity: 0.7, lineWidth: 0.85 },
  ],
}

const layouts: Record<WaveVariant, WaveLayout> = {
  hero: { bandCount: 4, startY: 0.3, stepY: 0.15 },
  works: { bandCount: 6, startY: 0.26, stepY: 0.1 },
  contact: { bandCount: 5, startY: 0.34, stepY: 0.11 },
}

/** Hero：宽阔起伏的深海涌浪，三层不同波长叠加 */
function heroWaveY(x: number, layer: WaveLayer, time: number): number {
  const { wavelength: wl, speed, phase, amplitude: amp } = layer
  const t = time * speed
  const swell = Math.sin(x * wl + t + phase) * amp
  const roll = Math.cos(x * wl * 0.28 + t * 0.6 + phase * 0.7) * amp * 0.62
  const drift = Math.sin(x * wl * 0.09 + t * 0.25) * amp * 0.28
  return swell + roll + drift
}

/** Works：高频干涉波纹，细密交错如干涉条纹 */
function worksWaveY(x: number, layer: WaveLayer, time: number): number {
  const { wavelength: wl, speed, phase, amplitude: amp } = layer
  const t = time * speed
  const a = Math.sin(x * wl * 2.4 + t + phase)
  const b = Math.sin(x * wl * 3.9 - t * 1.35 + phase * 1.3)
  const c = Math.sin(x * wl * 5.6 + t * 0.85 + phase * 0.6)
  const d = Math.cos(x * wl * 1.7 - t * 0.55 + phase * 2.1) * 0.4
  return (a * 0.42 + b * 0.32 + c * 0.18 + d * 0.08) * amp * 1.35
}

/** Contact：水滴涟漪，尖峰缓谷，带周期性隆起 */
function contactWaveY(x: number, layer: WaveLayer, time: number): number {
  const { wavelength: wl, speed, phase, amplitude: amp } = layer
  const t = time * speed
  const raw = Math.sin(x * wl + t + phase)
  const sharp = Math.sign(raw) * Math.pow(Math.abs(raw), 0.32)
  const droplet = Math.sin(x * wl * 3.8 - t * 1.6 + phase) * 0.35
  const ring = Math.sin(x * wl * 0.55 + t * 0.4) * Math.cos(x * wl * 2.2 - t * 0.9) * 0.22
  return (sharp + droplet + ring) * amp
}

function traceWavePath(
  ctx: CanvasRenderingContext2D,
  width: number,
  baseY: number,
  layer: WaveLayer,
  time: number,
  waveY: (x: number, layer: WaveLayer, time: number) => number,
) {
  const step = Math.max(2, Math.floor(width / 280))
  ctx.beginPath()
  for (let x = 0; x <= width; x += step) {
    const y = baseY + waveY(x, layer, time)
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
}

function drawHeroWaves({ ctx, width, baseY, layer, layerIndex, time, color }: WaveDrawContext) {
  traceWavePath(ctx, width, baseY, layer, time, heroWaveY)
  ctx.strokeStyle = color
  ctx.globalAlpha = layer.opacity
  ctx.lineWidth = layer.lineWidth
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.shadowBlur = layerIndex === 0 ? 14 : layerIndex === 2 ? 8 : 0
  ctx.shadowColor = color
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
}

function drawWorksWaves({ ctx, width, baseY, layer, layerIndex, time, color }: WaveDrawContext) {
  traceWavePath(ctx, width, baseY, layer, time, worksWaveY)
  ctx.strokeStyle = color
  ctx.globalAlpha = layer.opacity
  ctx.lineWidth = layer.lineWidth
  ctx.lineCap = 'butt'

  if (layerIndex === 1) {
    ctx.setLineDash([3, 9])
    ctx.lineDashOffset = -time * layer.speed * 40
  } else if (layerIndex === 2) {
    ctx.setLineDash([1, 6, 4, 6])
    ctx.lineDashOffset = time * layer.speed * 25
  } else {
    ctx.setLineDash([])
  }

  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1
}

function drawContactWaves({ ctx, width, baseY, layer, layerIndex, time, color }: WaveDrawContext) {
  traceWavePath(ctx, width, baseY, layer, time, contactWaveY)
  ctx.strokeStyle = color
  ctx.globalAlpha = layer.opacity
  ctx.lineWidth = layer.lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()

  if (layerIndex === 0) {
    ctx.globalAlpha = layer.opacity * 0.35
    ctx.lineWidth = layer.lineWidth + 6
    ctx.strokeStyle = color.replace(/[\d.]+\)$/, '0.12)')
    ctx.stroke()
  }

  ctx.globalAlpha = 1
}

const waveDrawers: Record<WaveVariant, (ctx: WaveDrawContext) => void> = {
  hero: drawHeroWaves,
  works: drawWorksWaves,
  contact: drawContactWaves,
}

type Props = {
  variant: WaveVariant
  className?: string
}

export function WaveBackground({ variant, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const palette = palettes[variant]
    const layers = layerPresets[variant]
    const layout = layouts[variant]
    const drawWaves = waveDrawers[variant]
    let frameId = 0
    let start = performance.now()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { width, height } = container.getBoundingClientRect()
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (now: number) => {
      const t = (now - start) / 1000
      const { width, height } = container.getBoundingClientRect()

      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, palette.bg[0])
      gradient.addColorStop(1, palette.bg[1])
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      const glow = ctx.createRadialGradient(width * 0.5, height * 0.35, 0, width * 0.5, height * 0.35, width * 0.55)
      glow.addColorStop(0, palette.glow)
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)

      for (let i = 0; i < layout.bandCount; i++) {
        const baseY = height * (layout.startY + i * layout.stepY)
        layers.forEach((layer, idx) => {
          drawWaves({
            ctx,
            width,
            baseY,
            layer,
            layerIndex: idx,
            time: t + idx * 0.5 + i * 0.15,
            color: palette.waves[idx % palette.waves.length],
          })
        })
      }

      if (!reduceMotion) frameId = requestAnimationFrame(draw)
    }

    resize()
    if (reduceMotion) draw(start)
    else frameId = requestAnimationFrame(draw)

    const ro = new ResizeObserver(resize)
    ro.observe(container)

    return () => {
      cancelAnimationFrame(frameId)
      ro.disconnect()
    }
  }, [variant])

  return (
    <div ref={containerRef} className={`wave-bg ${className}`.trim()} aria-hidden>
      <canvas ref={canvasRef} className="wave-bg__canvas" />
      <div className="wave-bg__grid" />
    </div>
  )
}

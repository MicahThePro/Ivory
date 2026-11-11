import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { KEYBOARD, accidentalKind, keyBox, spellMidi } from '../lib/notes'
import type { SongNote } from '../lib/song'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export function FallingNotes({
  notes,
  getBeat,
  getStatus,
  lit,
  onDown,
  onUp,
}: {
  notes: SongNote[]
  getBeat: () => number
  getStatus: (id: string) => string
  lit: () => Record<number, string>
  onDown: (midi: number) => void
  onUp: (midi: number) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const held = useRef<number | null>(null)
  const beatRef = useRef(getBeat)
  const statusRef = useRef(getStatus)
  const litRef = useRef(lit)
  beatRef.current = getBeat
  statusRef.current = getStatus
  litRef.current = lit

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const particles: Particle[] = []
    const seen = new Map<string, string>()
    let raf = 0
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(1, rect.width)
      const h = Math.max(1, rect.height)
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const keyboardH = Math.min(150, h * 0.28)
      const whiteW = w / KEYBOARD.whiteCount
      const hitY = h - keyboardH - 8
      const px = Math.max(36, (hitY - 16) / 8)
      const beat = beatRef.current()

      const sky = ctx.createLinearGradient(0, 0, 0, hitY)
      sky.addColorStop(0, '#100e0c')
      sky.addColorStop(1, '#1a1612')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, hitY)

      ctx.strokeStyle = 'rgba(240, 213, 154, 0.06)'
      ctx.lineWidth = 1
      for (let b = Math.floor(beat); b < beat + 9; b++) {
        const y = hitY - (b - beat) * px
        if (y < 0 || y > hitY) continue
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(224, 177, 90, 0.85)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, hitY)
      ctx.lineTo(w, hitY)
      ctx.stroke()

      for (const note of notes) {
        const status = statusRef.current(note.id)
        if (status !== seen.get(note.id) && status === 'hit') {
          const key = KEYBOARD.keys[note.midi - 21]
          if (key) {
            const box = keyBox(key, whiteW)
            for (let i = 0; i < 10; i++) {
              particles.push({
                x: box.x + box.w / 2,
                y: hitY,
                vx: (Math.random() - 0.5) * 2.2,
                vy: -1.2 - Math.random() * 2.4,
                life: 1,
                color: note.accidental > 0 ? '#e7a15a' : note.accidental < 0 ? '#7eb8d4' : '#f3e6c4',
              })
            }
          }
        }
        seen.set(note.id, status)
        const bottom = hitY - (note.start - beat) * px
        const top = bottom - Math.max(8, note.duration * px)
        if (bottom < -20 || top > hitY + 30) continue
        const key = KEYBOARD.keys[note.midi - 21]
        if (!key) continue
        const box = keyBox(key, whiteW)
        const bw = Math.max(14, key.black ? box.w * 0.92 : Math.min(box.w * 0.78, 26))
        const x = key.center * whiteW - bw / 2
        const kind = accidentalKind(note.accidental)
        const grad = ctx.createLinearGradient(x, top, x, bottom)
        if (status === 'hit') {
          grad.addColorStop(0, '#f0d59a')
          grad.addColorStop(1, '#8fd0a8')
        } else if (status === 'miss') {
          grad.addColorStop(0, '#e7a097')
          grad.addColorStop(1, '#8d4038')
        } else if (kind === 'sharp') {
          grad.addColorStop(0, '#f0b56a')
          grad.addColorStop(1, '#b86a32')
        } else if (kind === 'flat') {
          grad.addColorStop(0, '#9fd0e4')
          grad.addColorStop(1, '#3d7590')
        } else {
          grad.addColorStop(0, '#f7f1e4')
          grad.addColorStop(1, '#d9c7a4')
        }
        ctx.fillStyle = grad
        ctx.globalAlpha = status === 'miss' ? 0.55 : 0.95
        roundRect(ctx, x, top, bw, Math.max(6, bottom - top), 5)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.font = '700 12px Outfit, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const labelY = bottom - top > 18 ? (top + bottom) / 2 : Math.max(12, top - 9)
        ctx.lineWidth = 3
        ctx.strokeStyle = 'rgba(12,10,8,0.92)'
        ctx.strokeText(note.name, x + bw / 2, labelY)
        ctx.fillStyle = kind === 'natural' && status !== 'hit' && status !== 'now' ? '#2a2118' : '#1a120c'
        if (kind !== 'natural' || status === 'hit') ctx.fillStyle = '#1a120c'
        ctx.fillText(note.name, x + bw / 2, labelY)
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05
        p.life -= 0.02
        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }
        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }

      const lights = litRef.current()
      for (const key of KEYBOARD.keys) {
        const box = keyBox(key, whiteW)
        const y = h - keyboardH
        const height = key.black ? keyboardH * 0.62 : keyboardH
        const state = lights[key.midi]
        ctx.fillStyle = key.black ? '#161310' : '#f4efe6'
        if (state === 'good' || state === 'wait') ctx.fillStyle = state === 'wait' ? '#e7c27a' : '#9ed7b4'
        if (state === 'bad') ctx.fillStyle = '#e08a80'
        if (state === 'play') ctx.fillStyle = key.black ? '#d7b56a' : '#fff6df'
        roundRect(ctx, box.x, y, box.w - (key.black ? 0 : 1), height, key.black ? 2 : 3)
        ctx.fill()
        if (!key.black && (key.midi % 12 === 0 || key.midi === 21 || key.midi === 108)) {
          ctx.fillStyle = '#5c5146'
          ctx.font = `${Math.max(8, whiteW * 0.34)}px Outfit, sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText(spellMidi(key.midi).name, key.center * whiteW, y + height - 12)
        }
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [notes])

  const hit = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = ref.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const keyboardH = Math.min(150, rect.height * 0.28)
    if (y < rect.height - keyboardH) return null
    const whiteW = rect.width / KEYBOARD.whiteCount
    const blacks = KEYBOARD.keys.filter((k) => k.black)
    const whites = KEYBOARD.keys.filter((k) => !k.black)
    for (const key of blacks) {
      const box = keyBox(key, whiteW)
      if (x >= box.x && x <= box.x + box.w && y < rect.height - keyboardH + keyboardH * 0.62) return key.midi
    }
    for (const key of whites) {
      const box = keyBox(key, whiteW)
      if (x >= box.x && x <= box.x + box.w) return key.midi
    }
    return null
  }

  return (
    <canvas
      ref={ref}
      className="falling"
      onPointerDown={(event) => {
        const midi = hit(event)
        if (midi == null) return
        held.current = midi
        event.currentTarget.setPointerCapture(event.pointerId)
        onDown(midi)
      }}
      onPointerUp={() => {
        if (held.current != null) onUp(held.current)
        held.current = null
      }}
    />
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

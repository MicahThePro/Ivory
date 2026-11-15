import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
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

interface Camera {
  cam: number
  whiteW: number
  keyboardH: number
  w: number
  h: number
  follow: boolean
}

const WHITE_COUNT = KEYBOARD.whiteCount

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
  const beatRef = useRef(getBeat)
  const statusRef = useRef(getStatus)
  const litRef = useRef(lit)
  const notesRef = useRef(notes)
  beatRef.current = getBeat
  statusRef.current = getStatus
  litRef.current = lit
  notesRef.current = notes
  const cam = useRef<Camera>({ cam: 0, whiteW: 20, keyboardH: 120, w: 1, h: 1, follow: true })
  const drag = useRef({ x: 0, cam: 0, moved: false, midi: null as number | null })
  const [follow, setFollow] = useState(true)
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const particles: Particle[] = []
    const seen = new Map<string, string>()
    let raf = 0
    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(1, rect.width)
      const h = Math.max(1, rect.height)
      const dpr = Math.min(w < 800 ? 1.5 : 2, window.devicePixelRatio || 1)
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const keyboardH = Math.min(150, Math.max(96, h * 0.3))
      const fitW = w / WHITE_COUNT
      const whiteW = fitW >= 16 ? fitW : Math.max(22, Math.min(34, w / 14))
      const maxCam = Math.max(0, WHITE_COUNT - w / whiteW)
      const beat = beatRef.current()
      const liveNotes = notesRef.current
      if (cam.current.follow && maxCam > 0) {
        const upcoming = liveNotes.filter((n) => n.start > beat - 1 && n.start < beat + 6)
        if (upcoming.length) {
          let left = WHITE_COUNT
          let right = 0
          for (const note of upcoming) {
            const key = KEYBOARD.keys[note.midi - 21]
            if (!key) continue
            left = Math.min(left, key.left)
            right = Math.max(right, key.left + 1)
          }
          const view = w / whiteW
          const desired = Math.max(0, Math.min(maxCam, (left + right) / 2 - view / 2))
          cam.current.cam += (desired - cam.current.cam) * 0.18
        }
      }
      cam.current.cam = Math.max(0, Math.min(maxCam, cam.current.cam))
      cam.current.whiteW = whiteW
      cam.current.keyboardH = keyboardH
      cam.current.w = w
      cam.current.h = h
      const origin = cam.current.cam * whiteW
      const xOf = (whiteUnits: number) => whiteUnits * whiteW - origin
      const hitY = h - keyboardH - 6
      const px = Math.max(28, (hitY - 12) / (w < 700 ? 6 : 8))

      ctx.fillStyle = '#120f0c'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(240, 213, 154, 0.07)'
      for (let b = Math.floor(beat); b < beat + 10; b++) {
        const y = hitY - (b - beat) * px
        if (y < 0 || y > hitY) continue
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(224, 177, 90, 0.9)'
      ctx.beginPath()
      ctx.moveTo(0, hitY)
      ctx.lineTo(w, hitY)
      ctx.stroke()

      for (const note of liveNotes) {
        const status = statusRef.current(note.id)
        const key = KEYBOARD.keys[note.midi - 21]
        if (!key) continue
        const box = keyBox(key, whiteW)
        const noteX = xOf(key.center)
        if (status !== seen.get(note.id) && status === 'hit') {
          for (let i = 0; i < (w < 700 ? 6 : 10); i++) {
            particles.push({
              x: noteX,
              y: hitY,
              vx: (Math.random() - 0.5) * 2.2,
              vy: -1.2 - Math.random() * 2.2,
              life: 1,
              color: note.accidental > 0 ? '#e7a15a' : note.accidental < 0 ? '#7eb8d4' : '#f3e6c4',
            })
          }
        }
        seen.set(note.id, status)
        const bottom = hitY - (note.start - beat) * px
        const top = bottom - Math.max(8, note.duration * px)
        if (bottom < -30 || top > hitY + 20 || noteX < -40 || noteX > w + 40) continue
        const bw = Math.max(16, key.black ? box.w * 0.92 : Math.min(box.w * 0.78, 28))
        const x = noteX - bw / 2
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
        ctx.font = '700 13px Outfit, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const labelY = bottom - top > 18 ? (top + bottom) / 2 : Math.max(14, top - 10)
        ctx.lineWidth = 3
        ctx.strokeStyle = 'rgba(12,10,8,0.92)'
        ctx.strokeText(note.name, noteX, labelY)
        ctx.fillStyle = '#1a120c'
        ctx.fillText(note.name, noteX, labelY)
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05
        p.life -= 0.025
        if (p.life <= 0) particles.splice(i, 1)
        else {
          ctx.globalAlpha = p.life
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        }
      }

      const lights = litRef.current()
      const keyTop = h - keyboardH
      for (const key of KEYBOARD.keys) {
        const box = keyBox(key, whiteW)
        const x = xOf(key.left)
        if (x > w || x + box.w < 0) continue
        const height = key.black ? keyboardH * 0.62 : keyboardH
        const state = lights[key.midi]
        ctx.fillStyle = key.black ? '#161310' : '#f4efe6'
        if (state === 'good' || state === 'wait') ctx.fillStyle = state === 'wait' ? '#e7c27a' : '#9ed7b4'
        if (state === 'bad') ctx.fillStyle = '#e08a80'
        if (state === 'play') ctx.fillStyle = key.black ? '#d7b56a' : '#fff6df'
        roundRect(ctx, x, keyTop, box.w - (key.black ? 0 : 1), height, key.black ? 2 : 3)
        ctx.fill()
        if (!key.black && (key.midi % 12 === 0 || key.midi === 21 || key.midi === 108)) {
          ctx.fillStyle = '#5c5146'
          ctx.font = `${Math.max(9, Math.min(12, whiteW * 0.36))}px Outfit, sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText(spellMidi(key.midi).name, x + box.w / 2, keyTop + height - 14)
        }
      }
      if ((fitW < 16) !== narrow) setNarrow(fitW < 16)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [narrow])

  const locate = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = ref.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const view = cam.current
    if (y < view.h - view.keyboardH) return null
    const local = x + view.cam * view.whiteW
    for (const key of KEYBOARD.keys) {
      if (!key.black) continue
      const box = keyBox(key, view.whiteW)
      if (local >= box.x && local <= box.x + box.w && y < view.h - view.keyboardH + view.keyboardH * 0.62) return key.midi
    }
    for (const key of KEYBOARD.keys) {
      if (key.black) continue
      const box = keyBox(key, view.whiteW)
      if (local >= box.x && local <= box.x + box.w) return key.midi
    }
    return null
  }

  return (
    <div className="falling-wrap">
      <canvas
        ref={ref}
        className="falling"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, cam: cam.current.cam, moved: false, midi: locate(event) }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const dx = event.clientX - drag.current.x
          if (!drag.current.moved && Math.abs(dx) < 10) return
          drag.current.moved = true
          const maxCam = Math.max(0, WHITE_COUNT - cam.current.w / cam.current.whiteW)
          cam.current.follow = false
          setFollow(false)
          cam.current.cam = Math.max(0, Math.min(maxCam, drag.current.cam - dx / cam.current.whiteW))
        }}
        onPointerUp={(event) => {
          if (!drag.current.moved && drag.current.midi != null) {
            const midi = drag.current.midi
            onDown(midi)
            window.setTimeout(() => onUp(midi), 90)
          }
          drag.current.midi = null
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => {
          drag.current.midi = null
        }}
      />
      {narrow && (
        <button
          type="button"
          className="follow-keys"
          onClick={() => {
            const next = !follow
            cam.current.follow = next
            if (!next) cam.current.cam = 0
            setFollow(next)
          }}
        >
          {follow ? 'Following the music' : 'Showing every key'}
        </button>
      )}
    </div>
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)
  if (w <= 0 || h <= 0) return
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

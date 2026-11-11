import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { signatureSteps, prepareSheet, yOf, PX, SPACE, type PlacedNote } from './sheetLayout'
import type { Song, SongNote } from '../lib/song'
import { keyAt } from '../lib/song'

export interface SheetHandle {
  follow: (beat: number) => void
}

const SHARP = '\uE262'
const FLAT = '\uE260'
const NATURAL = '\uE261'
const TREBLE = '\uE050'
const BASS = '\uE062'

function restGlyph(duration: number): string {
  if (duration >= 3.5) return '\uE4E3'
  if (duration >= 1.5) return '\uE4E4'
  if (duration >= 0.9) return '\uE4E5'
  if (duration >= 0.4) return '\uE4E6'
  return '\uE4E7'
}

function StaffLines({ hand, x0, x1 }: { hand: 'left' | 'right'; x0: number; x1: number }) {
  const steps = hand === 'right' ? [2, 4, 6, 8, 10] : [-2, -4, -6, -8, -10]
  return (
    <g>
      {steps.map((s) => (
        <line key={s} x1={x0} x2={x1} y1={yOf(s)} y2={yOf(s)} className="staff-line" />
      ))}
    </g>
  )
}

function NoteHeads({ notes, status }: { notes: PlacedNote[]; status: Record<string, string> }) {
  const beams = new Map<string, PlacedNote[]>()
  for (const n of notes) {
    if (!n.flags) continue
    const key = `${n.hand}:${Math.floor(n.start + 1e-3)}:${n.stemUp ? 'u' : 'd'}`
    const list = beams.get(key) ?? []
    list.push(n)
    beams.set(key, list)
  }
  const beamed = new Set<string>()
  const beamLines: { x1: number; y1: number; x2: number; y2: number; extra: boolean }[] = []
  for (const list of beams.values()) {
    if (list.length < 2) continue
    list.sort((a, b) => a.x - b.x)
    list.forEach((n) => beamed.add(n.id))
    const dir = list[0].stemUp ? -1 : 1
    const len = SPACE * 3.4
    const x1 = list[0].x + list[0].offset + (list[0].stemUp ? 6.2 : -6.2)
    const x2 = list[list.length - 1].x + list[list.length - 1].offset + (list[0].stemUp ? 6.2 : -6.2)
    const y1 = list[0].y + dir * len
    const y2 = list[list.length - 1].y + dir * len
    beamLines.push({ x1, y1, x2, y2, extra: false })
    if (list.some((n) => n.flags >= 2)) {
      beamLines.push({ x1, y1: y1 - dir * 5, x2, y2: y2 - dir * 5, extra: true })
    }
  }

  return (
    <g>
      {beamLines.map((b, i) => (
        <line key={i} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} className="beam" />
      ))}
      {notes.map((n) => {
        const cls = status[n.id] ?? 'future'
        const nx = n.x + n.offset
        const stemX = nx + (n.stemUp ? 6.2 : -6.2)
        const stemY = n.y + (n.stemUp ? -SPACE * 3.4 : SPACE * 3.4)
        const staffTop = n.hand === 'right' ? 10 : -2
        const staffBot = n.hand === 'right' ? 2 : -10
        const ledgers: number[] = []
        if (n.step > staffTop) for (let s = staffTop + 2; s <= n.step; s += 2) ledgers.push(s)
        if (n.step < staffBot) for (let s = staffBot - 2; s >= n.step; s -= 2) ledgers.push(s)
        return (
          <g key={n.id} className={`snote ${cls}`}>
            {ledgers.map((s) => (
              <line key={s} x1={nx - 12} x2={nx + 12} y1={yOf(s)} y2={yOf(s)} className="ledger" />
            ))}
            {n.accidental != null && (
              <text className="bravura acc" x={nx - 18} y={n.y}>
                {n.accidental > 0 ? SHARP : n.accidental < 0 ? FLAT : NATURAL}
              </text>
            )}
            <ellipse
              cx={nx}
              cy={n.y}
              rx={6.4}
              ry={4.6}
              transform={`rotate(-18 ${nx} ${n.y})`}
              className={n.head === 'filled' ? 'head filled' : 'head open'}
            />
            {n.head !== 'whole' && <line x1={stemX} y1={n.y} x2={stemX} y2={stemY} className="stem" />}
            {n.flags > 0 && !beamed.has(n.id) && (
              <path
                d={
                  n.stemUp
                    ? `M ${stemX} ${stemY} q 10 6 2 14 ${n.flags > 1 ? `M ${stemX} ${stemY + 6} q 10 6 2 12` : ''}`
                    : `M ${stemX} ${stemY} q 10 -6 2 -14 ${n.flags > 1 ? `M ${stemX} ${stemY - 6} q 10 -6 2 -12` : ''}`
                }
                className="flag"
              />
            )}
            {Array.from({ length: n.dots }, (_, i) => (
              <circle key={i} cx={nx + 12 + i * 6} cy={n.y - (n.step % 2 === 0 ? SPACE / 2 : 0)} r={1.7} className="dot" />
            ))}
          </g>
        )
      })}
    </g>
  )
}

export const Sheet = forwardRef<SheetHandle, {
  song: Song
  notes: SongNote[]
  beat: number
  status: Record<string, string>
  showPlayhead?: boolean
  onSeek?: (beat: number) => void
}>(function Sheet({ song, notes, beat, status, showPlayhead = true, onSeek }, ref) {
  const scroller = useRef<HTMLDivElement>(null)
  const followOn = useRef(true)
  const layout = useMemo(() => prepareSheet(song, notes), [song, notes])
  const windowStart = Math.max(0, beat - 3)
  const windowEnd = beat + 16
  const visibleNotes = layout.notes.filter((n) => n.start < windowEnd && n.start + 4 > windowStart)
  const visibleRests = layout.rests.filter((r) => r.start > windowStart - 1 && r.start < windowEnd)
  const key = keyAt(song.keys, Math.max(0, beat))
  const time = song.times[0] ?? { numerator: 4, denominator: 4 }

  useImperativeHandle(ref, () => ({
    follow(next: number) {
      const el = scroller.current
      if (!el || !followOn.current) return
      const x = 150 + Math.max(0, next) * PX
      el.scrollLeft = x - el.clientWidth * 0.28
    },
  }))

  return (
    <div className="sheet-wrap">
      <div className="clef-gutter" aria-hidden>
        <svg width="118" height="340" viewBox="0 0 118 340">
          <StaffLines hand="right" x0={8} x1={112} />
          <StaffLines hand="left" x0={8} x1={112} />
          <text className="bravura clef" x="6" y={yOf(4)}>{TREBLE}</text>
          <text className="bravura clef bass" x="6" y={yOf(-4)}>{BASS}</text>
          {signatureSteps(key.fifths, 'right').map((step, i) => (
            <text key={`r${i}`} className="bravura sig" x={48 + i * 8} y={yOf(step)}>{key.fifths >= 0 ? SHARP : FLAT}</text>
          ))}
          {signatureSteps(key.fifths, 'left').map((step, i) => (
            <text key={`l${i}`} className="bravura sig" x={48 + i * 8} y={yOf(step)}>{key.fifths >= 0 ? SHARP : FLAT}</text>
          ))}
          <text className="time-num" x="92" y={yOf(8)}>{time.numerator}</text>
          <text className="time-num" x="92" y={yOf(4)}>{time.denominator}</text>
          <text className="time-num" x="92" y={yOf(-4)}>{time.numerator}</text>
          <text className="time-num" x="92" y={yOf(-8)}>{time.denominator}</text>
        </svg>
      </div>
      <div
        className="sheet-scroll"
        ref={scroller}
        onPointerDown={() => {
          followOn.current = false
        }}
        onDoubleClick={() => {
          followOn.current = true
        }}
      >
        <div className="sheet-canvas" style={{ width: layout.width }}>
          <svg
            width={layout.width}
            height="340"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              const beatHit = (event.clientX - rect.left - 150) / PX
              onSeek?.(Math.max(0, beatHit))
            }}
          >
            <StaffLines hand="right" x0={0} x1={layout.width} />
            <StaffLines hand="left" x0={0} x1={layout.width} />
            {layout.bars
              .filter((b) => b.start < windowEnd + 2 && b.end > windowStart - 2)
              .map((b) => (
                <line key={b.index} className="barline" x1={150 + b.start * PX} x2={150 + b.start * PX} y1={yOf(12)} y2={yOf(-12)} />
              ))}
            <NoteHeads notes={visibleNotes} status={status} />
            {visibleRests.map((r, i) => (
              <text key={i} className="bravura rest" x={r.x} y={r.y}>{restGlyph(r.duration)}</text>
            ))}
          </svg>
          {showPlayhead && beat > 0.05 && <div className="playhead" style={{ left: 150 + beat * PX }} />}
        </div>
      </div>
    </div>
  )
})

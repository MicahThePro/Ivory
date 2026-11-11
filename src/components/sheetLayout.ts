import { keyAccidentals, stepFromC4 } from '../lib/notes'
import { barSpans, keyAt, type BarSpan, type Song, type SongNote } from '../lib/song'

export const SPACE = 13
export const PX = 70
export const C4 = 168

export function yOf(step: number): number {
  return C4 - step * (SPACE / 2)
}

export function symbolFor(duration: number): { head: 'whole' | 'half' | 'filled'; flags: number; dots: number } {
  if (Math.abs(duration - 1 / 3) < 0.03) return { head: 'filled', flags: 1, dots: 0 }
  if (Math.abs(duration - 2 / 3) < 0.03) return { head: 'filled', flags: 0, dots: 0 }
  if (Math.abs(duration - 1 / 6) < 0.02) return { head: 'filled', flags: 2, dots: 0 }
  const options: { d: number; head: 'whole' | 'half' | 'filled'; flags: number }[] = [
    { d: 4, head: 'whole', flags: 0 },
    { d: 2, head: 'half', flags: 0 },
    { d: 1, head: 'filled', flags: 0 },
    { d: 0.5, head: 'filled', flags: 1 },
    { d: 0.25, head: 'filled', flags: 2 },
    { d: 0.125, head: 'filled', flags: 3 },
  ]
  for (const o of options) {
    if (Math.abs(duration - o.d) < 0.03) return { ...o, dots: 0 }
    if (Math.abs(duration - o.d * 1.5) < 0.03) return { ...o, dots: 1 }
  }
  if (duration >= 3) return { head: 'whole', flags: 0, dots: 0 }
  if (duration >= 1.6) return { head: 'half', flags: 0, dots: duration > 2.2 ? 1 : 0 }
  if (duration >= 0.85) return { head: 'filled', flags: 0, dots: duration > 1.2 ? 1 : 0 }
  if (duration >= 0.37) return { head: 'filled', flags: 1, dots: 0 }
  if (duration >= 0.18) return { head: 'filled', flags: 2, dots: 0 }
  return { head: 'filled', flags: 3, dots: 0 }
}

const TREBLE_SHARP = [10, 7, 11, 8, 5, 9, 6]
const TREBLE_FLAT = [6, 9, 5, 8, 4, 7, 3]
const BASS_SHARP = [-4, -7, -3, -6, -9, -5, -8]
const BASS_FLAT = [-8, -5, -9, -6, -10, -7, -11]

export function signatureSteps(fifths: number, hand: 'left' | 'right'): number[] {
  const n = Math.min(7, Math.abs(fifths))
  const src = fifths >= 0 ? (hand === 'right' ? TREBLE_SHARP : BASS_SHARP) : hand === 'right' ? TREBLE_FLAT : BASS_FLAT
  return src.slice(0, n)
}

export interface PlacedNote {
  id: string
  midi: number
  name: string
  step: number
  x: number
  y: number
  hand: 'left' | 'right'
  head: 'whole' | 'half' | 'filled'
  flags: number
  dots: number
  stemUp: boolean
  offset: number
  accidental: number | null
  start: number
}

export interface PlacedRest {
  hand: 'left' | 'right'
  x: number
  y: number
  duration: number
  start: number
}

export function prepareSheet(song: Song, notes: SongNote[]): { notes: PlacedNote[]; rests: PlacedRest[]; bars: BarSpan[]; width: number } {
  const end = Math.max(1, ...notes.map((n) => n.start + n.duration), ...song.notes.map((n) => n.start + n.duration))
  const bars = barSpans(song.times, end)
  const placed: PlacedNote[] = []
  const state = new Map<string, number>()
  let bar = -1
  const ordered = [...notes].sort((a, b) => a.start - b.start || a.midi - b.midi)
  for (const n of ordered) {
    const bi = bars.findIndex((b) => n.start >= b.start - 1e-4 && n.start < b.end - 1e-4)
    if (bi !== bar) {
      state.clear()
      bar = bi
    }
    const fifths = keyAt(song.keys, n.start).fifths
    const defaults = keyAccidentals(fifths)
    const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
    const li = letters.indexOf(n.letter)
    const implied = defaults[li] ?? 0
    const key = `${n.hand}:${n.letter}:${n.octave}`
    const current = state.has(key) ? state.get(key)! : implied
    const accidental = current === n.accidental ? null : n.accidental
    state.set(key, n.accidental)
    const step = stepFromC4(n.letter, n.octave)
    const sym = symbolFor(n.duration)
    placed.push({
      id: n.id,
      midi: n.midi,
      name: n.name,
      step,
      x: 150 + n.start * PX,
      y: yOf(step),
      hand: n.hand,
      head: sym.head,
      flags: sym.flags,
      dots: sym.dots,
      stemUp: false,
      offset: 0,
      accidental,
      start: n.start,
    })
  }

  const columns = new Map<string, PlacedNote[]>()
  for (const n of placed) {
    const k = `${n.hand}:${n.start.toFixed(3)}`
    const list = columns.get(k) ?? []
    list.push(n)
    columns.set(k, list)
  }
  for (const list of columns.values()) {
    list.sort((a, b) => a.step - b.step)
    const middle = list[0].hand === 'left' ? -6 : 6
    const avg = list.reduce((s, n) => s + n.step, 0) / list.length
    const stemUp = avg < middle
    list.forEach((n) => (n.stemUp = stemUp))
    for (let i = 1; i < list.length; i++) {
      if (list[i].step - list[i - 1].step <= 1) list[i].offset = stemUp ? 12 : -12
    }
  }

  const rests: PlacedRest[] = []
  for (const hand of ['right', 'left'] as const) {
    const handNotes = notes.filter((n) => n.hand === hand).sort((a, b) => a.start - b.start)
    if (!handNotes.length) continue
    let overlap = false
    for (let i = 1; i < handNotes.length; i++) {
      if (handNotes[i].start > handNotes[i - 1].start + 0.04 && handNotes[i].start < handNotes[i - 1].start + handNotes[i - 1].duration - 0.05) {
        overlap = true
        break
      }
    }
    if (overlap) continue
    const gaps: { a: number; b: number }[] = []
    let cursor = 0
    for (const n of handNotes) {
      if (n.start > cursor + 0.08) gaps.push({ a: cursor, b: n.start })
      cursor = Math.max(cursor, n.start + n.duration)
    }
    if (end > cursor + 0.08) gaps.push({ a: cursor, b: end })
    for (const gap of gaps) {
      let t = gap.a
      while (t < gap.b - 0.06) {
        const barHit = bars.find((b) => t >= b.start - 1e-4 && t < b.end - 1e-4)
        const room = Math.min(gap.b, barHit?.end ?? gap.b) - t
        const choice = [4, 2, 1, 0.5, 0.25, 0.125].find((c) => c <= room + 0.03) ?? 0.125
        rests.push({
          hand,
          x: 150 + t * PX,
          y: yOf(hand === 'left' ? -6 : 6),
          duration: choice,
          start: t,
        })
        t += choice
      }
    }
  }

  return { notes: placed, rests, bars, width: 220 + end * PX }
}

export function beamKey(song: Song, start: number): string {
  const sig = [...song.times].reverse().find((t) => t.beat <= start + 1e-6) ?? song.times[0]
  const numerator = sig?.numerator ?? 4
  const denominator = sig?.denominator ?? 4
  let len = 4 / denominator
  if ((numerator === 6 || numerator === 9 || numerator === 12 || numerator === 3) && denominator === 8) len = 1.5
  return `${Math.floor((start + 1e-4) / len)}`
}

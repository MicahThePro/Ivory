import { barBeats, type Hand, type Letter } from './notes'

export interface SongNote {
  id: string
  midi: number
  name: string
  letter: Letter
  accidental: number
  octave: number
  /** Quarter-note beats from the start. */
  start: number
  duration: number
  hand: Hand
}

export interface TempoPoint {
  beat: number
  bpm: number
}

export interface TimePoint {
  beat: number
  numerator: number
  denominator: number
}

export interface KeyPoint {
  beat: number
  fifths: number
  minor: boolean
}

export interface SongSection {
  id: string
  name: string
  start: number
  end: number
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'concert'

export interface Song {
  id: string
  title: string
  composer: string
  description: string
  difficulty: Difficulty
  bpm: number
  tempos: TempoPoint[]
  times: TimePoint[]
  keys: KeyPoint[]
  fifths: number
  minor: boolean
  notes: SongNote[]
  sections: SongSection[]
  attribution: string
  license: 'pd' | 'original' | 'cc-by-sa-2.5'
  /** Initial tempo multiplier when practising. */
  practiceScale: number
}

export interface SongMeta {
  id: string
  title: string
  composer: string
  description: string
  difficulty: Difficulty
  attribution: string
  license: Song['license']
  practiceScale: number
  bpm: number
  fifths: number
  minor: boolean
  time: [number, number]
  bars: number
  notes: number
  range: [number, number]
}

export function songEnd(notes: SongNote[]): number {
  let end = 0
  for (const n of notes) end = Math.max(end, n.start + n.duration)
  return end
}

export function timeAt(times: TimePoint[], beat: number): TimePoint {
  let cur = times[0] ?? { beat: 0, numerator: 4, denominator: 4 }
  for (const t of times) {
    if (t.beat <= beat + 1e-6) cur = t
    else break
  }
  return cur
}

export function keyAt(keys: KeyPoint[], beat: number): KeyPoint {
  let cur = keys[0] ?? { beat: 0, fifths: 0, minor: false }
  for (const k of keys) {
    if (k.beat <= beat + 1e-6) cur = k
    else break
  }
  return cur
}

export function bpmAt(tempos: TempoPoint[], beat: number): number {
  let bpm = tempos[0]?.bpm ?? 90
  for (const t of tempos) {
    if (t.beat <= beat + 1e-6) bpm = t.bpm
    else break
  }
  return bpm
}

export interface BarSpan {
  index: number
  start: number
  end: number
  numerator: number
  denominator: number
}

export function barSpans(times: TimePoint[], endBeat: number): BarSpan[] {
  const spans: BarSpan[] = []
  if (endBeat <= 0) return spans
  let beat = 0
  let ti = 0
  let index = 0
  while (beat < endBeat - 1e-6 && index < 2000) {
    while (ti + 1 < times.length && times[ti + 1].beat <= beat + 1e-6) ti += 1
    const sig = times[ti] ?? { beat: 0, numerator: 4, denominator: 4 }
    const len = barBeats(sig.numerator, sig.denominator)
    if (!(len > 0)) break
    spans.push({
      index,
      start: beat,
      end: beat + len,
      numerator: sig.numerator,
      denominator: sig.denominator,
    })
    beat += len
    index += 1
  }
  return spans
}

export function makeSections(times: TimePoint[], endBeat: number, group = 8): SongSection[] {
  const bars = barSpans(times, endBeat)
  const out: SongSection[] = []
  for (let i = 0; i < bars.length; i += group) {
    const slice = bars.slice(i, i + group)
    if (!slice.length) continue
    const from = slice[0].index + 1
    const to = slice[slice.length - 1].index + 1
    out.push({
      id: `bars-${from}`,
      name: from === to ? `Bar ${from}` : `Bars ${from}–${to}`,
      start: slice[0].start,
      end: slice[slice.length - 1].end,
    })
  }
  return out.length ? out : [{ id: 'all', name: 'Whole piece', start: 0, end: Math.max(endBeat, 1) }]
}

export function metaFromSong(song: Song): SongMeta {
  let lo = 127
  let hi = 0
  for (const n of song.notes) {
    lo = Math.min(lo, n.midi)
    hi = Math.max(hi, n.midi)
  }
  const end = songEnd(song.notes)
  const bars = barSpans(song.times, end).filter((b) => b.start < end - 1e-4).length
  const t = song.times[0] ?? { numerator: 4, denominator: 4, beat: 0 }
  return {
    id: song.id,
    title: song.title,
    composer: song.composer,
    description: song.description,
    difficulty: song.difficulty,
    attribution: song.attribution,
    license: song.license,
    practiceScale: song.practiceScale,
    bpm: song.bpm,
    fifths: song.fifths,
    minor: song.minor,
    time: [t.numerator, t.denominator],
    bars,
    notes: song.notes.length,
    range: song.notes.length ? [lo, hi] : [60, 60],
  }
}

export function assignIds(notes: Omit<SongNote, 'id'>[]): SongNote[] {
  return notes.map((n, i) => ({ ...n, id: `${n.hand}-${i}-${n.midi}-${n.start.toFixed(3)}` }))
}

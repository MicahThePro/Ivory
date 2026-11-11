import { spellMidi, type Hand } from './notes'
import { assignIds, makeSections, songEnd, type KeyPoint, type Song, type SongNote, type TempoPoint, type TimePoint } from './song'

export interface MidiNote {
  midi: number
  startTick: number
  endTick: number
  velocity: number
  track: number
}

export interface ParsedMidi {
  ppq: number
  notes: MidiNote[]
  tempos: { tick: number; bpm: number }[]
  times: { tick: number; numerator: number; denominator: number }[]
  keys: { tick: number; fifths: number; minor: boolean }[]
  trackNames: string[]
}

function readVlq(data: Uint8Array, pos: number): { value: number; pos: number } {
  let value = 0
  let guard = 0
  while (pos < data.length && guard < 5) {
    const b = data[pos++]
    value = (value << 7) | (b & 0x7f)
    if ((b & 0x80) === 0) return { value, pos }
    guard += 1
  }
  throw new Error('Broken variable-length number in MIDI file')
}

export function parseMidi(data: Uint8Array): ParsedMidi {
  if (data.length < 14 || String.fromCharCode(data[0], data[1], data[2], data[3]) !== 'MThd') {
    throw new Error('That file is not a Standard MIDI file.')
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const headerLen = view.getUint32(4)
  const format = view.getUint16(8)
  const nTracks = view.getUint16(10)
  const division = view.getUint16(12)
  if (format === 2) throw new Error('MIDI format 2 is not supported. Export format 0 or 1.')
  if (division & 0x8000) throw new Error('SMPTE MIDI timing is not supported.')
  const ppq = division
  let pos = 8 + headerLen
  const notes: MidiNote[] = []
  const tempos: { tick: number; bpm: number }[] = []
  const times: { tick: number; numerator: number; denominator: number }[] = []
  const keys: { tick: number; fifths: number; minor: boolean }[] = []
  const trackNames: string[] = []

  for (let tr = 0; tr < nTracks; tr++) {
    if (pos + 8 > data.length) break
    const tag = String.fromCharCode(data[pos], data[pos + 1], data[pos + 2], data[pos + 3])
    const len = view.getUint32(pos + 4)
    pos += 8
    if (tag !== 'MTrk') {
      pos += len
      continue
    }
    const end = pos + len
    let tick = 0
    let status = 0
    const open = new Map<number, { tick: number; velocity: number }[]>()
    let name = ''
    while (pos < end) {
      const delta = readVlq(data, pos)
      pos = delta.pos
      tick += delta.value
      if (pos >= end) break
      let byte = data[pos]
      if (byte >= 0x80) {
        status = byte
        pos += 1
      } else if (!status) {
        break
      }
      if (status === 0xff) {
        const type = data[pos++]
        const ln = readVlq(data, pos)
        pos = ln.pos
        const meta = data.subarray(pos, pos + ln.value)
        pos += ln.value
        if (type === 0x51 && meta.length === 3) {
          const mpq = (meta[0] << 16) | (meta[1] << 8) | meta[2]
          if (mpq > 0) tempos.push({ tick, bpm: 60_000_000 / mpq })
        } else if (type === 0x58 && meta.length >= 2) {
          times.push({ tick, numerator: meta[0], denominator: 2 ** meta[1] })
        } else if (type === 0x59 && meta.length >= 2) {
          const fifths = meta[0] < 128 ? meta[0] : meta[0] - 256
          keys.push({ tick, fifths, minor: meta[1] === 1 })
        } else if (type === 0x03) {
          name = new TextDecoder('latin1').decode(meta)
        }
        continue
      }
      if (status === 0xf0 || status === 0xf7) {
        const ln = readVlq(data, pos)
        pos = ln.pos + ln.value
        continue
      }
      const cmd = status & 0xf0
      const ch = status & 0x0f
      if (cmd === 0xc0 || cmd === 0xd0) {
        pos += 1
        continue
      }
      if (pos + 1 >= data.length) break
      const d1 = data[pos++]
      const d2 = data[pos++]
      if (ch === 9) continue
      if (cmd === 0x90 && d2 > 0) {
        const key = ch * 128 + d1
        const list = open.get(key) ?? []
        list.push({ tick, velocity: d2 })
        open.set(key, list)
      } else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) {
        const key = ch * 128 + d1
        const list = open.get(key)
        if (list?.length) {
          const started = list.shift()!
          if (tick > started.tick) {
            notes.push({
              midi: d1,
              startTick: started.tick,
              endTick: tick,
              velocity: started.velocity,
              track: tr,
            })
          }
        }
      }
    }
    trackNames[tr] = name
    pos = end
  }

  tempos.sort((a, b) => a.tick - b.tick)
  times.sort((a, b) => a.tick - b.tick)
  keys.sort((a, b) => a.tick - b.tick)
  if (!tempos.length) tempos.push({ tick: 0, bpm: 100 })
  if (!times.length) times.push({ tick: 0, numerator: 4, denominator: 4 })
  if (!keys.length) keys.push({ tick: 0, fifths: 0, minor: false })
  return { ppq, notes, tempos, times, keys, trackNames }
}

function classifyTrack(name: string): Hand | null {
  const n = name.toLowerCase()
  if (/(lower|\blh\b|left|bass|\bdown\b)/.test(n)) return 'left'
  if (/(upper|\brh\b|right|treble|\bup\b)/.test(n)) return 'right'
  if (/\bone\b/.test(n)) return 'right'
  if (/\btwo\b/.test(n)) return 'left'
  return null
}

const GRID = 48

function q(beats: number): number {
  return Math.round(beats * GRID) / GRID
}

export interface SongOverrides {
  id: string
  title: string
  composer: string
  description: string
  difficulty: Song['difficulty']
  attribution: string
  license: Song['license']
  practiceScale?: number
  fifths?: number
  minor?: boolean
  bpmOverride?: number
}

export function midiToSong(parsed: ParsedMidi, meta: SongOverrides): Song {
  const byTrack = new Map<number, MidiNote[]>()
  for (const note of parsed.notes) {
    const list = byTrack.get(note.track) ?? []
    list.push(note)
    byTrack.set(note.track, list)
  }
  const hands = new Map<number, Hand>()
  const averages: { track: number; avg: number }[] = []
  for (const [track, list] of byTrack) {
    const avg = list.reduce((s, n) => s + n.midi, 0) / list.length
    averages.push({ track, avg })
    const named = classifyTrack(parsed.trackNames[track] ?? '')
    if (named) hands.set(track, named)
  }
  averages.sort((a, b) => a.avg - b.avg)
  if (averages.length === 1 && !hands.has(averages[0].track)) {
    /* split per note later */
  } else {
    for (const row of averages) {
      if (!hands.has(row.track)) {
        const higher = row.avg >= (averages[0].avg + averages[averages.length - 1].avg) / 2
        hands.set(row.track, higher ? 'right' : 'left')
      }
    }
  }

  const scale = meta.bpmOverride ? meta.bpmOverride / parsed.tempos[0].bpm : 1
  const tempos: TempoPoint[] = parsed.tempos.map((t) => ({
    beat: q(t.tick / parsed.ppq),
    bpm: Math.round(t.bpm * scale * 100) / 100,
  }))
  const times: TimePoint[] = parsed.times.map((t) => ({
    beat: q(t.tick / parsed.ppq),
    numerator: t.numerator,
    denominator: t.denominator,
  }))
  const firstKey = parsed.keys[0]
  const fifths = meta.fifths ?? firstKey.fifths
  const minor = meta.minor ?? firstKey.minor
  const keys: KeyPoint[] = parsed.keys.map((k, i) => ({
    beat: q(k.tick / parsed.ppq),
    fifths: i === 0 ? fifths : k.fifths,
    minor: i === 0 ? minor : k.minor,
  }))

  const raw: Omit<SongNote, 'id'>[] = []
  const single = averages.length === 1
  for (const note of parsed.notes) {
    const start = q(note.startTick / parsed.ppq)
    let duration = q((note.endTick - note.startTick) / parsed.ppq)
    if (duration < 1 / 32) duration = 1 / 32
    let fifthsHere = keys[0].fifths
    for (const k of keys) {
      if (k.beat <= start + 1e-6) fifthsHere = k.fifths
      else break
    }
    const spelled = spellMidi(note.midi, fifthsHere)
    const hand: Hand = single ? (note.midi < 60 ? 'left' : 'right') : (hands.get(note.track) ?? 'right')
    raw.push({
      midi: note.midi,
      name: spelled.name,
      letter: spelled.letter,
      accidental: spelled.accidental,
      octave: spelled.octave,
      start,
      duration,
      hand,
    })
  }
  raw.sort((a, b) => a.start - b.start || a.midi - b.midi)
  const dedup: Omit<SongNote, 'id'>[] = []
  for (const n of raw) {
    const prev = dedup[dedup.length - 1]
    if (prev && prev.midi === n.midi && prev.hand === n.hand && Math.abs(prev.start - n.start) < 1e-4) {
      prev.duration = Math.max(prev.duration, n.duration)
      continue
    }
    dedup.push(n)
  }
  const notes = assignIds(dedup)
  const end = songEnd(notes)
  return {
    id: meta.id,
    title: meta.title,
    composer: meta.composer,
    description: meta.description,
    difficulty: meta.difficulty,
    bpm: tempos[0]?.bpm ?? 100,
    tempos,
    times,
    keys,
    fifths,
    minor,
    notes,
    sections: makeSections(times, end, 8),
    attribution: meta.attribution,
    license: meta.license,
    practiceScale: meta.practiceScale ?? 1,
  }
}

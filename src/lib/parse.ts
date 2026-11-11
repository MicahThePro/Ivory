import { parseSpelled, type Hand } from './notes'
import { assignIds, makeSections, songEnd, type Song, type SongNote } from './song'

export function parseDuration(token: string): number | null {
  const m = /^(\d+)(t)?(\.)?$/.exec(token)
  if (!m) return null
  const den = Number(m[1])
  if (!den) return null
  let beats = 4 / den
  if (m[2]) beats *= 2 / 3
  if (m[3]) beats *= 1.5
  return beats
}

/**
 * Compact score text.
 * `C4/4 D#4/8 E4/8 | C4&E4&G4/2. | R/4`
 * Durations are American note values: /4 quarter, /8 eighth, /2 half, /1 whole.
 * `t` is a triplet, `.` is a dot. `&` stacks a chord. `R` is a rest. `|` is ignored.
 */
export function parseSequence(spec: string, hand: Hand): Omit<SongNote, 'id'>[] {
  const notes: Omit<SongNote, 'id'>[] = []
  let beat = 0
  const tokens = spec.replace(/\|/g, ' ').split(/\s+/).filter(Boolean)
  for (const token of tokens) {
    const slash = token.lastIndexOf('/')
    if (slash <= 0) throw new Error(`Bad token "${token}"`)
    const dur = parseDuration(token.slice(slash + 1))
    if (dur == null) throw new Error(`Bad duration in "${token}"`)
    const head = token.slice(0, slash)
    if (head === 'R' || head === 'r') {
      beat += dur
      continue
    }
    const parts = head.split('&')
    for (const part of parts) {
      const spelled = parseSpelled(part)
      if (!spelled) throw new Error(`Bad pitch "${part}"`)
      notes.push({
        midi: spelled.midi,
        name: spelled.name,
        letter: spelled.letter,
        accidental: spelled.accidental,
        octave: spelled.octave,
        start: beat,
        duration: dur,
        hand,
      })
    }
    beat += dur
  }
  return notes
}

export function parseHands(spec: string): Omit<SongNote, 'id'>[] {
  const lines = spec
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
  const chunks: { hand: Hand; text: string }[] = []
  for (const line of lines) {
    const tagged = /^(RH|LH|right|left)\s*:\s*(.*)$/i.exec(line)
    if (tagged) {
      const hand: Hand = tagged[1].toLowerCase().startsWith('l') ? 'left' : 'right'
      chunks.push({ hand, text: tagged[2] })
    } else if (chunks.length) {
      chunks[chunks.length - 1].text += ' ' + line
    } else {
      chunks.push({ hand: 'right', text: line })
    }
  }
  return chunks.flatMap((c) => parseSequence(c.text, c.hand))
}

export interface BuiltSongInfo {
  id: string
  title: string
  composer: string
  description: string
  difficulty: Song['difficulty']
  bpm: number
  time: [number, number]
  fifths?: number
  minor?: boolean
  spec: string
  practiceScale?: number
  attribution?: string
}

export function buildSong(info: BuiltSongInfo): Song {
  const notes = assignIds(parseHands(info.spec).sort((a, b) => a.start - b.start || a.midi - b.midi))
  const times = [{ beat: 0, numerator: info.time[0], denominator: info.time[1] }]
  const fifths = info.fifths ?? 0
  const minor = info.minor ?? false
  const end = songEnd(notes)
  return {
    id: info.id,
    title: info.title,
    composer: info.composer,
    description: info.description,
    difficulty: info.difficulty,
    bpm: info.bpm,
    tempos: [{ beat: 0, bpm: info.bpm }],
    times,
    keys: [{ beat: 0, fifths, minor }],
    fifths,
    minor,
    notes,
    sections: makeSections(times, end, 4),
    attribution: info.attribution ?? 'Traditional melody, arranged for Ivory.',
    license: 'original',
    practiceScale: info.practiceScale ?? 1,
  }
}

import { spellMidi } from './notes'
import { bpmAt, timeAt, type Song, type SongNote, type TempoPoint } from './song'
import { gradeFor, starsForPerformance, starsForWait } from './grade'

export type PlayMode = 'wait' | 'perform' | 'listen'
export type HandFilter = 'left' | 'right' | 'both'
export type MatchMode = 'exact' | 'pitchClass'

export interface ActiveNote extends SongNote {
  status: 'pending' | 'hit' | 'miss'
  timing?: number
}

interface Group {
  id: string
  start: number
  notes: ActiveNote[]
}

export interface Feedback {
  kind: 'correct' | 'wrong' | 'partial' | 'miss'
  expected: { name: string; midi: number; id: string }[]
  played?: { name: string; midi: number }
  missing: string[]
}

export interface WrongEvent {
  beat: number
  midi: number
  name: string
}

export interface EngineSnapshot {
  beat: number
  running: boolean
  waiting: boolean
  mode: PlayMode
  hands: HandFilter
  combo: number
  bestCombo: number
  score: number
  hits: number
  misses: number
  wrongs: number
  done: boolean
  feedback: Feedback | null
  revision: number
  bpm: number
  tempoScale: number
  loop: { start: number; end: number } | null
  expectedIds: string[]
  guideNow: boolean
}

export interface Summary {
  mode: PlayMode
  accuracy: number
  grade: string
  stars: number
  hits: number
  misses: number
  wrongs: number
  combo: number
  score: number
  notes: ActiveNote[]
  wrongEvents: WrongEvent[]
  earlyStop: boolean
}

function pitchMatch(note: SongNote, midi: number, mode: MatchMode): boolean {
  if (mode === 'pitchClass') return ((note.midi % 12) + 12) % 12 === ((midi % 12) + 12) % 12
  return note.midi === midi
}

function groupNotes(notes: ActiveNote[], epsilon = 0.045): Group[] {
  const sorted = [...notes].sort((a, b) => a.start - b.start || a.midi - b.midi)
  const groups: Group[] = []
  for (const n of sorted) {
    const last = groups[groups.length - 1]
    if (last && Math.abs(n.start - last.start) <= epsilon) last.notes.push(n)
    else groups.push({ id: `g${groups.length}`, start: n.start, notes: [n] })
  }
  return groups
}

export class PracticeSession {
  notes: ActiveNote[]
  private groups: Group[] = []
  private groupIndex = 0
  private heard = new Set<string>()
  private all: ActiveNote[]
  beat = 0
  running = false
  waiting = false
  mode: PlayMode
  hands: HandFilter
  match: MatchMode
  tempoScale: number
  loop: { start: number; end: number } | null = null
  combo = 0
  bestCombo = 0
  score = 0
  hits = 0
  misses = 0
  wrongs = 0
  done = false
  feedback: Feedback | null = null
  revision = 0
  wrongEvents: WrongEvent[] = []
  readonly tempos: TempoPoint[]
  readonly song: Song
  private tailUntil = 0
  private prevBeat = 0
  private countIn = true
  guideArmed = false

  constructor(song: Song, opts?: { mode?: PlayMode; hands?: HandFilter; match?: MatchMode; tempo?: number }) {
    this.song = song
    this.tempos = song.tempos.length ? song.tempos : [{ beat: 0, bpm: song.bpm }]
    this.mode = opts?.mode ?? 'wait'
    this.hands = opts?.hands ?? 'both'
    this.match = opts?.match ?? 'exact'
    this.tempoScale = opts?.tempo ?? song.practiceScale ?? 1
    this.all = song.notes.map((n) => ({ ...n, status: 'pending' as const }))
    this.notes = []
    this.rebuild()
  }

  private rebuild(): void {
    this.notes = this.all.filter((n) => this.hands === 'both' || n.hand === this.hands)
    this.groups = groupNotes(this.notes)
    this.groupIndex = 0
    this.heard.clear()
  }

  private endBeat(): number {
    let end = 0
    for (const n of this.notes) end = Math.max(end, n.start + n.duration)
    return end
  }

  private barLen(beat = 0): number {
    const t = timeAt(this.song.times, Math.max(0, beat))
    return (t.numerator * 4) / t.denominator
  }

  currentBpm(): number {
    return bpmAt(this.tempos, Math.max(0, this.beat)) * this.tempoScale
  }

  private windowBeats(): number {
    const bpm = Math.max(30, this.currentBpm())
    const beats = (0.3 * bpm) / 60
    return Math.max(0.16, Math.min(0.7, beats))
  }

  private bump(extra = 1): void {
    this.revision += extra
  }

  start(from?: number): void {
    this.done = false
    this.running = true
    this.waiting = false
    this.combo = 0
    this.score = 0
    this.hits = 0
    this.misses = 0
    this.wrongs = 0
    this.bestCombo = 0
    this.feedback = null
    this.wrongEvents = []
    this.heard.clear()
    this.tailUntil = 0
    for (const n of this.all) {
      n.status = 'pending'
      n.timing = undefined
    }
    const origin = from ?? this.loop?.start ?? 0
    if (this.countIn && from == null) this.beat = origin - this.barLen(origin)
    else this.beat = origin
    this.prevBeat = this.beat
    this.groupIndex = this.groups.findIndex((g) => g.start >= origin - 1e-4)
    if (this.groupIndex < 0) this.groupIndex = this.groups.length
    this.guideArmed = false
    this.bump()
  }

  stop(): void {
    this.running = false
    this.waiting = false
    this.bump()
  }

  setMode(mode: PlayMode): void {
    this.mode = mode
    this.bump()
  }

  setTempo(scale: number): void {
    this.tempoScale = Math.max(0.35, Math.min(1.35, scale))
    this.bump()
  }

  setHands(hands: HandFilter): void {
    const beat = Math.max(0, this.beat)
    this.hands = hands
    this.rebuild()
    this.seek(beat, false)
  }

  setLoop(loop: { start: number; end: number } | null): void {
    this.loop = loop
    this.bump()
  }

  setMatch(match: MatchMode): void {
    this.match = match
  }

  seek(beat: number, countIn = false): void {
    this.done = false
    this.running = true
    this.waiting = false
    this.feedback = null
    this.heard.clear()
    this.tailUntil = 0
    this.guideArmed = false
    const origin = Math.max(0, beat)
    this.beat = countIn ? origin - this.barLen(origin) : origin
    this.prevBeat = this.beat
    for (const n of this.notes) {
      if (n.start < origin - 0.02) n.status = 'hit'
      else {
        n.status = 'pending'
        n.timing = undefined
      }
    }
    this.groupIndex = this.groups.findIndex((g) => g.start >= origin - 1e-3)
    if (this.groupIndex < 0) this.groupIndex = this.groups.length
    this.bump()
  }

  private currentGroup(): Group | null {
    return this.groups[this.groupIndex] ?? null
  }

  expected(): ActiveNote[] {
    if (this.mode !== 'wait' || !this.waiting) return []
    return this.currentGroup()?.notes ?? []
  }

  private nameFor(midi: number): string {
    return spellMidi(midi, this.song.fifths).name
  }

  private completeGroup(group: Group): void {
    for (const n of group.notes) {
      if (n.status === 'pending') {
        n.status = 'hit'
        this.hits += 1
      }
    }
    this.combo += 1
    this.bestCombo = Math.max(this.bestCombo, this.combo)
    this.score += 100 + this.combo * 8
    const missing: string[] = []
    this.feedback = {
      kind: 'correct',
      expected: group.notes.map((n) => ({ name: n.name, midi: n.midi, id: n.id })),
      missing,
    }
    this.heard.clear()
    this.groupIndex += 1
    this.waiting = false
    this.guideArmed = false
    this.beat = Math.max(this.beat, group.start + 0.0001)
    if (this.groupIndex >= this.groups.length) {
      const tail = Math.max(...group.notes.map((n) => n.duration))
      this.tailUntil = group.start + tail
    }
  }

  press(midi: number, atBeat = this.beat): Feedback | null {
    if (!this.running || this.done || this.mode === 'listen' || atBeat < -0.02) return null
    if (this.mode === 'wait') {
      if (!this.waiting) {
        const upcoming = this.currentGroup()
        if (!upcoming || upcoming.start - atBeat > 0.4) return null
        this.beat = upcoming.start
        this.waiting = true
      }
      const group = this.currentGroup()
      if (!group) return null
      const match = group.notes.find((n) => !this.heard.has(n.id) && n.status === 'pending' && pitchMatch(n, midi, this.match))
      if (!match) {
        this.combo = 0
        this.wrongs += 1
        this.score = Math.max(0, this.score - 15)
        this.wrongEvents.push({ beat: group.start, midi, name: this.nameFor(midi) })
        const missing = group.notes.filter((n) => !this.heard.has(n.id)).map((n) => n.name)
        this.feedback = {
          kind: 'wrong',
          expected: group.notes.map((n) => ({ name: n.name, midi: n.midi, id: n.id })),
          played: { name: this.nameFor(midi), midi },
          missing,
        }
        this.bump()
        return this.feedback
      }
      this.heard.add(match.id)
      if (group.notes.every((n) => this.heard.has(n.id))) {
        this.completeGroup(group)
      } else {
        const missing = group.notes.filter((n) => !this.heard.has(n.id)).map((n) => n.name)
        this.feedback = {
          kind: 'partial',
          expected: group.notes.map((n) => ({ name: n.name, midi: n.midi, id: n.id })),
          played: { name: match.name, midi: match.midi },
          missing,
        }
      }
      this.bump()
      return this.feedback
    }

    const window = this.windowBeats()
    const late = window * 1.55
    const candidates = this.notes.filter(
      (n) => n.status === 'pending' && pitchMatch(n, midi, this.match) && atBeat >= n.start - window && atBeat <= n.start + late,
    )
    if (!candidates.length) {
      this.combo = 0
      this.wrongs += 1
      this.score = Math.max(0, this.score - 10)
      this.wrongEvents.push({ beat: atBeat, midi, name: this.nameFor(midi) })
      const near = this.notes.filter((n) => n.status === 'pending' && Math.abs(n.start - atBeat) < 1)
      this.feedback = {
        kind: 'wrong',
        expected: near.slice(0, 4).map((n) => ({ name: n.name, midi: n.midi, id: n.id })),
        played: { name: this.nameFor(midi), midi },
        missing: near.slice(0, 4).map((n) => n.name),
      }
      this.bump()
      return this.feedback
    }
    candidates.sort((a, b) => Math.abs(a.start - atBeat) - Math.abs(b.start - atBeat))
    const hit = candidates[0]
    hit.status = 'hit'
    hit.timing = atBeat - hit.start
    this.hits += 1
    this.combo += 1
    this.bestCombo = Math.max(this.bestCombo, this.combo)
    const closeness = 1 - Math.min(1, Math.abs(hit.timing) / window)
    this.score += Math.round(80 + 40 * closeness + this.combo * 4)
    this.feedback = {
      kind: 'correct',
      expected: [{ name: hit.name, midi: hit.midi, id: hit.id }],
      played: { name: hit.name, midi: hit.midi },
      missing: [],
    }
    this.bump()
    return this.feedback
  }

  private expire(): void {
    if (this.mode !== 'perform') return
    const late = this.windowBeats() * 1.55
    let missed = false
    for (const n of this.notes) {
      if (n.status === 'pending' && this.beat > n.start + late) {
        n.status = 'miss'
        this.misses += 1
        this.combo = 0
        missed = true
      }
    }
    if (missed) {
      const fresh = this.notes.filter((n) => n.status === 'miss' && Math.abs(this.beat - (n.start + late)) < 0.2)
      if (fresh.length) {
        this.feedback = {
          kind: 'miss',
          expected: fresh.map((n) => ({ name: n.name, midi: n.midi, id: n.id })),
          missing: fresh.map((n) => n.name),
        }
      }
      this.bump()
    }
  }

  private finish(early = false): void {
    if (this.done) return
    this.done = true
    this.running = false
    this.waiting = false
    if (early) {
      for (const n of this.notes) {
        if (n.status === 'pending' && n.start <= this.beat) {
          n.status = 'miss'
          this.misses += 1
        }
      }
    }
    this.bump()
  }

  /** Call when the player stops a performance before the last bar. */
  finishEarly(): void {
    this.finish(true)
  }

  update(dt: number): void {
    if (!this.running || this.done) return
    const bpm = Math.max(20, this.currentBpm())
    const step = (bpm / 60) * dt
    this.prevBeat = this.beat

    if (this.mode === 'wait') {
      const group = this.currentGroup()
      if (!group) {
        if (this.beat < this.tailUntil) this.beat = Math.min(this.tailUntil, this.beat + step)
        else this.finish()
        return
      }
      if (this.beat < group.start - 1e-4) {
        this.waiting = false
        this.beat = Math.min(group.start, this.beat + step)
        if (this.beat >= group.start - 1e-4) {
          this.beat = group.start
          if (!this.waiting) this.guideArmed = true
          this.waiting = true
        }
      } else {
        if (!this.waiting) this.guideArmed = true
        this.waiting = true
        this.beat = group.start
      }
      return
    }

    this.beat += step
    this.expire()
    const loop = this.loop
    if (loop && this.beat >= loop.end) {
      const span = loop.end - loop.start
      this.beat = loop.start + (span > 0 ? (this.beat - loop.end) % span : 0)
      for (const n of this.notes) {
        if (n.start >= loop.start - 1e-4 && n.start < loop.end - 1e-4) {
          n.status = 'pending'
          n.timing = undefined
        }
      }
      this.bump()
      return
    }
    const end = this.endBeat()
    if (this.beat > end + this.barLen(end) * 0.35) this.finish()
  }

  /** Notes whose starts were crossed since the previous update. Used by Listen mode. */
  crossedSinceLast(): ActiveNote[] {
    if (this.mode === 'wait') return []
    const a = this.prevBeat
    const b = this.beat
    if (b < a) return this.notes.filter((n) => n.start >= b - 0.02 && n.start < b + 0.02)
    return this.notes.filter((n) => n.start >= a - 1e-4 && n.start < b - 1e-4 && n.start >= 0)
  }

  takeGuide(): ActiveNote[] | null {
    if (!this.guideArmed || !this.waiting) return null
    this.guideArmed = false
    return this.currentGroup()?.notes ?? null
  }

  snapshot(): EngineSnapshot {
    const expected = this.expected()
    return {
      beat: this.beat,
      running: this.running,
      waiting: this.waiting,
      mode: this.mode,
      hands: this.hands,
      combo: this.combo,
      bestCombo: this.bestCombo,
      score: this.score,
      hits: this.hits,
      misses: this.misses,
      wrongs: this.wrongs,
      done: this.done,
      feedback: this.feedback,
      revision: this.revision,
      bpm: this.currentBpm(),
      tempoScale: this.tempoScale,
      loop: this.loop,
      expectedIds: expected.map((n) => n.id),
      guideNow: this.guideArmed && this.waiting,
    }
  }

  summary(early = false): Summary {
    const judged = this.notes.filter((n) => n.status !== 'pending' || n.start <= this.beat + 0.01)
    const hits = this.notes.filter((n) => n.status === 'hit').length
    const misses = this.notes.filter((n) => n.status === 'miss').length
    const considered = this.mode === 'wait' ? hits : hits + misses
    const accuracy =
      this.mode === 'wait'
        ? hits + this.wrongs === 0
          ? 1
          : hits / (hits + this.wrongs)
        : considered === 0
          ? 0
          : hits / considered
    const stars = this.mode === 'wait' ? starsForWait(hits, this.wrongs) : starsForPerformance(accuracy)
    return {
      mode: this.mode,
      accuracy,
      grade: this.mode === 'listen' ? '—' : gradeFor(accuracy),
      stars,
      hits,
      misses,
      wrongs: this.wrongs,
      combo: this.bestCombo,
      score: this.score,
      notes: this.notes.map((n) => ({ ...n })),
      wrongEvents: [...this.wrongEvents],
      earlyStop: early || judged.length < this.notes.length,
    }
  }
}

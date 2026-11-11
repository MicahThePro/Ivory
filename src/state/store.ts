import { useSyncExternalStore } from 'react'
import { ACHIEVEMENTS } from '../data/achievements'
import { dayKey, levelForXp, previousDay, type LevelInfo } from '../lib/grade'
import type { Song } from '../lib/song'
import type { Summary } from '../lib/engine'
import { idbAll, idbDelete, idbPut } from './idb'

export interface Settings {
  volume: number
  a4: number
  gate: number
  latencyMs: number
  guide: boolean
  metronome: boolean
  octave: number
  input: 'auto' | 'mic' | 'midi' | 'keys'
}

export interface Progress {
  xp: number
  streak: number
  bestStreak: number
  lastDay: string
  lessons: Record<string, { done: boolean; wrong: number; at: string }>
  trainer: {
    level: number
    correct: number
    attempts: number
    bestStreak: number
    streak: number
    accidentals: number
    byNote: Record<string, { ok: number; bad: number }>
    recent: boolean[]
  }
  songs: Record<string, { stars: number; best: number; score: number; plays: number }>
  achievements: Record<string, string>
  stats: {
    notesHit: number
    wrong: number
    bestCombo: number
    todayKey: string
    todayHits: number
    pitches: string
    rhythmClears: number
    performances: number
  }
  settings: Settings
  userSongs: Song[]
  lastAward: { xp: number; at: number; label: string } | null
  toast: string | null
}

const KEY = 'ivory.progress.v1'
const emptyPitches = () => '0'.repeat(88)

function fresh(): Progress {
  return {
    xp: 0,
    streak: 0,
    bestStreak: 0,
    lastDay: '',
    lessons: {},
    trainer: {
      level: 1,
      correct: 0,
      attempts: 0,
      bestStreak: 0,
      streak: 0,
      accidentals: 0,
      byNote: {},
      recent: [],
    },
    songs: {},
    achievements: {},
    stats: {
      notesHit: 0,
      wrong: 0,
      bestCombo: 0,
      todayKey: dayKey(),
      todayHits: 0,
      pitches: emptyPitches(),
      rhythmClears: 0,
      performances: 0,
    },
    settings: {
      volume: 0.85,
      a4: 440,
      gate: 0.018,
      latencyMs: 80,
      guide: true,
      metronome: true,
      octave: 4,
      input: 'auto',
    },
    userSongs: [],
    lastAward: null,
    toast: null,
  }
}

function load(): Progress {
  const base = fresh()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<Progress>
    return {
      ...base,
      ...parsed,
      trainer: { ...base.trainer, ...parsed.trainer },
      stats: { ...base.stats, ...parsed.stats, pitches: parsed.stats?.pitches?.length === 88 ? parsed.stats.pitches : emptyPitches() },
      settings: { ...base.settings, ...parsed.settings },
      lessons: parsed.lessons ?? {},
      songs: parsed.songs ?? {},
      achievements: parsed.achievements ?? {},
      userSongs: Array.isArray(parsed.userSongs) ? parsed.userSongs : [],
      lastAward: null,
      toast: null,
    }
  } catch {
    return base
  }
}

let state: Progress = typeof localStorage === 'undefined' ? fresh() : load()
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

function persist(): void {
  const { lastAward, toast, userSongs, ...rest } = state
  void lastAward
  void toast
  void userSongs
  try {
    localStorage.setItem(KEY, JSON.stringify(rest))
  } catch {
    state = { ...state, toast: 'This browser blocked saving. Progress stays for this visit only.' }
  }
}

function set(patch: Partial<Progress> | ((prev: Progress) => Progress)): void {
  state = typeof patch === 'function' ? patch(state) : { ...state, ...patch }
  persist()
  emit()
}

function touchDay(prev: Progress): Pick<Progress, 'streak' | 'bestStreak' | 'lastDay' | 'stats'> {
  const today = dayKey()
  let streak = prev.streak
  if (prev.lastDay === today) {
    /* already counted */
  } else if (prev.lastDay === previousDay(today)) streak = prev.streak + 1
  else streak = 1
  const stats = prev.stats.todayKey === today ? prev.stats : { ...prev.stats, todayKey: today, todayHits: 0 }
  return { streak, bestStreak: Math.max(prev.bestStreak, streak), lastDay: today, stats }
}

function grant(prev: Progress, xp: number, label: string): Progress {
  const day = touchDay(prev)
  return {
    ...prev,
    ...day,
    xp: prev.xp + xp,
    lastAward: xp > 0 ? { xp, at: Date.now(), label } : prev.lastAward,
  }
}

function unlock(prev: Progress, id: string): Progress {
  if (prev.achievements[id]) return prev
  return {
    ...prev,
    achievements: { ...prev.achievements, [id]: new Date().toISOString() },
    toast: ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id,
    xp: prev.xp + 40,
  }
}

function markPitch(pitches: string, midi: number): string {
  const i = midi - 21
  if (i < 0 || i >= 88) return pitches
  if (pitches[i] === '1') return pitches
  return pitches.slice(0, i) + '1' + pitches.slice(i + 1)
}

function pitchCount(pitches: string): number {
  let n = 0
  for (const ch of pitches) if (ch === '1') n += 1
  return n
}

function evaluate(prev: Progress): Progress {
  let next = prev
  const done = (id: string) => Boolean(next.lessons[id]?.done)
  const give = (id: string, when: boolean) => {
    if (when) next = unlock(next, id)
  }
  give('middle-c', done('middle-c'))
  give('keyboard', done('white-keys'))
  give('both-clefs', done('treble-landmarks') && done('bass-landmarks'))
  give('in-time', next.stats.rhythmClears > 0)
  give('together', done('both-hands'))
  give('first-song', done('first-song'))
  give('reader-50', next.trainer.correct >= 50)
  give('reader-250', next.trainer.correct >= 250)
  give('sharp-eye', next.trainer.accidentals >= 20)
  give('streak-3', next.bestStreak >= 3)
  give('streak-7', next.bestStreak >= 7)
  give('combo-25', next.stats.bestCombo >= 25)
  give('combo-50', next.stats.bestCombo >= 50)
  give('three-stars', Object.values(next.songs).some((s) => s.stars >= 3))
  give('performer', next.stats.performances > 0)
  give('elise', (next.songs['fur-elise']?.plays ?? 0) > 0)
  give('moonlight', (next.songs['moonlight-1']?.plays ?? 0) > 0)
  give('upload', next.userSongs.length > 0)
  give('cartographer', pitchCount(next.stats.pitches) >= 30)
  give('extremes', next.stats.pitches.slice(0, 12).includes('1') && next.stats.pitches.slice(75).includes('1'))
  give('century', next.stats.notesHit >= 1000)
  give('first-note', next.stats.notesHit > 0 || pitchCount(next.stats.pitches) > 0)
  return next
}

export const progress = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  settings(patch: Partial<Settings>) {
    set((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  },
  dismissToast() {
    state = { ...state, toast: null }
    emit()
  },
  playPitch(midi: number) {
    set((prev) => {
      const pitches = markPitch(prev.stats.pitches, midi)
      return evaluate({ ...prev, stats: { ...prev.stats, pitches } })
    })
  },
  completeLesson(id: string, wrong: number, rhythm = false) {
    set((prev) => {
      if (prev.lessons[id]?.done) return prev
      const xp = 140 + Math.max(0, 50 - wrong * 8)
      let next = grant(prev, xp, 'Lesson')
      next = {
        ...next,
        lessons: { ...next.lessons, [id]: { done: true, wrong, at: new Date().toISOString() } },
        stats: {
          ...next.stats,
          rhythmClears: next.stats.rhythmClears + (rhythm ? 1 : 0),
          notesHit: next.stats.notesHit,
        },
      }
      return evaluate(next)
    })
  },
  addHits(count: number, wrong: number, combo: number) {
    set((prev) => {
      const day = touchDay(prev)
      const todayHits = day.stats.todayHits + count
      return evaluate({
        ...prev,
        ...day,
        stats: {
          ...day.stats,
          notesHit: prev.stats.notesHit + count,
          wrong: prev.stats.wrong + wrong,
          bestCombo: Math.max(prev.stats.bestCombo, combo),
          todayHits,
        },
      })
    })
  },
  trainerAnswer(midi: number, ok: boolean, accidental: boolean) {
    set((prev) => {
      const key = String(midi)
      const row = prev.trainer.byNote[key] ?? { ok: 0, bad: 0 }
      const streak = ok ? prev.trainer.streak + 1 : 0
      const recent = [...prev.trainer.recent, ok].slice(-20)
      let level = prev.trainer.level
      const atLevel = recent.filter(Boolean).length
      if (level < 8 && recent.length >= 16 && atLevel >= 15) level += 1
      const xp = ok ? 5 + Math.min(10, Math.floor(streak / 5)) : 0
      let next = grant(prev, xp, 'Reading')
      next = {
        ...next,
        trainer: {
          ...next.trainer,
          level,
          correct: next.trainer.correct + (ok ? 1 : 0),
          attempts: next.trainer.attempts + 1,
          streak,
          bestStreak: Math.max(next.trainer.bestStreak, streak),
          accidentals: next.trainer.accidentals + (ok && accidental ? 1 : 0),
          byNote: { ...next.trainer.byNote, [key]: { ok: row.ok + (ok ? 1 : 0), bad: row.bad + (ok ? 0 : 1) } },
          recent: level === prev.trainer.level ? recent : [],
        },
        stats: {
          ...next.stats,
          notesHit: next.stats.notesHit + (ok ? 1 : 0),
          wrong: next.stats.wrong + (ok ? 0 : 1),
          bestCombo: Math.max(next.stats.bestCombo, streak),
          todayHits: next.stats.todayHits + (ok ? 1 : 0),
          pitches: markPitch(next.stats.pitches, midi),
        },
      }
      return evaluate(next)
    })
  },
  songResult(song: Song, summary: Summary) {
    set((prev) => {
      const already = (prev.songs[song.id]?.plays ?? 0) > 0
      const full =
        summary.mode === 'listen'
          ? 15
          : summary.mode === 'wait'
            ? 90 + summary.stars * 40
            : Math.round(summary.accuracy * 180) + summary.stars * 35
      const xp = already ? Math.min(25, full) : full
      let next = grant(prev, xp, song.title)
      const prevSong = next.songs[song.id] ?? { stars: 0, best: 0, score: 0, plays: 0 }
      const played = summary.mode !== 'listen'
      next = {
        ...next,
        songs: {
          ...next.songs,
          [song.id]: {
            stars: Math.max(prevSong.stars, summary.stars),
            best: Math.max(prevSong.best, summary.accuracy),
            score: Math.max(prevSong.score, summary.score),
            plays: prevSong.plays + (played ? 1 : 0),
          },
        },
        stats: {
          ...next.stats,
          notesHit: next.stats.notesHit + summary.hits,
          wrong: next.stats.wrong + summary.wrongs,
          bestCombo: Math.max(next.stats.bestCombo, summary.combo),
          todayHits: next.stats.todayHits + summary.hits,
          performances: next.stats.performances + (summary.mode === 'perform' && summary.accuracy >= 0.8 ? 1 : 0),
        },
      }
      return evaluate(next)
    })
  },
  addUserSong(song: Song) {
    void idbPut(song).catch(() => {
      state = { ...state, toast: 'Could not store that MIDI in this browser.' }
      emit()
    })
    set((prev) => evaluate({ ...prev, userSongs: [song, ...prev.userSongs.filter((s) => s.id !== song.id)].slice(0, 24) }))
  },
  removeUserSong(id: string) {
    void idbDelete(id)
    set((prev) => ({ ...prev, userSongs: prev.userSongs.filter((s) => s.id !== id) }))
  },
  async hydrate() {
    try {
      const stored = await idbAll()
      const legacy = state.userSongs
      const merged = [...stored]
      for (const song of legacy) {
        if (!merged.some((s) => s.id === song.id)) {
          await idbPut(song)
          merged.push(song)
        }
      }
      state = { ...state, userSongs: merged }
      persist()
      emit()
    } catch {
      /* private mode can block IndexedDB; memory still works for the visit */
    }
  },
}

export function useProgress(): Progress {
  return useSyncExternalStore(progress.subscribe, progress.get, progress.get)
}

export function useLevel(): LevelInfo {
  const xp = useProgress().xp
  return levelForXp(xp)
}

import { describe, expect, it } from 'vitest'
import { LESSONS } from './lessons'
import { buildSong } from '../lib/parse'
import { barBeats } from '../lib/notes'

describe('lesson scores', () => {
  it('parses every exercise into complete bars', () => {
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) {
        if (step.kind !== 'play') continue
        const song = buildSong({
          id: lesson.id,
          title: step.title,
          composer: 'Lesson',
          description: step.prompt,
          difficulty: 'beginner',
          bpm: step.bpm,
          time: step.time,
          fifths: step.fifths,
          minor: step.minor,
          spec: step.spec,
        })
        expect(song.notes.length, lesson.id).toBeGreaterThan(0)
        const bar = barBeats(step.time[0], step.time[1])
        for (const hand of ['left', 'right'] as const) {
          const notes = song.notes.filter((n) => n.hand === hand)
          if (!notes.length) continue
          const end = Math.max(...notes.map((n) => n.start + n.duration))
          expect(end % bar, `${lesson.id} ${hand}`).toBeCloseTo(0, 5)
        }
      }
    }
  })
})

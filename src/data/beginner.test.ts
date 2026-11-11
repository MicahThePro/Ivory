import { describe, expect, it } from 'vitest'
import { barBeats } from '../lib/notes'
import { BEGINNER_SONGS } from './beginner'

describe('beginner library', () => {
  it('fills complete bars in both hands', () => {
    for (const song of BEGINNER_SONGS) {
      const sig = song.times[0]
      const bar = barBeats(sig.numerator, sig.denominator)
      for (const hand of ['left', 'right'] as const) {
        const notes = song.notes.filter((n) => n.hand === hand)
        expect(notes.length, song.id + hand).toBeGreaterThan(0)
        const end = Math.max(...notes.map((n) => n.start + n.duration))
        expect(end % bar, `${song.id} ${hand} ends at ${end}`).toBeCloseTo(0, 5)
      }
      expect(new Set(song.notes.map((n) => n.id)).size).toBe(song.notes.length)
    }
  })
})

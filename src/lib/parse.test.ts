import { describe, expect, it } from 'vitest'
import { buildSong, parseDuration, parseHands, parseSequence } from './parse'
import { barBeats } from './notes'

describe('score text', () => {
  it('reads durations, dots, triplets, rests, and chords', () => {
    expect(parseDuration('4')).toBe(1)
    expect(parseDuration('8')).toBe(0.5)
    expect(parseDuration('2.')).toBe(3)
    expect(parseDuration('8t')).toBeCloseTo(1 / 3, 5)
    const notes = parseSequence('C4/4 D#4/8 R/8 C4&E4&G4/2', 'right')
    expect(notes.map((n) => n.name)).toEqual(['C4', 'D#4', 'C4', 'E4', 'G4'])
    expect(notes[1].midi).toBe(63)
    expect(notes[1].accidental).toBe(1)
    expect(notes[1].start).toBeCloseTo(1)
    expect(notes[2].start).toBeCloseTo(2)
    expect(notes[4].duration).toBe(2)
  })

  it('keeps flat spelling distinct from sharps', () => {
    const notes = parseSequence('Bb4/4 A#4/4', 'left')
    expect(notes[0].name).toBe('Bb4')
    expect(notes[1].name).toBe('A#4')
    expect(notes[0].midi).toBe(notes[1].midi)
    expect(notes[0].letter).not.toBe(notes[1].letter)
  })

  it('aligns both hands and fills whole bars', () => {
    const song = buildSong({
      id: 'tiny',
      title: 'Tiny',
      composer: 'Test',
      description: '',
      difficulty: 'beginner',
      bpm: 90,
      time: [4, 4],
      spec: 'RH: C4/4 E4/4 G4/2\nLH: C3/2 G3/2',
    })
    const bar = barBeats(4, 4)
    const end = Math.max(...song.notes.map((n) => n.start + n.duration))
    expect(end % bar).toBeCloseTo(0, 5)
    expect(song.notes.filter((n) => n.hand === 'left')).toHaveLength(2)
    expect(parseHands('RH: C4/4').length).toBe(1)
  })
})

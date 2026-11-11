import { describe, expect, it } from 'vitest'
import { PracticeSession } from './engine'
import { buildSong } from './parse'

function tune() {
  return buildSong({
    id: 'tune',
    title: 'Tune',
    composer: 'Test',
    description: '',
    difficulty: 'beginner',
    bpm: 120,
    time: [4, 4],
    spec: 'RH: C4/4 E4/4 G4/2\nLH: C3&E3&G3/1',
  })
}

describe('wait mode', () => {
  it('holds the playhead until the right note, and shows what was wrong', () => {
    const session = new PracticeSession(tune(), { mode: 'wait', hands: 'right' })
    session.start()
    session.update(2)
    expect(session.waiting).toBe(true)
    expect(session.beat).toBeCloseTo(0, 3)
    const wrong = session.press(62)
    expect(wrong?.kind).toBe('wrong')
    expect(wrong?.expected[0].name).toBe('C4')
    expect(wrong?.played?.name).toBe('D4')
    expect(session.beat).toBeCloseTo(0, 3)
    session.press(60)
    expect(session.hits).toBe(1)
    session.update(0.6)
    expect(session.waiting).toBe(true)
    expect(session.expected()[0].name).toBe('E4')
  })

  it('waits for every note of a chord', () => {
    const session = new PracticeSession(tune(), { mode: 'wait', hands: 'left' })
    session.start()
    session.update(2)
    session.press(48)
    expect(session.feedback?.kind).toBe('partial')
    expect(session.hits).toBe(0)
    session.press(52)
    session.press(55)
    expect(session.hits).toBe(3)
    expect(session.feedback?.kind).toBe('correct')
  })
})

describe('performance mode', () => {
  it('hits inside the window and misses notes that pass', () => {
    const session = new PracticeSession(tune(), { mode: 'perform', hands: 'right', tempo: 1 })
    session.start()
    // Count-in is one bar at 120 bpm = 2 seconds. Land just after the first note.
    session.update(2.05)
    session.press(60)
    expect(session.hits).toBe(1)
    session.update(3)
    expect(session.misses).toBeGreaterThan(0)
    const summary = session.summary()
    expect(summary.hits).toBe(1)
    expect(summary.accuracy).toBeLessThan(1)
  })
})

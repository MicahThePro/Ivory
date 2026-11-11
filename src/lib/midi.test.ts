import { describe, expect, it } from 'vitest'
import { midiToSong, parseMidi } from './midi'

function vlq(n: number): number[] {
  const bytes: number[] = []
  bytes.push(n & 0x7f)
  let value = n >> 7
  while (value > 0) {
    bytes.push((value & 0x7f) | 0x80)
    value >>= 7
  }
  return bytes.reverse()
}

function track(events: number[]): Uint8Array {
  const body = new Uint8Array(events)
  const out = new Uint8Array(8 + body.length)
  out.set([0x4d, 0x54, 0x72, 0x6b], 0)
  new DataView(out.buffer).setUint32(4, body.length)
  out.set(body, 8)
  return out
}

describe('midi parser', () => {
  it('reads tempo, a note, and running status', () => {
    const events = [
      ...vlq(0), 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20,
      ...vlq(0), 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08,
      ...vlq(0), 0x90, 0x3c, 0x64,
      ...vlq(480), 0x3c, 0x00,
      ...vlq(0), 0x40, 0x70,
      ...vlq(480), 0x80, 0x40, 0x00,
      ...vlq(0), 0xff, 0x2f, 0x00,
    ]
    const body = track(events)
    const file = new Uint8Array(14 + body.length)
    file.set([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0], 0)
    file.set(body, 14)
    const parsed = parseMidi(file)
    expect(parsed.ppq).toBe(480)
    expect(parsed.tempos[0].bpm).toBeCloseTo(120, 3)
    expect(parsed.times[0]).toMatchObject({ numerator: 4, denominator: 4 })
    expect(parsed.notes).toHaveLength(2)
    expect(parsed.notes[0].midi).toBe(60)
    expect(parsed.notes[0].endTick - parsed.notes[0].startTick).toBe(480)
    expect(parsed.notes[1].midi).toBe(64)

    const song = midiToSong(parsed, {
      id: 'mini',
      title: 'Mini',
      composer: 'Test',
      description: '',
      difficulty: 'beginner',
      attribution: 'test',
      license: 'original',
    })
    expect(song.notes[0].name).toBe('C4')
    expect(song.notes[1].name).toBe('E4')
    expect(song.sections.length).toBeGreaterThan(0)
  })
})

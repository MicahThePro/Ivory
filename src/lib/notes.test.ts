import { describe, expect, it } from 'vitest'
import { KEY_COUNT, KEYBOARD, buildKeyboard, centsOff, freqToMidi, isBlack, keyName, midiToFreq, spellMidi, stepFromC4 } from './notes'

describe('notes', () => {
  it('covers the 88 keys from A0 to C8', () => {
    expect(KEY_COUNT).toBe(88)
    expect(KEYBOARD.whiteCount).toBe(52)
    expect(KEYBOARD.keys[0].midi).toBe(21)
    expect(KEYBOARD.keys.at(-1)?.midi).toBe(108)
    expect(KEYBOARD.keys.filter((k) => k.black)).toHaveLength(36)
  })

  it('places black keys on the boundary between white keys', () => {
    const cSharp = KEYBOARD.keys.find((k) => k.midi === 61)!
    const c = KEYBOARD.keys.find((k) => k.midi === 60)!
    const d = KEYBOARD.keys.find((k) => k.midi === 62)!
    expect(cSharp.black).toBe(true)
    expect(cSharp.center).toBe(d.left)
    expect(cSharp.center).toBe(c.left + 1)
    expect(isBlack(60)).toBe(false)
    expect(isBlack(61)).toBe(true)
  })

  it('spells middle C, sharps, and flats', () => {
    expect(spellMidi(60, 0).name).toBe('C4')
    expect(spellMidi(66, 0).name).toBe('F#4')
    expect(spellMidi(70, -1).name).toBe('Bb4')
    expect(spellMidi(61, -1).name).toBe('Db4')
    expect(spellMidi(61, 1).name).toBe('C#4')
    expect(midiToFreq(69)).toBeCloseTo(440, 5)
    expect(Math.round(freqToMidi(440))).toBe(69)
    expect(Math.abs(centsOff(440, 69))).toBeLessThan(0.01)
  })

  it('puts notes on the right staff steps', () => {
    expect(stepFromC4('C', 4)).toBe(0)
    expect(stepFromC4('G', 4)).toBe(4)
    expect(stepFromC4('E', 4)).toBe(2)
    expect(stepFromC4('A', 3)).toBe(-2)
    expect(stepFromC4('F', 5)).toBe(10)
    expect(keyName(0, false)).toBe('C major')
    expect(keyName(4, true)).toBe('C# minor')
    expect(keyName(-5, false)).toBe('Db major')
  })

  it('builds a fresh keyboard with 88 keys', () => {
    expect(buildKeyboard().keys).toHaveLength(88)
  })
})

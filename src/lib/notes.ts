/** Pitch, spelling, and 88-key geometry. A0 is MIDI 21, C8 is MIDI 108. */

export const MIDI_LO = 21
export const MIDI_HI = 108
export const KEY_COUNT = MIDI_HI - MIDI_LO + 1

export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'
export type Hand = 'left' | 'right'

const LETTERS: Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const NATURAL = [0, 2, 4, 5, 7, 9, 11]
const STEP: Record<Letter, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 }

export interface Spelling {
  midi: number
  letter: Letter
  accidental: number
  octave: number
  name: string
}

export function isBlack(midi: number): boolean {
  const pc = ((midi % 12) + 12) % 12
  return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10
}

export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * 2 ** ((midi - 69) / 12)
}

export function freqToMidi(freq: number, a4 = 440): number {
  return 69 + 12 * Math.log2(freq / a4)
}

export function centsOff(freq: number, midi: number, a4 = 440): number {
  return 1200 * Math.log2(freq / midiToFreq(midi, a4))
}

/** Accidentals implied by a key signature, indexed C D E F G A B. */
export function keyAccidentals(fifths: number): number[] {
  const acc = [0, 0, 0, 0, 0, 0, 0]
  const sharpOrder = [3, 0, 4, 1, 5, 2, 6]
  const flatOrder = [6, 2, 5, 1, 4, 0, 3]
  const n = Math.max(-7, Math.min(7, fifths))
  if (n > 0) for (let i = 0; i < n; i++) acc[sharpOrder[i]] = 1
  if (n < 0) for (let i = 0; i < -n; i++) acc[flatOrder[i]] = -1
  return acc
}

function finish(midi: number, letter: Letter, accidental: number): Spelling {
  const octave = Math.floor((midi - accidental) / 12) - 1
  const mark = accidental === 1 ? '#' : accidental === -1 ? 'b' : accidental === 2 ? '##' : accidental === -2 ? 'bb' : ''
  return { midi, letter, accidental, octave, name: `${letter}${mark}${octave}` }
}

/** Spell a MIDI note the way the key signature would. */
export function spellMidi(midi: number, fifths = 0): Spelling {
  const pc = ((midi % 12) + 12) % 12
  const acc = keyAccidentals(fifths)
  for (let i = 0; i < 7; i++) {
    if ((NATURAL[i] + acc[i] + 12) % 12 === pc) return finish(midi, LETTERS[i], acc[i])
  }
  const preferSharp = fifths >= 0
  if (preferSharp) {
    for (let i = 0; i < 7; i++) {
      if ((NATURAL[i] + 1) % 12 === pc) return finish(midi, LETTERS[i], 1)
    }
  } else {
    for (let i = 0; i < 7; i++) {
      if ((NATURAL[i] + 11) % 12 === pc) return finish(midi, LETTERS[i], -1)
    }
  }
  const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const token = sharpNames[pc]
  const letter = token[0] as Letter
  return finish(midi, letter, token.length > 1 ? 1 : 0)
}

export function parseSpelled(token: string): Spelling | null {
  const m = /^([A-Ga-g])(#{1,2}|b{1,2})?(-?\d)$/.exec(token.trim())
  if (!m) return null
  const letter = m[1].toUpperCase() as Letter
  const marks = m[2] ?? ''
  const accidental = marks.startsWith('#') ? marks.length : marks.startsWith('b') ? -marks.length : 0
  const octave = Number(m[3])
  const midi = (octave + 1) * 12 + NATURAL[LETTERS.indexOf(letter)] + accidental
  if (midi < 0 || midi > 127) return null
  return finish(midi, letter, accidental)
}

/** Diatonic steps above middle C. Accidentals do not change the staff step. */
export function stepFromC4(letter: Letter, octave: number): number {
  return (octave - 4) * 7 + STEP[letter]
}

export function keyName(fifths: number, minor = false): string {
  const majors = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#']
  const minors = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#']
  const flatMaj = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']
  const flatMin = ['A', 'D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab']
  const n = Math.max(-7, Math.min(7, fifths))
  const word = n >= 0 ? (minor ? minors[n] : majors[n]) : minor ? flatMin[-n] : flatMaj[-n]
  return `${word} ${minor ? 'minor' : 'major'}`
}

export interface KeyGeom {
  midi: number
  black: boolean
  /** Left edge, in white-key widths. Black keys use the boundary they sit on. */
  left: number
  center: number
}

export function buildKeyboard(): { keys: KeyGeom[]; whiteCount: number } {
  const keys: KeyGeom[] = []
  let white = 0
  for (let midi = MIDI_LO; midi <= MIDI_HI; midi++) {
    if (!isBlack(midi)) {
      keys.push({ midi, black: false, left: white, center: white + 0.5 })
      white += 1
    } else {
      keys.push({ midi, black: true, left: white, center: white })
    }
  }
  return { keys, whiteCount: white }
}

export const KEYBOARD = buildKeyboard()

export function keyBox(key: KeyGeom, whiteW: number): { x: number; w: number; h: number; y: number; keyH: number } {
  const keyH = whiteW * 4.15
  if (!key.black) return { x: key.left * whiteW, w: whiteW - 1, h: keyH, y: 0, keyH }
  const w = whiteW * 0.58
  return { x: key.center * whiteW - w / 2, w, h: keyH * 0.62, y: 0, keyH }
}

export function accidentalKind(accidental: number): 'natural' | 'sharp' | 'flat' {
  if (accidental > 0) return 'sharp'
  if (accidental < 0) return 'flat'
  return 'natural'
}

export function barBeats(numerator: number, denominator: number): number {
  return (numerator * 4) / denominator
}

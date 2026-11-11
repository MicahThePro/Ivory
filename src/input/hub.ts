import { MicInput } from '../audio/mic'
import type { FrameAnalysis } from '../lib/pitch'

export type InputSource = 'mic' | 'midi' | 'keys' | 'pointer'

export interface NoteEvent {
  type: 'on' | 'off'
  midi: number
  velocity: number
  source: InputSource
}

const WHITE = 'asdfghjkl;'
const WHITE_OFF = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16]
const BLACK: Record<string, number> = { w: 1, e: 3, t: 6, y: 8, u: 10, o: 13, p: 15 }

export class InputHub {
  private listeners = new Set<(e: NoteEvent) => void>()
  private held = new Set<string>()
  private keyDown = new Set<string>()
  private mic = new MicInput()
  private midiAccess: MIDIAccess | null = null
  private attached = false
  octave = 4
  enabled = true
  micFrame: { analysis: FrameAnalysis; heard: number[]; device: string } | null = null
  midiInputs: string[] = []
  onMicChange: (() => void) | null = null

  constructor() {
    this.mic.onNote = (type, midi) => this.emit(type, midi, 0.7, 'mic')
    this.mic.onFrame = (frame) => {
      this.micFrame = frame
      this.onMicChange?.()
    }
  }

  subscribe(listener: (e: NoteEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  attachKeyboard(): void {
    if (this.attached || typeof window === 'undefined') return
    this.attached = true
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  detachKeyboard(): void {
    if (!this.attached) return
    this.attached = false
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.enabled) return
    const target = event.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
    if (event.repeat) return
    if (event.key === 'z' || event.key === 'Z') {
      this.octave = Math.max(1, this.octave - 1)
      return
    }
    if (event.key === 'x' || event.key === 'X') {
      this.octave = Math.min(7, this.octave + 1)
      return
    }
    const midi = this.keyToMidi(event.key)
    if (midi == null || this.keyDown.has(event.key)) return
    this.keyDown.add(event.key)
    event.preventDefault()
    this.emit('on', midi, 0.8, 'keys')
  }

  private onKeyUp = (event: KeyboardEvent) => {
    const midi = this.keyToMidi(event.key)
    this.keyDown.delete(event.key)
    if (midi == null) return
    this.emit('off', midi, 0, 'keys')
  }

  keyToMidi(key: string): number | null {
    const k = key.length === 1 ? key.toLowerCase() : key
    const base = (this.octave + 1) * 12
    const white = WHITE.indexOf(k)
    if (white >= 0) return base + WHITE_OFF[white]
    if (k in BLACK) return base + BLACK[k]
    return null
  }

  pointer(down: boolean, midi: number, velocity = 0.86): void {
    this.emit(down ? 'on' : 'off', midi, velocity, 'pointer')
  }

  private emit(type: 'on' | 'off', midi: number, velocity: number, source: InputSource): void {
    if (midi < 0 || midi > 127) return
    const id = `${source}:${midi}`
    if (type === 'on') {
      if (this.held.has(id)) return
      this.held.add(id)
    } else if (!this.held.delete(id)) return
    const event = { type, midi, velocity, source }
    this.listeners.forEach((l) => l(event))
  }

  async startMic(): Promise<void> {
    await this.mic.start()
    this.onMicChange?.()
  }

  stopMic(): void {
    this.mic.stop()
    this.micFrame = null
    this.onMicChange?.()
  }

  get micOn(): boolean {
    return this.mic.running
  }

  setMicTuning(a4: number, gate: number): void {
    this.mic.a4 = a4
    this.mic.gate = gate
  }

  async startMidi(): Promise<string[]> {
    if (!navigator.requestMIDIAccess) throw new Error('This browser does not expose Web MIDI.')
    const access = await navigator.requestMIDIAccess()
    this.midiAccess = access
    void this.midiAccess
    const hook = (input: MIDIInput) => {
      input.onmidimessage = (msg) => {
        const data = msg.data
        if (!data || data.length < 3) return
        const cmd = data[0] & 0xf0
        const note = data[1]
        const vel = data[2]
        if (cmd === 0x90 && vel > 0) this.emit('on', note, vel / 127, 'midi')
        else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) this.emit('off', note, 0, 'midi')
      }
    }
    access.inputs.forEach(hook)
    access.onstatechange = () => {
      this.midiInputs = [...access.inputs.values()].map((i) => i.name || 'MIDI input')
      access.inputs.forEach(hook)
      this.onMicChange?.()
    }
    this.midiInputs = [...access.inputs.values()].map((i) => i.name || 'MIDI input')
    return this.midiInputs
  }
}

export const KEY_LEGEND = [
  { keys: 'A S D F G H J K L ;', notes: 'C D E F G A B C D E' },
  { keys: 'W E   T Y U   O P', notes: 'C# D#   F# G# A#   C# D#' },
  { keys: 'Z / X', notes: 'octave down / up' },
]

export const inputHub = new InputHub()

import { midiToFreq } from '../lib/notes'

const SAMPLES: [string, number][] = [
  ['A0', 21], ['C1', 24], ['Ds1', 27], ['Fs1', 30], ['A1', 33],
  ['C2', 36], ['Ds2', 39], ['Fs2', 42], ['A2', 45], ['C3', 48],
  ['Ds3', 51], ['Fs3', 54], ['A3', 57], ['C4', 60], ['Ds4', 63],
  ['Fs4', 66], ['A4', 69], ['C5', 72], ['Ds5', 75], ['Fs5', 78],
  ['A5', 81], ['C6', 84], ['Ds6', 87], ['Fs6', 90], ['A6', 93],
  ['C7', 96], ['Ds7', 99], ['Fs7', 102], ['A7', 105], ['C8', 108],
]

interface Voice {
  midi: number
  gain: GainNode
  stopAt: (time: number) => void
  started: number
}

/**
 * Sampled grand piano (Salamander) with an additive fallback so the first
 * note never waits on the network. Samples are pitched at most a minor third.
 */
export class Piano {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private buffers = new Map<number, AudioBuffer>()
  private loading = false
  private voices: Voice[] = []
  private noise: AudioBuffer | null = null
  volume = 0.9
  ready = false

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx
    const ctx = new AudioContext()
    const master = ctx.createGain()
    master.gain.value = this.volume
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.knee.value = 20
    comp.ratio.value = 3.2
    comp.attack.value = 0.004
    comp.release.value = 0.18
    const dry = ctx.createGain()
    dry.gain.value = 0.86
    const wet = ctx.createGain()
    wet.gain.value = 0.22
    const conv = ctx.createConvolver()
    conv.buffer = this.impulse(ctx)
    master.connect(dry)
    master.connect(conv)
    conv.connect(wet)
    dry.connect(comp)
    wet.connect(comp)
    comp.connect(ctx.destination)
    this.ctx = ctx
    this.master = master
    void dry
    const n = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate)
    const d = n.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    this.noise = n
    return ctx
  }

  private impulse(ctx: AudioContext): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * 1.5)
    const buffer = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c)
      for (let i = 0; i < len; i++) {
        const env = (1 - i / len) ** 2.6
        data[i] = (Math.random() * 2 - 1) * env
      }
    }
    return buffer
  }

  resume(): void {
    const ctx = this.ensure()
    if (ctx.state !== 'running') void ctx.resume()
    if (!this.loading) void this.load()
  }

  setVolume(value: number): void {
    this.volume = value
    if (this.master) this.master.gain.value = value
  }

  private async load(): Promise<void> {
    this.loading = true
    const ctx = this.ensure()
    const base = import.meta.env.BASE_URL + 'samples/'
    const order = [...SAMPLES].sort((a, b) => Math.abs(a[1] - 60) - Math.abs(b[1] - 60))
    await Promise.all(
      order.map(async ([name, midi]) => {
        try {
          const res = await fetch(base + name + '.mp3')
          if (!res.ok) return
          const audio = await ctx.decodeAudioData(await res.arrayBuffer())
          this.buffers.set(midi, audio)
          this.ready = true
        } catch {
          /* synth keeps covering this note */
        }
      }),
    )
  }

  private nearest(midi: number): { midi: number; buffer: AudioBuffer } | null {
    let best: { midi: number; buffer: AudioBuffer } | null = null
    let dist = 99
    for (const [sample, buffer] of this.buffers) {
      const d = Math.abs(sample - midi)
      if (d < dist) {
        dist = d
        best = { midi: sample, buffer }
      }
    }
    return dist <= 3 ? best : null
  }

  play(midi: number, velocity = 0.8, when?: number): void {
    const ctx = this.ensure()
    const time = Math.max(ctx.currentTime, when ?? ctx.currentTime)
    const vel = Math.max(0.05, Math.min(1, velocity))
    this.release(midi, time)
    const sample = this.nearest(midi)
    if (sample) this.playSample(midi, vel, time, sample.buffer, sample.midi)
    else this.playSynth(midi, vel, time)
  }

  release(midi: number, when?: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const time = when ?? ctx.currentTime
    this.voices = this.voices.filter((voice) => {
      if (voice.midi !== midi) return true
      voice.stopAt(time)
      return false
    })
  }

  private push(voice: Voice): void {
    this.voices.push(voice)
    if (this.voices.length > 48) {
      const old = this.voices.shift()
      old?.stopAt(this.ctx!.currentTime)
    }
  }

  private playSample(midi: number, vel: number, time: number, buffer: AudioBuffer, sampleMidi: number): void {
    const ctx = this.ctx!
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = 2 ** ((midi - sampleMidi) / 12)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(0.9 * vel, time + 0.012)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1800 + vel * 4200, time)
    filter.frequency.exponentialRampToValueAtTime(1400, time + 0.4)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.master!)
    source.start(time)
    const hold = Math.max(buffer.duration / source.playbackRate.value, 0.4)
    source.stop(time + hold + 0.05)
    this.push({
      midi,
      gain,
      started: time,
      stopAt: (t) => {
        const at = Math.max(t, ctx.currentTime)
        gain.gain.cancelScheduledValues(at)
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), at)
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45)
        source.stop(at + 0.5)
      },
    })
  }

  private playSynth(midi: number, vel: number, time: number): void {
    const ctx = this.ctx!
    const freq = midiToFreq(midi)
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1600 + vel * 5000, time)
    filter.frequency.exponentialRampToValueAtTime(700, time + 0.35)
    const partials = [1, 2, 3, 4, 5, 6]
    const amps = [1, 0.55, 0.32, 0.18, 0.1, 0.06]
    const oscs: OscillatorNode[] = []
    partials.forEach((p, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq * p * (1 + 0.00015 * p * p)
      const g = ctx.createGain()
      const peak = amps[i] * vel * (0.18 + (108 - midi) / 400)
      g.gain.setValueAtTime(0.0001, time)
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.008)
      const decay = (1.5 + (108 - midi) / 50) / p
      g.gain.exponentialRampToValueAtTime(0.0001, time + decay)
      osc.connect(g)
      g.connect(filter)
      osc.start(time)
      osc.stop(time + decay + 0.05)
      oscs.push(osc)
    })
    if (this.noise) {
      const src = ctx.createBufferSource()
      src.buffer = this.noise
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = Math.min(4000, freq * 3)
      const ng = ctx.createGain()
      ng.gain.setValueAtTime(0.08 * vel, time)
      ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.04)
      src.connect(bp)
      bp.connect(ng)
      ng.connect(filter)
      src.start(time)
      src.stop(time + 0.05)
    }
    filter.connect(gain)
    gain.gain.setValueAtTime(0.9, time)
    gain.connect(this.master!)
    this.push({
      midi,
      gain,
      started: time,
      stopAt: (t) => {
        const at = Math.max(t, ctx.currentTime)
        gain.gain.cancelScheduledValues(at)
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), at)
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)
      },
    })
  }
}

export const piano = new Piano()

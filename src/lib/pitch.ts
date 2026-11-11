import { centsOff, freqToMidi, midiToFreq } from './notes'

function nextPow2(n: number): number {
  let p = 1
  while (p < n) p <<= 1
  return p
}

/** In-place radix-2 Cooley–Tukey FFT. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = re[i]
      re[i] = re[j]
      re[j] = tr
      const ti = im[i]
      im[i] = im[j]
      im[j] = ti
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wlenRe = Math.cos(ang)
    const wlenIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let wRe = 1
      let wIm = 0
      const half = len >> 1
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j]
        const uIm = im[i + j]
        const vRe = re[i + j + half] * wRe - im[i + j + half] * wIm
        const vIm = re[i + j + half] * wIm + im[i + j + half] * wRe
        re[i + j] = uRe + vRe
        im[i + j] = uIm + vIm
        re[i + j + half] = uRe - vRe
        im[i + j + half] = uIm - vIm
        const nextRe = wRe * wlenRe - wIm * wlenIm
        wIm = wRe * wlenIm + wIm * wlenRe
        wRe = nextRe
      }
    }
  }
}

function ifft(re: Float64Array, im: Float64Array): void {
  for (let i = 0; i < re.length; i++) im[i] = -im[i]
  fft(re, im)
  const n = re.length
  for (let i = 0; i < n; i++) {
    re[i] /= n
    im[i] = -im[i] / n
  }
}

export function rms(samples: Float32Array): number {
  let s = 0
  for (let i = 0; i < samples.length; i++) s += samples[i] * samples[i]
  return Math.sqrt(s / samples.length)
}

export interface MonoPitch {
  freq: number
  midi: number
  cents: number
  confidence: number
}

export interface PolyPitch {
  midi: number
  score: number
}

function parabolic(y0: number, y1: number, y2: number): number {
  const denom = y0 - 2 * y1 + y2
  if (Math.abs(denom) < 1e-12) return 0
  return (0.5 * (y0 - y2)) / denom
}

/**
 * Monophonic pitch via autocorrelation (FFT). Reliable on a single piano note,
 * including notes whose fundamental is weak, because the waveform still repeats
 * at the fundamental period.
 */
export function detectMonophonic(samples: Float32Array, sampleRate: number, a4 = 440): MonoPitch | null {
  const n = samples.length
  if (n < 256) return null
  const size = nextPow2(n * 2)
  const re = new Float64Array(size)
  const im = new Float64Array(size)
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
    re[i] = samples[i] * w
  }
  fft(re, im)
  for (let i = 0; i < size; i++) {
    re[i] = re[i] * re[i] + im[i] * im[i]
    im[i] = 0
  }
  ifft(re, im)
  const acf0 = re[0]
  if (acf0 <= 1e-8) return null
  const minTau = Math.max(2, Math.floor(sampleRate / 4300))
  const maxTau = Math.min(Math.floor(sampleRate / 27), n - 3, size - 2)
  let best = -1
  let bestVal = 0
  for (let tau = minTau + 1; tau < maxTau; tau++) {
    const v = re[tau]
    if (v > re[tau - 1] && v >= re[tau + 1] && v > bestVal) {
      best = tau
      bestVal = v
    }
  }
  if (best < 0) return null
  // Prefer the fundamental when a strong subharmonic peak exists.
  const threshold = bestVal * 0.72
  for (let tau = minTau + 1; tau < best; tau++) {
    if (re[tau] > re[tau - 1] && re[tau] >= re[tau + 1] && re[tau] >= threshold) {
      const ratio = best / tau
      if (ratio > 1.85 && Math.abs(ratio - Math.round(ratio)) < 0.08) {
        best = tau
        bestVal = re[tau]
        break
      }
    }
  }
  const shift = parabolic(re[best - 1], re[best], re[best + 1])
  const tau = best + shift
  if (tau <= 0) return null
  const freq = sampleRate / tau
  const midiFloat = freqToMidi(freq, a4)
  const midi = Math.round(midiFloat)
  if (midi < 21 || midi > 108) return null
  const confidence = Math.max(0, Math.min(1, bestVal / acf0))
  return { freq, midi, cents: centsOff(freq, midi, a4), confidence }
}

function interpMag(mag: Float64Array, fftSize: number, sampleRate: number, freq: number): number {
  const k = (freq * fftSize) / sampleRate
  const i = Math.floor(k)
  const f = k - i
  if (i < 1 || i + 1 >= mag.length) return 0
  return mag[i] * (1 - f) + mag[i + 1] * f
}

/**
 * Best-effort polyphonic estimate. Harmonic templates pick several fundamentals.
 * Octaves and fifth-related partials are genuinely ambiguous on a piano, so this
 * is a helper beside the monophonic detector, not a transcription engine.
 */
export function detectPolyphonic(samples: Float32Array, sampleRate: number, a4 = 440): PolyPitch[] {
  const n = samples.length
  const size = nextPow2(n)
  const re = new Float64Array(size)
  const im = new Float64Array(size)
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, n - 1))
    re[i] = samples[i] * w
  }
  fft(re, im)
  const mag = new Float64Array(size / 2)
  let peak = 1e-9
  for (let i = 0; i < mag.length; i++) {
    mag[i] = Math.hypot(re[i], im[i])
    if (mag[i] > peak) peak = mag[i]
  }
  const logm = (freq: number) => Math.log1p(interpMag(mag, size, sampleRate, freq) / peak)

  const scored: PolyPitch[] = []
  for (let midi = 21; midi <= 108; midi++) {
    const f0 = midiToFreq(midi, a4)
    const base = logm(f0)
    const left = logm(midiToFreq(midi - 1, a4))
    const right = logm(midiToFreq(midi + 1, a4))
    if (base < left || base < right) continue
    const score =
      1.55 * base +
      0.95 * logm(f0 * 2) +
      0.55 * logm(f0 * 3) +
      0.32 * logm(f0 * 4) -
      0.5 * (left + right)
    if (score > 0.35) scored.push({ midi, score })
  }
  scored.sort((a, b) => b.score - a.score)
  const picked: PolyPitch[] = []
  for (const cand of scored) {
    if (picked.length >= 4) break
    if (cand.score < scored[0].score * 0.45) break
    const blocked = picked.some((p) => {
      if (cand.midi <= p.midi) return false
      const ratio = midiToFreq(cand.midi, a4) / midiToFreq(p.midi, a4)
      const h = Math.round(ratio)
      if (h < 2 || h > 6 || Math.abs(ratio - h) > 0.035) return false
      // A real octave (or double octave) that is almost as strong as the lower note stays.
      if ((h === 2 || h === 4) && cand.score > p.score * 0.72) return false
      return true
    })
    if (blocked) continue
    picked.push(cand)
  }
  picked.sort((a, b) => a.midi - b.midi)
  return picked
}

export interface FrameAnalysis {
  rms: number
  mono: MonoPitch | null
  poly: PolyPitch[]
}

export function analyzeFrame(samples: Float32Array, sampleRate: number, a4 = 440): FrameAnalysis {
  return {
    rms: rms(samples),
    mono: detectMonophonic(samples, sampleRate, a4),
    poly: detectPolyphonic(samples, sampleRate, a4),
  }
}

/**
 * Turn a noisy frame-by-frame pitch list into note on/off events.
 * A note must hold for two frames before it counts, and drop for three before it ends.
 */
export class NoteStabilizer {
  private age = new Map<number, number>()
  private absent = new Map<number, number>()
  private active = new Set<number>()

  update(midis: number[]): { on: number[]; off: number[] } {
    const present = new Set(midis)
    const on: number[] = []
    const off: number[] = []
    for (let m = 21; m <= 108; m++) {
      if (present.has(m)) {
        this.age.set(m, (this.age.get(m) ?? 0) + 1)
        this.absent.set(m, 0)
        if (!this.active.has(m) && (this.age.get(m) ?? 0) >= 2) {
          this.active.add(m)
          on.push(m)
        }
      } else if (this.active.has(m) || this.age.has(m)) {
        this.age.set(m, 0)
        const gone = (this.absent.get(m) ?? 0) + 1
        this.absent.set(m, gone)
        if (this.active.has(m) && gone >= 3) {
          this.active.delete(m)
          this.absent.delete(m)
          this.age.delete(m)
          off.push(m)
        }
      }
    }
    return { on, off }
  }

  reset(): void {
    this.age.clear()
    this.absent.clear()
    this.active.clear()
  }
}

export function chooseHeard(frame: FrameAnalysis, gate: number, a4 = 440): number[] {
  if (frame.rms < gate) return []
  if (frame.poly.length >= 2) return frame.poly.map((p) => p.midi)
  const mono = frame.mono
  if (mono && mono.confidence >= 0.5 && Math.abs(mono.cents) <= 50) return [mono.midi]
  if (frame.poly.length === 1) return [frame.poly[0].midi]
  if (mono && mono.confidence >= 0.62) {
    const midi = Math.round(freqToMidi(mono.freq, a4))
    if (midi >= 21 && midi <= 108 && Math.abs(centsOff(mono.freq, midi, a4)) <= 50) return [midi]
  }
  return []
}

import { describe, expect, it } from 'vitest'
import { analyzeFrame, chooseHeard, detectMonophonic, rms } from './pitch'

function sine(freq: number, sampleRate: number, n: number, amp = 0.4): Float32Array {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sampleRate)
  return out
}

describe('pitch detection', () => {
  it('finds A4 and middle C from a clean tone', () => {
    const sr = 44100
    const a4 = detectMonophonic(sine(440, sr, 4096), sr)
    expect(a4).not.toBeNull()
    expect(a4!.midi).toBe(69)
    expect(Math.abs(a4!.freq - 440)).toBeLessThan(1.5)
    expect(a4!.confidence).toBeGreaterThan(0.4)

    const c4 = detectMonophonic(sine(261.63, sr, 4096), sr)
    expect(c4!.midi).toBe(60)
  })

  it('stays quiet on silence and hears a two-note interval', () => {
    const sr = 44100
    const silent = new Float32Array(4096)
    expect(rms(silent)).toBe(0)
    expect(detectMonophonic(silent, sr)).toBeNull()

    const mix = sine(440, sr, 4096, 0.35)
    const third = sine(523.25, sr, 4096, 0.35)
    for (let i = 0; i < mix.length; i++) mix[i] += third[i]
    const frame = analyzeFrame(mix, sr)
    const heard = chooseHeard(frame, 0.01)
    expect(heard).toContain(69)
    expect(heard).toContain(72)
  })
})

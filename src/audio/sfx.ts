class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  volume = 0.5

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx
    const ctx = new AudioContext()
    const master = ctx.createGain()
    master.gain.value = this.volume
    master.connect(ctx.destination)
    this.ctx = ctx
    this.master = master
    return ctx
  }

  resume(): void {
    const ctx = this.ensure()
    if (ctx.state !== 'running') void ctx.resume()
  }

  setVolume(value: number): void {
    this.volume = value
    if (this.master) this.master.gain.value = value
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = freq): void {
    const ctx = this.ensure()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur)
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g)
    g.connect(this.master!)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  correct(): void {
    this.tone(660, 0.09, 'sine', 0.06, 880)
  }

  wrong(): void {
    this.tone(196, 0.14, 'triangle', 0.05, 90)
  }

  combo(n: number): void {
    this.tone(520 + n * 8, 0.12, 'sine', 0.07, 780)
    this.tone(780, 0.16, 'sine', 0.04, 1040)
  }

  click(accent: boolean): void {
    this.tone(accent ? 1480 : 980, 0.035, 'square', accent ? 0.04 : 0.025, accent ? 420 : 300)
  }

  fanfare(): void {
    ;[523, 659, 784, 1046].forEach((f, i) => {
      window.setTimeout(() => this.tone(f, 0.22, 'sine', 0.06, f), i * 110)
    })
  }
}

export const sfx = new Sfx()

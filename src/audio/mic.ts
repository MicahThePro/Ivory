import { analyzeFrame, chooseHeard, NoteStabilizer, type FrameAnalysis } from '../lib/pitch'

export interface MicFrame {
  analysis: FrameAnalysis
  heard: number[]
  device: string
}

/**
 * Microphone listener. Monophonic detection is the reliable path.
 * Chords are a best-effort spectral guess and will miss octaves and dense harmony.
 */
export class MicInput {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private timer = 0
  private stabilizer = new NoteStabilizer()
  a4 = 440
  gate = 0.02
  running = false
  onFrame: ((frame: MicFrame) => void) | null = null
  onNote: ((type: 'on' | 'off', midi: number) => void) | null = null

  async start(): Promise<void> {
    if (this.running) return
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
    const ctx = new AudioContext()
    this.ctx = ctx
    const source = ctx.createMediaStreamSource(this.stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 4096
    analyser.smoothingTimeConstant = 0
    source.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    this.running = true
    const tick = () => {
      if (!this.running) return
      analyser.getFloatTimeDomainData(buf)
      const analysis = analyzeFrame(buf, ctx.sampleRate, this.a4)
      const heard = chooseHeard(analysis, this.gate, this.a4)
      const edges = this.stabilizer.update(heard)
      for (const midi of edges.on) this.onNote?.('on', midi)
      for (const midi of edges.off) this.onNote?.('off', midi)
      const track = this.stream?.getAudioTracks()[0]
      this.onFrame?.({
        analysis,
        heard,
        device: track?.label || 'Microphone',
      })
      this.timer = window.setTimeout(tick, 50)
    }
    tick()
  }

  stop(): void {
    this.running = false
    window.clearTimeout(this.timer)
    this.stabilizer.reset()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    void this.ctx?.close()
    this.ctx = null
  }
}

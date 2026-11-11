import { useEffect, useState } from 'react'
import { KEY_LEGEND, inputHub } from '../input/hub'
import { piano } from '../audio/piano'
import { spellMidi } from '../lib/notes'
import { progress, useProgress } from '../state/store'

export function Calibrate() {
  const settings = useProgress().settings
  const [frameTick, setTick] = useState(0)
  const [midiNames, setMidiNames] = useState<string[]>([])
  const [error, setError] = useState('')
  const [lit, setLit] = useState<number | null>(null)
  useEffect(() => {
    inputHub.onMicChange = () => setTick((n) => n + 1)
    inputHub.attachKeyboard()
    const off = inputHub.subscribe((event) => {
      if (event.type === 'on') {
        setLit(event.midi)
        if (event.source === 'keys' || event.source === 'pointer') piano.play(event.midi, event.velocity)
      } else if (event.source === 'keys' || event.source === 'pointer') piano.release(event.midi)
    })
    return () => {
      off()
      inputHub.onMicChange = null
    }
  }, [])
  const frame = inputHub.micFrame
  const mono = frame?.analysis.mono
  void frameTick
  return (
    <div className="page calibrate">
      <header className="page-head">
        <p className="kicker">Input</p>
        <h1>Let Ivory hear the piano you actually play.</h1>
        <p>
          A single note through the microphone is solid. Chords are a best guess: thirds and sixths usually show up,
          octaves and thick chords often collapse into one pitch. Plug in MIDI when you want every note of a chord.
        </p>
      </header>
      <div className="cal-grid">
        <section className="card">
          <h2>Microphone</h2>
          <button
            className="btn gold"
            onClick={() => {
              setError('')
              if (inputHub.micOn) inputHub.stopMic()
              else {
                inputHub.setMicTuning(settings.a4, settings.gate)
                void inputHub.startMic().catch((err: Error) => setError(err.message || 'Microphone permission was blocked.'))
              }
            }}
          >
            {inputHub.micOn ? 'Stop microphone' : 'Start microphone test'}
          </button>
          {error && <p className="banner bad">{error}</p>}
          <div className="meter" aria-hidden><i style={{ width: `${Math.min(100, (frame?.analysis.rms ?? 0) * 400)}%` }} /></div>
          <p className="big-note">{mono ? spellMidi(mono.midi, 0).name : '—'}</p>
          <p>{mono ? `${mono.cents > 0 ? '+' : ''}${mono.cents.toFixed(0)} cents · confidence ${Math.round(mono.confidence * 100)}%` : 'Play one note and hold it.'}</p>
          <p>Also hearing: {frame?.analysis.poly.map((p) => spellMidi(p.midi).name).join(' ') || 'nothing yet'}</p>
          <label>Noise gate {settings.gate.toFixed(3)}
            <input type="range" min={0.004} max={0.08} step={0.001} value={settings.gate} onChange={(event) => {
              const gate = Number(event.target.value)
              progress.settings({ gate })
              inputHub.setMicTuning(settings.a4, gate)
            }} />
          </label>
          <label>A4 = {settings.a4} Hz
            <input type="range" min={432} max={446} step={0.5} value={settings.a4} onChange={(event) => {
              const a4 = Number(event.target.value)
              progress.settings({ a4 })
              inputHub.setMicTuning(a4, settings.gate)
            }} />
          </label>
          <button className="btn ghost" onClick={() => {
            if (mono && Math.abs(mono.freq - settings.a4) < 30) {
              progress.settings({ a4: Math.round(mono.freq * 10) / 10 })
            } else piano.play(69, 0.8)
          }}>
            {mono ? 'Set A4 from what I hear' : 'Play a reference A4'}
          </button>
          <label>Mic latency {settings.latencyMs} ms
            <input type="range" min={0} max={180} value={settings.latencyMs} onChange={(event) => progress.settings({ latencyMs: Number(event.target.value) })} />
          </label>
        </section>
        <section className="card">
          <h2>MIDI</h2>
          <button className="btn gold" onClick={() => {
            setError('')
            void inputHub.startMidi().then(setMidiNames).catch((err: Error) => setError(err.message))
          }}>Look for a keyboard</button>
          <ul>{(midiNames.length ? midiNames : inputHub.midiInputs).map((name) => <li key={name}>{name}</li>)}</ul>
          {!midiNames.length && <p>Plug in a USB keyboard, then look again. Note-on and note-off are read directly, so chords are exact.</p>}
          <h3>Computer keyboard</h3>
          <ul className="legend-list">
            {KEY_LEGEND.map((row) => <li key={row.keys}><kbd>{row.keys}</kbd> {row.notes}</li>)}
          </ul>
          <p>Octave starts at C{settings.octave}. Z and X move it.</p>
          <p className="big-note">{lit != null ? spellMidi(lit).name : ' '}</p>
        </section>
      </div>
    </div>
  )
}

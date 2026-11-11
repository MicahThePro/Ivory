import { useEffect, useMemo, useRef, useState } from 'react'
import { piano } from '../audio/piano'
import { sfx } from '../audio/sfx'
import { FallingNotes } from './Falling'
import { PianoKeyboard } from './Keyboard'
import { Results } from './Results'
import { Sheet, type SheetHandle } from './Sheet'
import { PracticeSession, type HandFilter, type PlayMode, type Summary } from '../lib/engine'
import type { Song } from '../lib/song'
import { inputHub } from '../input/hub'
import { progress, useProgress } from '../state/store'

export function PlayStage({
  song,
  initialMode = 'wait',
  initialHands = 'both',
  sessionKey,
  onExit,
  celebrate = 'full',
}: {
  song: Song
  initialMode?: PlayMode
  initialHands?: HandFilter
  sessionKey?: string
  onExit?: () => void
  celebrate?: 'full' | 'step'
}) {
  const settings = useProgress().settings
  const engineRef = useRef<PracticeSession | null>(null)
  const tokenRef = useRef('')
  const token = sessionKey ?? `${song.id}:${initialMode}:${initialHands}`
  let engine = engineRef.current
  if (!engine || tokenRef.current !== token) {
    tokenRef.current = token
    engine = new PracticeSession(song, { mode: initialMode, hands: initialHands, tempo: song.practiceScale })
    engineRef.current = engine
  }
  const [rev, setRev] = useState(0)
  const [view, setView] = useState<'sheet' | 'fall'>('fall')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [stepDone, setStepDone] = useState(false)
  const [xp, setXp] = useState<number | null>(null)
  const sheetRef = useRef<SheetHandle>(null)
  const held = useRef<Record<number, string>>({})
  const reported = useRef(false)
  const snap = engine.snapshot()
  void rev

  const status = useMemo(() => {
    const map: Record<string, string> = {}
    for (const n of engine.notes) map[n.id] = n.status
    for (const id of engine.snapshot().expectedIds) map[id] = 'now'
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev, engine, snap.revision])

  useEffect(() => {
    piano.resume()
    sfx.resume()
    inputHub.attachKeyboard()
    inputHub.octave = settings.octave
    inputHub.setMicTuning(settings.a4, settings.gate)
    let last = performance.now()
    let ui = 0
    let metro = -999
    let raf = 0
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const session = engineRef.current
      if (!session) return
      const before = session.snapshot().revision
      session.update(dt)
      if (session.mode !== 'wait') {
        for (const n of session.crossedSinceLast()) {
          if (session.mode === 'listen') piano.play(n.midi, 0.72)
        }
      }
      const guide = session.takeGuide()
      if (guide && settings.guide && !inputHub.micOn) {
        for (const n of guide) piano.play(n.midi, 0.55)
      }
      if (settings.metronome && session.running && !session.waiting) {
        const t = session.song.times[0]
        const beatLen = t ? 4 / t.denominator : 1
        const idx = Math.floor(session.beat / beatLen)
        if (idx !== metro && session.beat > -8) {
          metro = idx
          const accent = ((idx % (t?.numerator ?? 4)) + (t?.numerator ?? 4)) % (t?.numerator ?? 4) === 0
          sfx.click(accent)
        }
      } else if (session.waiting) metro = Math.floor(session.beat) - 1
      sheetRef.current?.follow(session.beat)
      if (now - ui > 70 || session.snapshot().revision !== before) {
        ui = now
        setRev((n) => n + 1)
      }
      if (session.done && !reported.current && session.mode !== 'listen') {
        reported.current = true
        const result = session.summary()
        const beforeXp = progress.get().xp
        if (celebrate === 'full') progress.songResult(song, result)
        else progress.addHits(result.hits, result.wrongs, result.combo)
        setXp(progress.get().xp - beforeXp)
        if (celebrate === 'full') setSummary(result)
        else setStepDone(true)
        sfx.fanfare()
      }
      raf = requestAnimationFrame(loop)
    }
    const session = engineRef.current
    if (session && !session.running && !session.done && session.hits === 0 && session.beat === 0) session.start()
    raf = requestAnimationFrame(loop)
    const off = inputHub.subscribe((event) => {
      const session = engineRef.current
      if (!session) return
      if (event.type === 'on') {
        held.current[event.midi] = 'play'
        if (event.source === 'keys' || event.source === 'pointer') piano.play(event.midi, event.velocity)
        const latency = event.source === 'mic' ? settings.latencyMs : 0
        const at = session.beat - (latency / 1000) * (session.currentBpm() / 60)
        const fb = session.press(event.midi, at)
        progress.playPitch(event.midi)
        if (fb?.kind === 'correct') {
          sfx.correct()
          if (session.combo && session.combo % 10 === 0) sfx.combo(session.combo)
          held.current[event.midi] = 'good'
        } else if (fb?.kind === 'wrong') {
          sfx.wrong()
          held.current[event.midi] = 'bad'
        }
        setRev((n) => n + 1)
      } else {
        delete held.current[event.midi]
        if (event.source === 'keys' || event.source === 'pointer') piano.release(event.midi)
      }
    })
    return () => {
      cancelAnimationFrame(raf)
      off()
    }
  }, [song, sessionKey, settings.guide, settings.metronome, settings.a4, settings.gate, settings.latencyMs, settings.octave, celebrate])

  const lit = () => {
    const map: Record<number, string> = { ...held.current }
    if (snap.waiting) {
      for (const n of engine.expected()) map[n.midi] = map[n.midi] === 'bad' ? 'bad' : 'wait'
    }
    return map
  }

  const restart = (mode = engine.mode) => {
    reported.current = false
    setSummary(null)
    setStepDone(false)
    engine.setMode(mode)
    engine.start()
    setRev((n) => n + 1)
  }

  const feedback = snap.feedback
  return (
    <div className="stage">
      <header className="stage-bar">
        <div>
          <p className="kicker">{song.composer}</p>
          <h2>{song.title}</h2>
        </div>
        <div className="combo" data-hot={snap.combo >= 10}>{snap.combo > 1 ? `${snap.combo} combo` : snap.score ? `${snap.score}` : 'Ready'}</div>
      </header>
      {feedback && feedback.kind !== 'correct' && (
        <div className={`banner ${feedback.kind}`} role="status">
          <span>Expected {feedback.expected.map((n) => n.name).join(' + ') || '—'}</span>
          {feedback.played && <span>You played {feedback.played.name}</span>}
          {feedback.kind === 'partial' && <span>Still need {feedback.missing.join(' ')}</span>}
          {feedback.kind === 'miss' && <span>Missed {feedback.missing.join(' ')}</span>}
        </div>
      )}
      {feedback?.kind === 'correct' && <div className="banner good">Yes — {feedback.expected.map((n) => n.name).join(' + ')}</div>}
      <div className="stage-view">
        {view === 'sheet' ? (
          <Sheet
            ref={sheetRef}
            song={song}
            notes={engine.notes}
            beat={snap.beat}
            status={status}
            onSeek={(beat) => {
              reported.current = false
              engine.seek(beat)
              setRev((n) => n + 1)
            }}
          />
        ) : (
          <FallingNotes
            notes={engine.notes}
            getBeat={() => engineRef.current?.beat ?? 0}
            getStatus={(id) => status[id] ?? 'future'}
            lit={lit}
            onDown={(midi) => inputHub.pointer(true, midi)}
            onUp={(midi) => inputHub.pointer(false, midi)}
          />
        )}
      </div>
      {view === 'fall' && (
        <p className="legend">
          <i className="swatch nat" /> natural
          <i className="swatch sharp" /> sharp
          <i className="swatch flat" /> flat
          <span> · 88 keys, A0 to C8</span>
        </p>
      )}
      {view === 'sheet' && (
        <PianoKeyboard
          lit={lit() as Record<number, 'play' | 'good' | 'bad' | 'wait'>}
          focus={[song.notes[0]?.midi ?? 60, song.notes.at(-1)?.midi ?? 72]}
          onDown={(midi) => inputHub.pointer(true, midi)}
          onUp={(midi) => inputHub.pointer(false, midi)}
        />
      )}
      <div className="transport">
        <button className="btn gold" onClick={() => {
          if (snap.running) {
            engine.stop()
            setRev((n) => n + 1)
          } else restart(engine.mode)
        }}>
          {snap.running ? 'Pause' : snap.done ? 'Again' : 'Play'}
        </button>
        <div className="seg">
          {(['listen', 'wait', 'perform'] as PlayMode[]).map((mode) => (
            <button key={mode} className={snap.mode === mode ? 'on' : ''} onClick={() => restart(mode)}>
              {mode === 'listen' ? 'Listen' : mode === 'wait' ? 'Wait' : 'Perform'}
            </button>
          ))}
        </div>
        <div className="seg">
          <button className={view === 'fall' ? 'on' : ''} onClick={() => setView('fall')}>Falling</button>
          <button className={view === 'sheet' ? 'on' : ''} onClick={() => setView('sheet')}>Sheet</button>
        </div>
        <div className="seg">
          {(['left', 'both', 'right'] as HandFilter[]).map((hand) => (
            <button
              key={hand}
              className={snap.hands === hand ? 'on' : ''}
              onClick={() => {
                engine.setHands(hand)
                setRev((n) => n + 1)
              }}
            >
              {hand === 'both' ? 'Both' : hand === 'left' ? 'Left' : 'Right'}
            </button>
          ))}
        </div>
        <label className="tempo">
          Tempo {Math.round(snap.tempoScale * 100)}%
          <input
            type="range"
            min={40}
            max={130}
            value={Math.round(snap.tempoScale * 100)}
            onChange={(event) => {
              engine.setTempo(Number(event.target.value) / 100)
              setRev((n) => n + 1)
            }}
          />
          <em>{Math.round(snap.bpm)} bpm</em>
        </label>
        <div className="sections">
          {song.sections.slice(0, 18).map((section) => (
            <button
              key={section.id}
              className={snap.loop?.start === section.start ? 'on' : ''}
              onClick={() => {
                const on = snap.loop?.start === section.start
                engine.setLoop(on ? null : { start: section.start, end: section.end })
                engine.seek(section.start)
                reported.current = false
                setRev((n) => n + 1)
              }}
            >
              {section.name}
            </button>
          ))}
        </div>
        {onExit && <button className="btn ghost" onClick={onExit}>Close</button>}
      </div>
      {summary && (
        <Results
          summary={summary}
          title={song.title}
          xp={xp ?? undefined}
          onAgain={() => restart(summary.mode)}
          onClose={() => {
            setSummary(null)
            onExit?.()
          }}
        />
      )}
      {stepDone && (
        <div className="step-done">
          <strong>Clean enough to continue.</strong>
          <button className="btn gold" onClick={onExit}>Next</button>
          <button className="btn ghost" onClick={() => restart(engine.mode)}>Once more</button>
        </div>
      )}
    </div>
  )
}
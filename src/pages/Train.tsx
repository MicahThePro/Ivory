import { useMemo, useState } from 'react'
import { spellMidi, type Spelling } from '../lib/notes'
import { buildSong } from '../lib/parse'
import { inputHub } from '../input/hub'
import { piano } from '../audio/piano'
import { sfx } from '../audio/sfx'
import { progress, useProgress } from '../state/store'
import { Sheet } from '../components/Sheet'
import { PianoKeyboard } from '../components/Keyboard'
import { useEffect } from 'react'

const LEVELS = [
  { name: 'Middle C', notes: [60] },
  { name: 'Five fingers', notes: [60, 62, 64, 65, 67] },
  { name: 'Treble staff', notes: [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77] },
  { name: 'Treble accidentals', notes: [61, 63, 66, 68, 70, 73, 75, 78] },
  { name: 'Bass staff', notes: [48, 50, 52, 53, 55, 57, 59, 60, 47, 45, 43] },
  { name: 'Bass accidentals', notes: [49, 51, 54, 56, 58, 46, 44, 42] },
  { name: 'Grand staff', notes: [43, 48, 52, 55, 60, 64, 67, 72, 76] },
  { name: 'Ledger lines', notes: [40, 41, 57, 64, 77, 81, 82, 84, 36, 88] },
]

function pick(level: number, byNote: Record<string, { ok: number; bad: number }>, fifths: number): Spelling {
  const pool = LEVELS[level - 1].notes
  let total = 0
  const weights = pool.map((midi) => {
    const row = byNote[String(midi)] ?? { ok: 0, bad: 0 }
    const weight = 1 + row.bad * 3 + (row.ok === 0 ? 1.2 : 0) / (1 + row.ok * 0.35)
    total += weight
    return weight
  })
  let roll = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return spellMidi(pool[i], fifthsFor(level, pool[i]))
  }
  return spellMidi(pool[0], fifths)
}

function fifthsFor(level: number, midi: number): number {
  if (level === 4 || level === 6 || level === 8) return midi % 12 === 1 || midi % 12 === 3 || midi % 12 === 6 || midi % 12 === 8 || midi % 12 === 10 ? (midi % 12 === 1 || midi % 12 === 3 || midi % 12 === 8 ? -1 : 1) : 0
  return 0
}

export function Train() {
  const state = useProgress()
  const level = state.trainer.level
  const [note, setNote] = useState<Spelling>(() => pick(level, state.trainer.byNote, 0))
  const [hint, setHint] = useState(false)
  const [flash, setFlash] = useState<'good' | 'bad' | ''>('')
  const [misses, setMisses] = useState(0)
  const song = useMemo(
    () => buildSong({
      id: `train-${note.name}`,
      title: 'Read',
      composer: 'Trainer',
      description: '',
      difficulty: 'beginner',
      bpm: 72,
      time: [4, 4],
      fifths: note.accidental < 0 ? -1 : note.accidental > 0 ? 1 : 0,
      spec: `${note.name}/1`,
    }),
    [note],
  )

  useEffect(() => {
    inputHub.attachKeyboard()
    const off = inputHub.subscribe((event) => {
      if (event.type !== 'on') {
        if (event.source !== 'mic') piano.release(event.midi)
        return
      }
      if (event.source !== 'mic') piano.play(event.midi, event.velocity)
      const ok = event.midi === note.midi
      progress.trainerAnswer(note.midi, ok, note.accidental !== 0)
      progress.playPitch(event.midi)
      setFlash(ok ? 'good' : 'bad')
      if (ok) {
        sfx.correct()
        window.setTimeout(() => {
          setNote(pick(progress.get().trainer.level, progress.get().trainer.byNote, 0))
          setHint(false)
          setMisses(0)
          setFlash('')
        }, 280)
      } else {
        sfx.wrong()
        setMisses((n) => n + 1)
      }
    })
    return () => off()
  }, [note])

  const weakest = Object.entries(state.trainer.byNote)
    .map(([midi, row]) => ({ name: spellMidi(Number(midi)).name, bad: row.bad, ok: row.ok }))
    .filter((row) => row.bad > 0)
    .sort((a, b) => b.bad - a.bad)
    .slice(0, 4)

  return (
    <div className="page train">
      <header className="page-head tight">
        <p className="kicker">Note reading · level {level} of 8</p>
        <h1>{LEVELS[level - 1].name}</h1>
        <p>Play the note on the staff. Misses come back more often. {state.trainer.streak ? `${state.trainer.streak} in a row.` : 'Start a streak.'}</p>
      </header>
      <div className={`train-stage ${flash}`}>
        <Sheet song={song} notes={song.notes} beat={0} showPlayhead={false} status={{ [song.notes[0].id]: flash === 'good' ? 'hit' : flash === 'bad' ? 'miss' : 'now' }} />
        <div className="train-readout">
          {hint || misses >= 2 ? <strong>{note.name}</strong> : <strong className="hidden">?</strong>}
          <button className="btn ghost" onClick={() => setHint(true)}>Hint</button>
          <button className="text" onClick={() => setNote(pick(Math.max(1, level), state.trainer.byNote, 0))}>
            Another note
          </button>
        </div>
      </div>
      <PianoKeyboard
        focus={[note.midi, note.midi]}
        lit={{ [note.midi]: hint || misses >= 2 ? 'wait' : undefined }}
        onDown={(midi) => inputHub.pointer(true, midi)}
        onUp={(midi) => inputHub.pointer(false, midi)}
      />
      <p className="prompt">
        {state.trainer.correct} correct · best streak {state.trainer.bestStreak}
        {weakest.length > 0 && ` · revisit ${weakest.map((row) => row.name).join(', ')}`}
      </p>
    </div>
  )
}

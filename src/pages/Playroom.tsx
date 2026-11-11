import { useEffect, useState } from 'react'
import { KEY_LEGEND, inputHub } from '../input/hub'
import { piano } from '../audio/piano'
import { spellMidi } from '../lib/notes'
import { progress } from '../state/store'
import { PianoKeyboard } from '../components/Keyboard'
import { buildSong } from '../lib/parse'
import { Sheet } from '../components/Sheet'

export function Playroom() {
  const [lit, setLit] = useState<Record<number, 'play'>>({})
  const [heard, setHeard] = useState<string[]>([])
  useEffect(() => {
    piano.resume()
    inputHub.attachKeyboard()
    const off = inputHub.subscribe((event) => {
      if (event.type === 'on') {
        if (event.source !== 'mic' && event.source !== 'midi') piano.play(event.midi, event.velocity)
        progress.playPitch(event.midi)
        setLit((prev) => ({ ...prev, [event.midi]: 'play' }))
        setHeard((prev) => [spellMidi(event.midi).name, ...prev].slice(0, 8))
      } else {
        if (event.source !== 'mic' && event.source !== 'midi') piano.release(event.midi)
        setLit((prev) => {
          const next = { ...prev }
          delete next[event.midi]
          return next
        })
      }
    })
    return () => off()
  }, [])
  const spec = heard.length ? `${[...heard].reverse().map((n) => `${n}/8`).join(' ')}` : 'R/1'
  const song = buildSong({
    id: 'room',
    title: 'Playroom',
    composer: 'You',
    description: '',
    difficulty: 'beginner',
    bpm: 90,
    time: [4, 4],
    spec,
  })
  return (
    <div className="page">
      <header className="page-head tight">
        <p className="kicker">Free play</p>
        <h1>No score. Just the instrument.</h1>
        <p>Last notes: {heard.length ? heard.join('  ') : 'play something'}.</p>
      </header>
      <Sheet song={song} notes={song.notes} beat={0} status={{}} />
      <PianoKeyboard lit={lit} onDown={(midi) => inputHub.pointer(true, midi)} onUp={(midi) => inputHub.pointer(false, midi)} focus={[60, 72]} />
      <ul className="legend-list">
        {KEY_LEGEND.map((row) => (
          <li key={row.keys}><kbd>{row.keys}</kbd> {row.notes}</li>
        ))}
      </ul>
    </div>
  )
}

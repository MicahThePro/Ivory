import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { catalog } from '../data/library'
import { midiToSong, parseMidi } from '../lib/midi'
import { spellMidi } from '../lib/notes'
import type { Difficulty } from '../lib/song'
import { progress, useProgress } from '../state/store'

const FILTERS: Array<Difficulty | 'all' | 'yours'> = ['all', 'beginner', 'intermediate', 'advanced', 'concert', 'yours']

export function Songs() {
  const state = useProgress()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')
  const [error, setError] = useState('')
  const songs = catalog()
  const shown = useMemo(() => {
    return songs.filter((song) => {
      const yours = song.id.startsWith('user-')
      if (filter === 'yours' && !yours) return false
      if (filter !== 'all' && filter !== 'yours' && song.difficulty !== filter) return false
      const blob = `${song.title} ${song.composer}`.toLowerCase()
      return blob.includes(q.toLowerCase())
    })
  }, [songs, q, filter])

  const upload = async (file: File) => {
    setError('')
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const parsed = parseMidi(bytes)
      if (!parsed.notes.length) throw new Error('That MIDI file has no notes.')
      const title = file.name.replace(/\.mid(i)?$/i, '').replace(/[_-]+/g, ' ')
      const song = midiToSong(parsed, {
        id: `user-${Date.now()}`,
        title,
        composer: 'Imported MIDI',
        description: 'Uploaded from your computer. Both views, wait mode, and performance mode all work.',
        difficulty: parsed.notes.length > 1500 ? 'advanced' : parsed.notes.length > 400 ? 'intermediate' : 'beginner',
        attribution: 'Imported by you. Ivory does not claim a license over this file.',
        license: 'original',
        practiceScale: 0.8,
      })
      progress.addUserSong(song)
      navigate(`/play/${song.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.')
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">Library</p>
        <h1>Pieces, from three notes to a presto.</h1>
        <p>Loop a section, slow it down, split the hands. Or bring your own MIDI.</p>
      </header>
      <label className="drop">
        <input
          type="file"
          accept=".mid,.midi,audio/midi"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void upload(file)
          }}
        />
        <strong>Drop a MIDI file</strong>
        <span>It becomes a playable piece in both views. Nothing is uploaded anywhere.</span>
      </label>
      {error && <p className="banner bad">{error}</p>}
      <div className="filters">
        <input placeholder="Search" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search songs" />
        {FILTERS.map((item) => (
          <button key={item} className={filter === item ? 'on' : ''} onClick={() => setFilter(item)}>{item}</button>
        ))}
      </div>
      <div className="song-grid">
        {shown.map((song) => {
          const record = state.songs[song.id]
          return (
            <article key={song.id}>
              <Link to={`/play/${song.id}`}>
                <span className={`diff ${song.difficulty}`}>{song.difficulty}</span>
                <h3>{song.title}</h3>
                <p>{song.composer}</p>
                <em>
                  {song.time[0]}/{song.time[1]} · {song.bpm} bpm · {spellMidi(song.range[0]).name}–{spellMidi(song.range[1]).name}
                </em>
                <div className="stars" aria-label={record ? `${record.stars} stars` : 'Not played'}>
                  {[0, 1, 2].map((i) => <i key={i} className={record && i < record.stars ? 'on' : ''} />)}
                </div>
              </Link>
              {song.id.startsWith('user-') && (
                <button className="text" onClick={() => progress.removeUserSong(song.id)}>Remove</button>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PlayStage } from '../components/PlayStage'
import { loadSong } from '../data/library'
import type { Song } from '../lib/song'

export function Play() {
  const { id = '' } = useParams()
  const [song, setSong] = useState<Song | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    setSong(null)
    loadSong(id).then((loaded) => {
      if (live) setSong(loaded)
    }).catch((err: Error) => {
      if (live) setError(err.message)
    })
    return () => { live = false }
  }, [id])
  if (error) {
    return (
      <div className="page">
        <h1>Couldn’t open that piece.</h1>
        <p>{error}</p>
        <Link className="btn gold" to="/songs">Library</Link>
      </div>
    )
  }
  if (!song) return <div className="page"><p className="prompt">Setting the music on the stand…</p></div>
  return (
    <div className="page play-page">
      <PlayStage song={song} onExit={() => history.back()} />
      <p className="credit">{song.attribution}</p>
    </div>
  )
}

import { BEGINNER_SONGS, beginnerById } from './beginner'
import repertoire from './repertoire.json'
import { progress } from '../state/store'
import type { Song, SongMeta } from '../lib/song'
import { metaFromSong } from '../lib/song'

const cache = new Map<string, Song>()

export function catalog(): SongMeta[] {
  const builtin = BEGINNER_SONGS.map(metaFromSong)
  const imported = repertoire as SongMeta[]
  const user = progress.get().userSongs.map(metaFromSong)
  return [...builtin, ...imported, ...user]
}

export async function loadSong(id: string): Promise<Song> {
  const cached = cache.get(id)
  if (cached) return cached
  const beginner = beginnerById(id)
  if (beginner) {
    cache.set(id, beginner)
    return beginner
  }
  const user = progress.get().userSongs.find((s) => s.id === id)
  if (user) {
    cache.set(id, user)
    return user
  }
  const res = await fetch(`${import.meta.env.BASE_URL}songs/${id}.json`)
  if (!res.ok) throw new Error('That piece is not in the library.')
  const song = (await res.json()) as Song
  cache.set(id, song)
  return song
}

export function rememberSong(song: Song): void {
  cache.set(song.id, song)
}

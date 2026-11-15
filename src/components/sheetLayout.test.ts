import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildSong } from '../lib/parse'
import type { Song } from '../lib/song'
import { BASS_TOP, TREBLE_BOTTOM, prepareSheet, yOf } from './sheetLayout'

function separated(song: Song) {
  const layout = prepareSheet(song, song.notes)
  const bassTop = yOf(BASS_TOP, 'bass', layout.frame)
  const trebleBottom = yOf(TREBLE_BOTTOM, 'treble', layout.frame)
  expect(bassTop).toBeGreaterThan(trebleBottom + 24)
  for (const note of layout.notes) {
    const ink = [note.y, ...note.ledgerY]
    if (note.hand === 'right') {
      for (const y of ink) expect(y, `${note.name} treble`).toBeLessThan(bassTop - 8)
    } else {
      for (const y of ink) expect(y, `${note.name} bass`).toBeGreaterThan(trebleBottom + 8)
    }
  }
}

describe('grand staff spacing', () => {
  it('keeps a low treble note off the bass staff', () => {
    const song = buildSong({
      id: 'cross',
      title: 'Cross',
      composer: 'Test',
      description: '',
      difficulty: 'beginner',
      bpm: 60,
      time: [4, 4],
      spec: 'RH: G3/1 | C4/1\nLH: C4/1 | C3/1',
    })
    separated(song)
  })

  it('keeps Moonlight and Für Elise hands on their own staves', () => {
    for (const id of ['moonlight-1', 'moonlight-3', 'fur-elise']) {
      const song = JSON.parse(readFileSync(`public/songs/${id}.json`, 'utf8')) as Song
      separated(song)
    }
  })
})

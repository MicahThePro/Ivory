import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import catalog from './repertoire.json'

describe('repertoire files', () => {
  it('opens Für Elise on E D# and keeps Moonlight under its license', () => {
    const elise = JSON.parse(readFileSync('public/songs/fur-elise.json', 'utf8')) as { notes: { name: string }[] }
    expect(elise.notes.slice(0, 4).map((n) => n.name)).toEqual(['E5', 'D#5', 'E5', 'D#5'])
    const moon = JSON.parse(readFileSync('public/songs/moonlight-1.json', 'utf8')) as {
      license: string
      minor: boolean
      notes: { name: string }[]
    }
    expect(moon.minor).toBe(true)
    expect(moon.license).toBe('cc-by-sa-2.5')
    expect(moon.notes[0].name).toBe('C#2')
    const presto = JSON.parse(readFileSync('public/songs/moonlight-3.json', 'utf8')) as { notes: unknown[] }
    expect(presto.notes.length).toBeGreaterThan(4000)
    expect(catalog.length).toBeGreaterThan(15)
  })
})

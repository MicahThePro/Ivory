import { buildSong, type BuiltSongInfo } from '../lib/parse'
import type { Song } from '../lib/song'

const SONGS: BuiltSongInfo[] = [
  {
    id: 'hot-cross-buns',
    title: 'Hot Cross Buns',
    composer: 'Traditional',
    description: 'Three notes, one pattern, and a left hand that keeps you company. The first song that feels like a song.',
    difficulty: 'beginner',
    bpm: 92,
    time: [4, 4],
    spec: `
      RH: E4/4 D4/4 C4/2 | E4/4 D4/4 C4/2 | C4/8 C4/8 C4/8 C4/8 D4/8 D4/8 D4/8 D4/8 | E4/4 D4/4 C4/2
      LH: C3/1 | C3/1 | C3/2 G3/2 | C3/1
    `,
  },
  {
    id: 'lightly-row',
    title: 'Lightly Row',
    composer: 'Traditional',
    description: 'A stepwise boat song in C. Read it slowly, then let the pairs of notes rock.',
    difficulty: 'beginner',
    bpm: 96,
    time: [4, 4],
    spec: `
      RH: G4/4 E4/4 E4/2 | F4/4 D4/4 D4/2 | C4/4 D4/4 E4/4 F4/4 | G4/1 | G4/4 E4/4 E4/2 | F4/4 D4/4 D4/2 | C4/4 E4/4 D4/4 D4/4 | C4/1
      LH: C3/1 | G2/1 | C3/1 | G2/2 C3/2 | C3/1 | G2/1 | G2/2 C3/2 | C3/1
    `,
  },
  {
    id: 'mary-lamb',
    title: 'Mary Had a Little Lamb',
    composer: 'Traditional',
    description: 'The melody sits in a five-finger position. The repeated notes are where your rhythm starts to matter.',
    difficulty: 'beginner',
    bpm: 104,
    time: [4, 4],
    spec: `
      RH: E4/4 D4/4 C4/4 D4/4 | E4/4 E4/4 E4/2 | D4/4 D4/4 D4/2 | E4/4 G4/4 G4/2 | E4/4 D4/4 C4/4 D4/4 | E4/4 E4/4 E4/4 E4/4 | D4/4 D4/4 E4/4 D4/4 | C4/1
      LH: C3/1 | C3/1 | G2/1 | C3/2 E3/2 | C3/1 | C3/1 | G2/2 C3/2 | C3/1
    `,
  },
  {
    id: 'twinkle',
    title: 'Twinkle, Twinkle, Little Star',
    composer: 'Traditional',
    description: 'A wide, calm tune. The left hand swaps between C and G so your ears learn harmony while your eyes learn the staff.',
    difficulty: 'beginner',
    bpm: 92,
    time: [4, 4],
    spec: `
      RH: C4/4 C4/4 G4/4 G4/4 | A4/4 A4/4 G4/2 | F4/4 F4/4 E4/4 E4/4 | D4/4 D4/4 C4/2 | G4/4 G4/4 F4/4 F4/4 | E4/4 E4/4 D4/2 | G4/4 G4/4 F4/4 F4/4 | E4/4 E4/4 D4/2 | C4/4 C4/4 G4/4 G4/4 | A4/4 A4/4 G4/2 | F4/4 F4/4 E4/4 E4/4 | D4/4 D4/4 C4/2
      LH: C3/2 G2/2 | C3/2 G2/2 | F2/2 C3/2 | C3/2 G2/2 | C3/2 G2/2 | G2/2 D3/2 | C3/2 G2/2 | G2/2 D3/2 | C3/2 G2/2 | C3/2 G2/2 | F2/2 C3/2 | C3/1
    `,
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    composer: 'Ludwig van Beethoven',
    description: 'The hymn from the Ninth, set simply in C so both hands can learn it. A four-part version lives further down the library.',
    difficulty: 'beginner',
    bpm: 108,
    time: [4, 4],
    attribution: 'Melody by Beethoven, beginner arrangement for Ivory.',
    spec: `
      RH: E4/4 E4/4 F4/4 G4/4 | G4/4 F4/4 E4/4 D4/4 | C4/4 C4/4 D4/4 E4/4 | E4/4. D4/8 D4/2 | E4/4 E4/4 F4/4 G4/4 | G4/4 F4/4 E4/4 D4/4 | C4/4 C4/4 D4/4 E4/4 | D4/4 C4/4 C4/2
      LH: C3/2 G2/2 | C3/2 G2/2 | C3/2 G2/2 | C3/2 G2/2 | C3/2 G2/2 | C3/2 G2/2 | F2/2 G2/2 | C3/1
    `,
  },
  {
    id: 'frere-jacques',
    title: 'Frère Jacques',
    composer: 'Traditional',
    description: 'A round you can feel in four phrases. The ending dips below middle C — your first ledger-line moment.',
    difficulty: 'beginner',
    bpm: 96,
    time: [4, 4],
    spec: `
      RH: C4/4 D4/4 E4/4 C4/4 | C4/4 D4/4 E4/4 C4/4 | E4/4 F4/4 G4/2 | E4/4 F4/4 G4/2 | G4/8 A4/8 G4/8 F4/8 E4/4 C4/4 | G4/8 A4/8 G4/8 F4/8 E4/4 C4/4 | C4/4 G3/4 C4/2 | C4/4 G3/4 C4/2
      LH: C3/1 | C3/1 | C3/1 | C3/1 | F3/2 C3/2 | F3/2 C3/2 | C3/2 G2/2 | C3/1
    `,
  },
  {
    id: 'jingle-bells',
    title: 'Jingle Bells',
    composer: 'James Lord Pierpont',
    description: 'The verse and the chorus. Repeated notes, a jump down to C, and a left hand that marks the harmony.',
    difficulty: 'beginner',
    bpm: 120,
    time: [4, 4],
    attribution: 'Melody by Pierpont (1857), beginner arrangement for Ivory.',
    spec: `
      RH: E4/4 E4/4 E4/2 | E4/4 E4/4 E4/2 | E4/4 G4/4 C4/4 D4/4 | E4/1 | F4/4 F4/4 F4/4 F4/4 | F4/4 E4/4 E4/4 E4/8 E4/8 | E4/4 D4/4 D4/4 E4/4 | D4/2 G4/2 | E4/4 E4/4 E4/2 | E4/4 E4/4 E4/2 | E4/4 G4/4 C4/4 D4/4 | E4/2 C4/2
      LH: C3/1 | C3/1 | C3/2 G2/2 | C3/1 | F2/1 | C3/1 | G2/2 C3/2 | G2/1 | C3/1 | C3/1 | C3/2 G2/2 | C3/1
    `,
  },
  {
    id: 'chopsticks',
    title: 'Chopsticks',
    composer: 'Euphemia Allen',
    description: 'The parlor trick. Both hands play the same pattern an octave apart, then a C major chord breaks it open.',
    difficulty: 'beginner',
    bpm: 132,
    time: [4, 4],
    attribution: 'After Euphemia Allen’s “The Celebrated Chop Waltz” (1877).',
    spec: `
      RH: F4/8 G4/8 F4/8 G4/8 F4/8 G4/8 F4/8 G4/8 | F4/8 G4/8 F4/8 G4/8 F4/8 G4/8 F4/8 G4/8 | A4/8 B4/8 A4/8 B4/8 A4/8 B4/8 A4/8 B4/8 | C5/4 E5/4 G5/4 C6/4
      LH: F3/8 G3/8 F3/8 G3/8 F3/8 G3/8 F3/8 G3/8 | F3/8 G3/8 F3/8 G3/8 F3/8 G3/8 F3/8 G3/8 | F3/8 G3/8 F3/8 G3/8 F3/8 G3/8 F3/8 G3/8 | C3/4 E3/4 G3/4 C4/4
    `,
  },
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    composer: 'Traditional',
    description: 'A 3/4 hymn in G. The pickup is a rest plus D — count “one, two, and” and come in on three.',
    difficulty: 'intermediate',
    bpm: 72,
    time: [3, 4],
    fifths: 1,
    spec: `
      RH: R/2 D4/4 | G4/2 C5/4 | E5/2 D5/4 | C5/2 A4/4 | G4/2. | G4/2 E4/4 | G4/2 G4/4 | A4/2 E4/4 | D4/2. | R/2 D4/4 | G4/2 C5/4 | E5/2 D5/4 | C5/2 A4/4 | G4/2 D4/4 | G4/2.
      LH: R/2. | G2/2 D3/4 | C3/2 E3/4 | G2/2 D3/4 | G2/2. | G2/2 B2/4 | E3/2 G2/4 | C3/2 A2/4 | D3/2. | R/2. | G2/2 D3/4 | C3/2 E3/4 | G2/2 D3/4 | G2/2 D3/4 | G2/2.
    `,
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    composer: 'Traditional',
    description: 'The Tudor tune in E minor. Long notes, a rising question, and a left hand that keeps the drone.',
    difficulty: 'intermediate',
    bpm: 84,
    time: [3, 4],
    fifths: 1,
    minor: true,
    spec: `
      RH: E4/4 G4/2 | A4/4 B4/4 C5/4 | B4/4 A4/2 | G4/4 E4/4 D4/4 | E4/4 G4/2 | A4/4 B4/4 C5/4 | B4/4 A4/4 G4/4 | E4/2. | G4/4 G4/2 | A4/4 B4/4 C5/4 | B4/4 A4/2 | G4/4 E4/4 D4/4 | E4/2 G4/4 | A4/4 B4/4 C5/4 | B4/4 A4/4 G4/4 | E4/2.
      LH: E3/2 B2/4 | A2/2 E3/4 | E3/2 B2/4 | E3/2 B2/4 | E3/2 B2/4 | A2/2 E3/4 | E3/2 B2/4 | E3/2. | G2/2 D3/4 | A2/2 E3/4 | E3/2 B2/4 | E3/2 B2/4 | E3/2 B2/4 | A2/2 E3/4 | E3/2 B2/4 | E3/2.
    `,
  },
  {
    id: 'scarborough',
    title: 'Scarborough Fair',
    composer: 'Traditional',
    description: 'An A minor ballad. Phrases end on the home note — listen for that arrival.',
    difficulty: 'intermediate',
    bpm: 80,
    time: [3, 4],
    minor: true,
    spec: `
      RH: E4/4 A4/2 | C5/4 B4/4 A4/4 | G4/4 A4/2 | E4/2. | A4/4 B4/2 | C5/4 B4/4 A4/4 | G4/4 E4/2 | A4/2. | E4/4 A4/2 | C5/4 D5/4 C5/4 | B4/4 A4/2 | G4/4 E4/2 | A4/2 E4/4 | A4/2.
      LH: A2/2 E3/4 | A2/2 E3/4 | C3/2 G2/4 | A2/2. | A2/2 E3/4 | A2/2 E3/4 | G2/2 D3/4 | A2/2. | A2/2 E3/4 | A2/2 E3/4 | E3/2 B2/4 | A2/2 E3/4 | A2/2 E3/4 | A2/2.
    `,
  },
]

export const BEGINNER_SONGS: Song[] = SONGS.map((info) => buildSong(info))

export function beginnerById(id: string): Song | undefined {
  return BEGINNER_SONGS.find((s) => s.id === id)
}

export type Visual = 'middle-c' | 'white-keys' | 'octaves' | 'black-keys' | 'treble' | 'bass' | 'rhythm' | 'chord'

export type LessonStep =
  | { kind: 'read'; title: string; body: string[]; visual?: Visual }
  | {
      kind: 'play'
      title: string
      prompt: string
      spec: string
      bpm: number
      time: [number, number]
      fifths?: number
      minor?: boolean
      mode?: 'wait' | 'perform'
      hands?: 'left' | 'right' | 'both'
      staves?: 'treble' | 'bass' | 'grand'
    }
  | {
      kind: 'library'
      title: string
      prompt: string
      songId: string
      hands?: 'left' | 'right' | 'both'
      mode?: 'wait' | 'perform'
    }

export interface Lesson {
  id: string
  unit: string
  title: string
  summary: string
  steps: LessonStep[]
}

export const LESSONS: Lesson[] = [
  {
    id: 'middle-c',
    unit: 'The keyboard',
    title: 'Middle C',
    summary: 'Find the front door of the piano.',
    steps: [
      {
        kind: 'read',
        title: 'The key everything else is measured from',
        visual: 'middle-c',
        body: [
          'Middle C sits just left of the pair of black keys nearest the middle of an 88-key keyboard. Its full name is C4.',
          'On the staff it hangs on a short ledger line between the treble and the bass. On the keyboard it is simply the C under your nose when you sit at the center.',
          'Play it until the name and the place are the same fact.',
        ],
      },
      {
        kind: 'play',
        title: 'Play C4',
        prompt: 'Ivory waits. Only C4 continues.',
        bpm: 72,
        time: [4, 4],
        spec: 'C4/1 | C4/1 | C4/2 C4/2',
      },
    ],
  },
  {
    id: 'white-keys',
    unit: 'The keyboard',
    title: 'White-key names',
    summary: 'C D E F G A B, then it starts again.',
    steps: [
      {
        kind: 'read',
        title: 'Groups of two and three',
        visual: 'white-keys',
        body: [
          'The musical alphabet is seven letters. After B comes C again, one octave higher.',
          'C is the white key just before a group of two black keys. F is the white key just before a group of three.',
          'Say the letter as you play it. The sound and the name should arrive together.',
        ],
      },
      {
        kind: 'play',
        title: 'Up from middle C',
        prompt: 'One white key at a time.',
        bpm: 80,
        time: [4, 4],
        spec: 'C4/4 D4/4 E4/4 F4/4 | G4/4 A4/4 B4/4 C5/4',
      },
      {
        kind: 'play',
        title: 'And back down',
        prompt: 'The same keys, the other direction.',
        bpm: 80,
        time: [4, 4],
        spec: 'C5/4 B4/4 A4/4 G4/4 | F4/4 E4/4 D4/4 C4/4',
      },
    ],
  },
  {
    id: 'octaves',
    unit: 'The keyboard',
    title: 'Octaves and all 88 keys',
    summary: 'The same letter, a new number.',
    steps: [
      {
        kind: 'read',
        title: 'A0 to C8',
        visual: 'octaves',
        body: [
          'An octave is eight letter names, which lands you on the same letter. C3, C4, and C5 are the same kind of key in three places.',
          'A full piano runs from A0, the lowest key, to C8, the highest. That is 52 white keys and 36 black keys: 88.',
          'Ivory’s falling-note view draws every one of them, with the letter name on the note that is about to land.',
        ],
      },
      {
        kind: 'play',
        title: 'Three Cs',
        prompt: 'Low, middle, high.',
        bpm: 72,
        time: [4, 4],
        staves: 'grand',
        spec: 'C3/2 C4/2 | C5/1',
      },
    ],
  },
  {
    id: 'black-keys',
    unit: 'The keyboard',
    title: 'Sharps and flats',
    summary: 'One black key, two names.',
    steps: [
      {
        kind: 'read',
        title: 'The key between',
        visual: 'black-keys',
        body: [
          'The black key just to the right of C is C sharp, written C#. The same key is also D flat, written Db, because it sits just to the left of D.',
          'Sharps and flats are not different keys. They are different spellings, chosen by the key of the piece. Ivory colors them differently so you can see which spelling the score used: copper for sharps, blue for flats.',
          'E and F are neighbors, and so are B and C. There is no black key between them.',
        ],
      },
      {
        kind: 'play',
        title: 'Name it sharp',
        prompt: 'C, then the black key, then D.',
        bpm: 72,
        time: [4, 4],
        spec: 'C4/4 C#4/4 D4/2 | F4/4 F#4/4 G4/2',
      },
      {
        kind: 'play',
        title: 'Name it flat',
        prompt: 'Same keys. The score spells them going down.',
        bpm: 72,
        time: [4, 4],
        fifths: -1,
        spec: 'D4/4 Db4/4 C4/2 | B4/4 Bb4/4 A4/2',
      },
    ],
  },
  {
    id: 'treble-landmarks',
    unit: 'The staff',
    title: 'Treble clef',
    summary: 'Five lines, and the G they curl around.',
    steps: [
      {
        kind: 'read',
        title: 'Lines and spaces',
        visual: 'treble',
        body: [
          'The treble clef marks the staff where the right hand usually lives. Its curl sits on the G above middle C: G4, the second line up.',
          'The lines, bottom to top, are E G B D F. The spaces spell F A C E.',
          'Middle C is not on the staff. It hangs one ledger line below it.',
        ],
      },
      {
        kind: 'play',
        title: 'The five lines',
        prompt: 'E, G, B, D, F.',
        bpm: 76,
        time: [4, 4],
        spec: 'E4/2 G4/2 | B4/2 D5/2 | F5/1',
      },
      {
        kind: 'play',
        title: 'The four spaces',
        prompt: 'F A C E.',
        bpm: 76,
        time: [4, 4],
        spec: 'F4/2 A4/2 | C5/2 E5/2',
      },
    ],
  },
  {
    id: 'treble-reading',
    unit: 'The staff',
    title: 'Reading a treble tune',
    summary: 'Notes you already know, now only on the staff.',
    steps: [
      {
        kind: 'read',
        title: 'Trust the page',
        body: [
          'From here the keyboard stops labeling every answer before you play. The staff is the instruction.',
          'If you miss, Ivory freezes and shows the note it wanted next to the note you played. Fix it, and the music moves.',
        ],
      },
      {
        kind: 'play',
        title: 'A tune in C',
        prompt: 'Right hand. Wait mode.',
        bpm: 92,
        time: [4, 4],
        spec: 'E4/4 E4/4 F4/4 G4/4 | G4/4 F4/4 E4/4 D4/4 | C4/4 C4/4 D4/4 E4/4 | D4/4 C4/4 C4/2',
      },
    ],
  },
  {
    id: 'bass-landmarks',
    unit: 'The staff',
    title: 'Bass clef',
    summary: 'The F line, and the left hand’s map.',
    steps: [
      {
        kind: 'read',
        title: 'The other staff',
        visual: 'bass',
        body: [
          'The bass clef’s two dots surround the F below middle C: F3. That is the left hand’s home landmark.',
          'Lines, bottom to top: G B D F A. Spaces: A C E G.',
          'Middle C is one ledger line above this staff. The two clefs are one continuous ladder.',
        ],
      },
      {
        kind: 'play',
        title: 'Bass lines',
        prompt: 'Left hand.',
        bpm: 72,
        time: [4, 4],
        hands: 'left',
        staves: 'bass',
        spec: 'LH: G2/2 B2/2 | D3/2 F3/2 | A3/1',
      },
      {
        kind: 'play',
        title: 'Bass spaces',
        prompt: 'A, C, E, G.',
        bpm: 72,
        time: [4, 4],
        hands: 'left',
        staves: 'bass',
        spec: 'LH: A2/2 C3/2 | E3/2 G3/2',
      },
    ],
  },
  {
    id: 'bass-reading',
    unit: 'The staff',
    title: 'A bass line',
    summary: 'Roots that a melody can stand on.',
    steps: [
      {
        kind: 'play',
        title: 'Four bars of bass',
        prompt: 'Keep the pulse even. Ivory still waits if you miss.',
        bpm: 88,
        time: [4, 4],
        hands: 'left',
        staves: 'bass',
        spec: 'LH: C3/2 G2/2 | C3/2 G2/2 | F2/2 C3/2 | G2/2 C3/2',
      },
    ],
  },
  {
    id: 'grand-staff',
    unit: 'The staff',
    title: 'The grand staff',
    summary: 'Both clefs, one piece of music.',
    steps: [
      {
        kind: 'read',
        title: 'One ladder, two hands',
        body: [
          'Piano music is two staffs braced together. The top is usually the right hand, the bottom the left. Middle C is the hinge.',
          'You can switch Ivory between the page and falling notes at any time. The falling notes are labeled C4, F#5, Bb3 — the exact name — and sharps and flats wear different colors.',
        ],
      },
      {
        kind: 'play',
        title: 'Hands in turn, then a chord',
        prompt: 'Right hand, left hand, then both.',
        bpm: 76,
        time: [4, 4],
        hands: 'both',
        staves: 'grand',
        spec: 'RH: E4/4 G4/4 C5/2 | R/1 | C5/1\nLH: R/1 | C3/4 E3/4 G3/2 | C3&E3&G3/1',
      },
    ],
  },
  {
    id: 'rhythm',
    unit: 'Rhythm',
    title: 'Whole, half, quarter',
    summary: 'How long a note lasts.',
    steps: [
      {
        kind: 'read',
        title: 'The note is also a length',
        visual: 'rhythm',
        body: [
          'A quarter note is one beat. A half note is two. A whole note fills a bar of 4/4.',
          'In falling notes, the bar is as long as the sound. A whole note is a long tile; a quarter is a short one.',
          'Wait mode forgives your timing so you can find the key. Performance mode keeps going and grades the rhythm.',
        ],
      },
      {
        kind: 'play',
        title: 'In time',
        prompt: 'Performance mode. Stay with the click. Quarters, then a half, then a whole.',
        bpm: 80,
        time: [4, 4],
        mode: 'perform',
        spec: 'C4/4 C4/4 C4/4 C4/4 | C4/2 C4/2 | C4/1',
      },
    ],
  },
  {
    id: 'eighths',
    unit: 'Rhythm',
    title: 'Eighth notes',
    summary: 'Two to a beat.',
    steps: [
      {
        kind: 'read',
        title: 'Split the beat',
        body: [
          'An eighth note is half a beat. Two of them fill the time of one quarter. On the staff they are beamed together when they share a beat.',
          'Count “one-and two-and”. The note on “and” is still a real note, not a decoration.',
        ],
      },
      {
        kind: 'play',
        title: 'Eighths on the beat',
        prompt: 'Performance mode. The click stays on the quarter.',
        bpm: 72,
        time: [4, 4],
        mode: 'perform',
        spec: 'C4/8 D4/8 E4/8 F4/8 G4/8 A4/8 B4/8 C5/8 | C5/4 G4/4 E4/4 C4/4',
      },
    ],
  },
  {
    id: 'rests',
    unit: 'Rhythm',
    title: 'Rests',
    summary: 'Silence that has a length.',
    steps: [
      {
        kind: 'read',
        title: 'The notes you do not play',
        body: [
          'A rest is a measured silence. A quarter rest is one beat of nothing. The music is still moving.',
          'In wait mode Ivory walks through the rest on its own, then stops on the next note until you play it.',
        ],
      },
      {
        kind: 'play',
        title: 'Play, then leave space',
        prompt: 'Do not fill the gaps.',
        bpm: 76,
        time: [4, 4],
        spec: 'C4/4 R/4 E4/4 R/4 | G4/2 R/2 | C5/4 R/4 G4/4 R/4 | E4/2 C4/2',
      },
    ],
  },
  {
    id: 'time-signatures',
    unit: 'Rhythm',
    title: '3/4 and 4/4',
    summary: 'How many beats live in a bar.',
    steps: [
      {
        kind: 'read',
        title: 'The two numbers',
        body: [
          'The top number is how many beats are in a bar. The bottom number is which note value gets one beat. 4/4 is four quarters. 3/4 is three quarters — a waltz.',
          'The click accents the first beat of each bar. That downbeat is where dancers step.',
        ],
      },
      {
        kind: 'play',
        title: 'A small waltz',
        prompt: 'Count to three. Performance mode.',
        bpm: 96,
        time: [3, 4],
        mode: 'perform',
        hands: 'both',
        spec: 'RH: E4/4 G4/2 | F4/4 A4/2 | E4/4 G4/2 | C4/2.\nLH: C3/4 R/4 R/4 | C3/4 R/4 R/4 | C3/4 R/4 R/4 | C3/2.',
      },
    ],
  },
  {
    id: 'both-hands',
    unit: 'Together',
    title: 'Both hands',
    summary: 'The same shape, an octave apart.',
    steps: [
      {
        kind: 'read',
        title: 'One idea, two places',
        body: [
          'Start by playing the same fingers an octave apart. Your hands mirror each other, which is the easiest way to feel them as one gesture.',
          'In the song library you can practise left, right, or both, and loop any eight bars.',
        ],
      },
      {
        kind: 'play',
        title: 'Octaves',
        prompt: 'Both notes together. Ivory waits until it has heard each one.',
        bpm: 72,
        time: [4, 4],
        hands: 'both',
        spec: 'RH: C4/4 D4/4 E4/4 F4/4 | G4/2 E4/2 | C4/1\nLH: C3/4 D3/4 E3/4 F3/4 | G3/2 E3/2 | C3/1',
      },
    ],
  },
  {
    id: 'chords',
    unit: 'Together',
    title: 'Chords',
    summary: 'Three notes that agree.',
    steps: [
      {
        kind: 'read',
        title: 'Major and minor',
        visual: 'chord',
        body: [
          'A major chord stacks a note, the note four semitones up, and the note seven semitones up. C E G is C major. F A C is F major. G B D is G major.',
          'Lower the middle note by one semitone and the chord turns minor. C Eb G is C minor. The spelling uses a flat because we are lowering E.',
          'On a MIDI keyboard, play the notes together. With a microphone, Ivory listens for a chord but single notes are what it trusts — play the tones and it will collect them.',
        ],
      },
      {
        kind: 'play',
        title: 'Three majors',
        prompt: 'All three notes before the bar moves.',
        bpm: 66,
        time: [4, 4],
        hands: 'right',
        spec: 'C4&E4&G4/1 | F4&A4&C5/1 | G4&B4&D5/1 | C4&E4&G4/1',
      },
      {
        kind: 'play',
        title: 'Turn it minor',
        prompt: 'The middle note steps down.',
        bpm: 66,
        time: [4, 4],
        fifths: -3,
        spec: 'C4&Eb4&G4/1 | F4&Ab4&C5/1 | G4&Bb4&D5/1 | C4&Eb4&G4/1',
      },
    ],
  },
  {
    id: 'first-song',
    unit: 'Together',
    title: 'Ode to Joy',
    summary: 'A real melody, both hands, in wait mode.',
    steps: [
      {
        kind: 'read',
        title: 'How a song works here',
        body: [
          'Wait mode stops on a miss and shows the note it expected beside the one you played. Performance mode plays straight through, then gives you a grade, a timeline, and stars.',
          'Learn the right hand first. Then add the left. You can do the same thing, with sections and a tempo slider, on every piece in the library.',
        ],
      },
      {
        kind: 'library',
        title: 'Right hand',
        prompt: 'The tune alone.',
        songId: 'ode-to-joy',
        hands: 'right',
        mode: 'wait',
      },
      {
        kind: 'library',
        title: 'Both hands',
        prompt: 'Add the bass. Same wait mode.',
        songId: 'ode-to-joy',
        hands: 'both',
        mode: 'wait',
      },
    ],
  },
  {
    id: 'minuet-intro',
    unit: 'Together',
    title: 'Into real pieces',
    summary: 'Open the Minuet in G the way you will open everything harder.',
    steps: [
      {
        kind: 'read',
        title: 'Sections, tempo, hands',
        body: [
          'The Minuet in G is the first piece in the library that was written as piano music, not arranged down from a tune. It is in 3/4, one sharp.',
          'Loop the opening eight bars with the right hand at a slow tempo. When that is boring, it is ready. Then the left hand. Then both. Then take the metronome off the leash in performance mode.',
        ],
      },
      {
        kind: 'library',
        title: 'Opening, right hand',
        prompt: 'Bars 1–8 are already a loop if you tap that section.',
        songId: 'minuet-g',
        hands: 'right',
        mode: 'wait',
      },
    ],
  },
]

export function lessonIndex(id: string): number {
  return LESSONS.findIndex((l) => l.id === id)
}

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}

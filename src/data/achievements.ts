export interface Achievement {
  id: string
  name: string
  detail: string
  hint: string
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-note', name: 'First ivory', detail: 'Play any note, on any input.', hint: 'Touch a key.' },
  { id: 'middle-c', name: 'Front door', detail: 'Finish the Middle C lesson.', hint: 'Lesson 1.' },
  { id: 'keyboard', name: 'The alphabet', detail: 'Finish the white-key lesson.', hint: 'Name every white key.' },
  { id: 'both-clefs', name: 'Both clefs', detail: 'Finish the treble and bass landmark lessons.', hint: 'Read above and below middle C.' },
  { id: 'in-time', name: 'In time', detail: 'Clear a rhythm challenge in performance mode.', hint: 'The rhythm lessons keep a pulse.' },
  { id: 'together', name: 'Two hands', detail: 'Finish the both-hands lesson.', hint: 'Octaves, then chords.' },
  { id: 'first-song', name: 'First song', detail: 'Finish Ode to Joy in the lesson path.', hint: 'The last lessons are real music.' },
  { id: 'reader-50', name: 'Fifty notes', detail: 'Read 50 notes correctly in the trainer.', hint: 'The trainer remembers what you miss.' },
  { id: 'reader-250', name: 'Sight reader', detail: 'Read 250 notes correctly.', hint: 'Keep the streak honest.' },
  { id: 'sharp-eye', name: 'Sharp eye', detail: 'Read 20 accidentals correctly.', hint: 'Trainer levels with sharps and flats.' },
  { id: 'streak-3', name: 'Three days', detail: 'Practice three days in a row.', hint: 'Come back tomorrow.' },
  { id: 'streak-7', name: 'Week of ivory', detail: 'A seven-day streak.', hint: 'One session a day.' },
  { id: 'combo-25', name: 'Combo 25', detail: 'Land 25 correct notes in a row.', hint: 'Wait mode loves a clean run.' },
  { id: 'combo-50', name: 'Unbroken', detail: 'A combo of 50.', hint: 'Slow the tempo before you speed it up.' },
  { id: 'three-stars', name: 'Three stars', detail: 'Earn three stars on any piece.', hint: 'A clean wait-mode pass, or 95% in performance.' },
  { id: 'performer', name: 'On stage', detail: 'Finish a piece in performance mode at 80% or better.', hint: 'The metronome does not wait.' },
  { id: 'elise', name: 'For Elise', detail: 'Finish Für Elise in wait or performance mode.', hint: 'Loop the opening until it sings.' },
  { id: 'moonlight', name: 'Night music', detail: 'Finish the Moonlight Sonata’s first movement.', hint: 'Triplets even, melody late and quiet.' },
  { id: 'upload', name: 'Your music', detail: 'Import a MIDI file.', hint: 'Drop a .mid onto the library.' },
  { id: 'cartographer', name: 'Cartographer', detail: 'Play 30 different pitches.', hint: 'Wander the keyboard in the playroom.' },
  { id: 'extremes', name: 'Both ends', detail: 'Play a note in the bottom octave and the top octave.', hint: 'A0’s neighborhood, and C7–C8.' },
  { id: 'century', name: 'A thousand', detail: 'Play 1,000 correct notes.', hint: 'Lessons, trainer, and songs all count.' },
]

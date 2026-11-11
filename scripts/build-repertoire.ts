/**
 * Turn public-domain Mutopia MIDI engravings (and the CC BY-SA Moonlight
 * engraving) into Ivory song JSON. The binaries are not committed.
 *
 *   MIDIS=/tmp/ivory-midi npm run songs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { midiToSong, parseMidi, type SongOverrides } from '../src/lib/midi'
import { metaFromSong } from '../src/lib/song'

const dir = process.env.MIDIS ?? '/tmp/ivory-midi'
const outDir = resolve('public/songs')
mkdirSync(outDir, { recursive: true })

const PD = 'Public-domain engraving from the Mutopia Project.'
const pieces: (SongOverrides & { file: string })[] = [
  {
    file: 'fur-elise.mid',
    id: 'fur-elise',
    title: 'Für Elise',
    composer: 'Ludwig van Beethoven',
    difficulty: 'intermediate',
    description: 'The famous A minor theme, the stormy middle, and the way home. Loop a section, then put the hands together.',
    attribution: `${PD} Typeset by Stelios Samelis after the 1888 Breitkopf & Härtel edition.`,
    license: 'pd',
    practiceScale: 0.85,
  },
  {
    file: 'minuet-g.mid',
    id: 'minuet-g',
    title: 'Minuet in G',
    composer: 'Christian Petzold',
    difficulty: 'beginner',
    description: 'The minuet from the Anna Magdalena notebook, long thought to be Bach’s. Courtly, clear, and the right first “real” piece.',
    attribution: `${PD} Typeset by Allen Garvin after the Bach-Gesellschaft. BWV Anh. 114.`,
    license: 'pd',
    practiceScale: 0.8,
  },
  {
    file: 'minuet-gm.mid',
    id: 'minuet-gm',
    title: 'Minuet in G minor',
    composer: 'Christian Petzold',
    difficulty: 'beginner',
    description: 'The darker twin of the G major minuet. Two flats, a singing right hand, and a bass that steps instead of bouncing.',
    attribution: `${PD} Typeset by Allen Garvin. BWV Anh. 115.`,
    license: 'pd',
    practiceScale: 0.8,
  },
  {
    file: 'musette.mid',
    id: 'musette',
    title: 'Musette in D',
    composer: 'Anonymous',
    difficulty: 'beginner',
    description: 'A drone in the left hand, a bright tune in the right. From the Anna Magdalena notebook, BWV Anh. 126.',
    attribution: `${PD} Typeset by Allen Garvin.`,
    license: 'pd',
    practiceScale: 0.9,
  },
  {
    file: 'prelude.mid',
    id: 'prelude-c',
    title: 'Prelude in C major',
    composer: 'Johann Sebastian Bach',
    difficulty: 'intermediate',
    description: 'The first prelude of the Well-Tempered Clavier. One pattern, thirty-five harmonies. Evenness is the whole game.',
    attribution: `${PD} Typeset by Tobias Erbsland. BWV 846.`,
    license: 'pd',
    fifths: 0,
    minor: false,
    practiceScale: 0.9,
  },
  {
    file: 'ode.mid',
    id: 'ode-hymn',
    title: 'Ode to Joy (hymn)',
    composer: 'Ludwig van Beethoven',
    difficulty: 'intermediate',
    description: 'A four-part setting. Read the chords, not just the tune — the upper staff is the right hand, the lower staff the left.',
    attribution: `${PD} Typeset by Peter Chubb.`,
    license: 'pd',
    practiceScale: 0.9,
  },
  {
    file: 'gymnopedie.mid',
    id: 'gymnopedie',
    title: 'Gymnopédie No. 1',
    composer: 'Erik Satie',
    difficulty: 'intermediate',
    description: 'Slow, spare, and unforgiving of a rushed bass. Let the left hand land and the right hand answer late.',
    attribution: `${PD} Typeset by Evin Robertson.`,
    license: 'pd',
    fifths: 2,
    minor: false,
    practiceScale: 1,
  },
  {
    file: 'chopin-28-7.mid',
    id: 'chopin-28-7',
    title: 'Prelude in A major, Op. 28 No. 7',
    composer: 'Frédéric Chopin',
    difficulty: 'intermediate',
    description: 'Sixteen bars of mazurka. Small enough to memorize, polished enough to perform.',
    attribution: `${PD} Mutopia engraving of Chopin’s Op. 28 No. 7.`,
    license: 'pd',
    practiceScale: 0.85,
  },
  {
    file: 'chopin-28-20.mid',
    id: 'chopin-28-20',
    title: 'Prelude in C minor, Op. 28 No. 20',
    composer: 'Frédéric Chopin',
    difficulty: 'intermediate',
    description: 'A funeral march in miniature. Huge chords, very slow. Listen for the inner voice.',
    attribution: `${PD} Mutopia engraving of Chopin’s Op. 28 No. 20.`,
    license: 'pd',
    practiceScale: 1,
  },
  {
    file: 'chopin-28-4.mid',
    id: 'chopin-28-4',
    title: 'Prelude in E minor, Op. 28 No. 4',
    composer: 'Frédéric Chopin',
    difficulty: 'advanced',
    description: 'A melody that barely moves, over a left hand that never stops. The repeating chords are the piece.',
    attribution: `${PD} Mutopia engraving of Chopin’s Op. 28 No. 4.`,
    license: 'pd',
    practiceScale: 0.9,
  },
  {
    file: 'chopin-28-6.mid',
    id: 'chopin-28-6',
    title: 'Prelude in B minor, Op. 28 No. 6',
    composer: 'Frédéric Chopin',
    difficulty: 'advanced',
    description: 'The cello song. The left hand carries the tune while the right hand keeps a quiet pulse.',
    attribution: `${PD} Mutopia engraving of Chopin’s Op. 28 No. 6.`,
    license: 'pd',
    practiceScale: 0.9,
  },
  {
    file: 'chopin-28-15.mid',
    id: 'raindrop',
    title: 'Prelude in D-flat major, Op. 28 No. 15 “Raindrop”',
    composer: 'Frédéric Chopin',
    difficulty: 'concert',
    description: 'The repeated A-flat (and later G-sharp) is the rain. Stay even through the stormy middle, then let it clear.',
    attribution: `${PD} Mutopia engraving of Chopin’s Op. 28 No. 15.`,
    license: 'pd',
    practiceScale: 0.75,
  },
  {
    file: 'pathetique-2.mid',
    id: 'pathetique-2',
    title: 'Pathétique Sonata — II. Adagio cantabile',
    composer: 'Ludwig van Beethoven',
    difficulty: 'advanced',
    description: 'The famous slow movement. Sing the right hand; keep the left-hand accompaniment softer than you think.',
    attribution: `${PD} Mutopia engraving of Beethoven’s Op. 13, second movement.`,
    license: 'pd',
    practiceScale: 0.95,
  },
  {
    file: 'pathetique-1.mid',
    id: 'pathetique-1',
    title: 'Pathétique Sonata — I. Grave, Allegro',
    composer: 'Ludwig van Beethoven',
    difficulty: 'concert',
    description: 'The grave introduction and the allegro that erupts out of it. Practise the two tempos as their own sections.',
    attribution: `${PD} Mutopia engraving of Beethoven’s Op. 13, first movement.`,
    license: 'pd',
    practiceScale: 0.8,
  },
  {
    file: 'pathetique-3.mid',
    id: 'pathetique-3',
    title: 'Pathétique Sonata — III. Rondo',
    composer: 'Ludwig van Beethoven',
    difficulty: 'concert',
    description: 'A rondo that smiles and then sprints. The theme returns — loop it until the fingers stop arguing.',
    attribution: `${PD} Mutopia engraving of Beethoven’s Op. 13, third movement.`,
    license: 'pd',
    practiceScale: 0.55,
  },
  {
    file: 'clair.mid',
    id: 'clair-de-lune',
    title: 'Clair de lune',
    composer: 'Claude Debussy',
    difficulty: 'concert',
    description: 'Suite bergamasque, third movement. 9/8, moonlight, and rubato you add yourself by slowing the tempo slider.',
    attribution: `${PD} Mutopia engraving of Debussy’s Clair de lune.`,
    license: 'pd',
    practiceScale: 0.9,
  },
  {
    file: 'arabesque.mid',
    id: 'arabesque',
    title: 'Arabesque No. 1',
    composer: 'Claude Debussy',
    difficulty: 'concert',
    description: 'Flowing triplets and a melody that floats over them. Hands-separate practice is not optional.',
    attribution: `${PD} Mutopia engraving of Debussy’s Première Arabesque.`,
    license: 'pd',
    practiceScale: 0.7,
  },
  {
    file: 'moonlight1.mid',
    id: 'moonlight-1',
    title: 'Moonlight Sonata — I. Adagio sostenuto',
    composer: 'Ludwig van Beethoven',
    difficulty: 'advanced',
    description: 'Continuous triplets under a melody that enters late. The right hand is two voices. Take it slowly and keep the triplets even.',
    attribution:
      'Engraving by Stewart Holmes for the Mutopia Project, after the 1908 Berners edition. Encoding licensed CC BY-SA 2.5. Beethoven’s music is public domain.',
    license: 'cc-by-sa-2.5',
    fifths: 4,
    minor: true,
    practiceScale: 0.9,
  },
  {
    file: 'moonlight2.mid',
    id: 'moonlight-2',
    title: 'Moonlight Sonata — II. Allegretto',
    composer: 'Ludwig van Beethoven',
    difficulty: 'advanced',
    description: 'The dance between the two famous movements, in D-flat. Short, graceful, and full of grace notes’ cousins: lifts and echoes.',
    attribution:
      'Engraving by Stewart Holmes for the Mutopia Project. Encoding licensed CC BY-SA 2.5. Beethoven’s music is public domain.',
    license: 'cc-by-sa-2.5',
    practiceScale: 0.85,
  },
  {
    file: 'moonlight3.mid',
    id: 'moonlight-3',
    title: 'Moonlight Sonata — III. Presto agitato',
    composer: 'Ludwig van Beethoven',
    difficulty: 'concert',
    description: 'The storm. Broken chords at speed, then the theme punching through. Start at half tempo. The written presto is at the top of the slider.',
    attribution:
      'Engraving by Stewart Holmes for the Mutopia Project. Encoding licensed CC BY-SA 2.5. Beethoven’s music is public domain.',
    license: 'cc-by-sa-2.5',
    bpmOverride: 132,
    practiceScale: 0.7,
  },
]

const metas = []
for (const piece of pieces) {
  const { file, ...meta } = piece
  const bytes = new Uint8Array(readFileSync(resolve(dir, file)))
  const song = midiToSong(parseMidi(bytes), meta)
  writeFileSync(resolve(outDir, `${song.id}.json`), JSON.stringify(song))
  const info = metaFromSong(song)
  metas.push(info)
  console.log(
    `${song.id.padEnd(16)} ${String(song.notes.length).padStart(5)} notes  ${String(info.bars).padStart(3)} bars  ${info.range[0]}–${info.range[1]}  ${song.fifths}${song.minor ? 'm' : ''}`,
  )
}
writeFileSync(resolve('src/data/repertoire.json'), JSON.stringify(metas, null, 2))
console.log(`wrote ${metas.length} songs`)

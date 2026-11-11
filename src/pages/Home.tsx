import { Link } from 'react-router-dom'
import { LESSONS } from '../data/lessons'
import { catalog } from '../data/library'
import { useLevel, useProgress } from '../state/store'

export function Home() {
  const state = useProgress()
  const level = useLevel()
  const next = LESSONS.find((lesson) => !state.lessons[lesson.id]?.done) ?? LESSONS[0]
  const done = LESSONS.filter((lesson) => state.lessons[lesson.id]?.done).length
  const featured = catalog().filter((s) => ['fur-elise', 'moonlight-1', 'prelude-c', 'minuet-g', 'clair-de-lune', 'gymnopedie'].includes(s.id))
  const goal = Math.min(40, state.stats.todayHits)
  return (
    <div className="page home">
      <section className="hero">
        <p className="kicker">Piano, from middle C to the Moonlight</p>
        <h1>Learn the instrument you already have your hands on.</h1>
        <p className="lede">
          Ivory is a practice room for an 88-key piano. Lessons unlock in order. Songs wait when you miss.
          Falling notes name every pitch — C4, F#5, Bb3 — and your real keyboard can be the controller.
        </p>
        <div className="row">
          <Link className="btn gold" to={`/lesson/${next.id}`}>{done ? 'Continue' : 'Start with middle C'}</Link>
          <Link className="btn ghost" to="/train">Train note reading</Link>
        </div>
        <div className="hero-keys" aria-hidden>
          {Array.from({ length: 22 }, (_, i) => (
            <i key={i} className={ [1, 2, 4, 5, 6, 8, 9, 11, 12, 13].includes(i % 7) ? '' : 'black-gap' } style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      </section>
      <section className="stats">
        <article>
          <span>Level</span>
          <strong>{level.level}</strong>
          <em>{level.title}</em>
        </article>
        <article>
          <span>Streak</span>
          <strong>{state.streak}</strong>
          <em>{state.bestStreak ? `Best ${state.bestStreak}` : 'Play today'}</em>
        </article>
        <article>
          <span>Lessons</span>
          <strong>{done}/{LESSONS.length}</strong>
          <em>{next.title}</em>
        </article>
        <article>
          <span>Today</span>
          <strong>{state.stats.todayHits}</strong>
          <em>{goal >= 40 ? 'Daily goal met' : `${40 - state.stats.todayHits} notes to the daily goal`}</em>
          <div className="bar"><i style={{ width: `${(goal / 40) * 100}%` }} /></div>
        </article>
      </section>
      <section className="feature-grid">
        <article>
          <h3>Wait mode</h3>
          <p>The music stops on a wrong note or a miss, shows what it wanted next to what you played, and moves only when the right note arrives.</p>
        </article>
        <article>
          <h3>Falling notes</h3>
          <p>All 88 keys, A0 to C8. Each bar is as long as the note. Sharps are copper, flats are blue, naturals are ivory.</p>
        </article>
        <article>
          <h3>Your piano</h3>
          <p>A microphone listens for pitch. A MIDI keyboard is exact, including chords. The keys on screen — and your computer keyboard — are always there.</p>
        </article>
      </section>
      <section>
        <div className="section-head">
          <h2>In the library</h2>
          <Link to="/songs">All pieces</Link>
        </div>
        <div className="song-rail">
          {featured.map((song) => (
            <Link key={song.id} to={`/play/${song.id}`} className="song-card">
              <span className={`diff ${song.difficulty}`}>{song.difficulty}</span>
              <h3>{song.title}</h3>
              <p>{song.composer}</p>
              <em>{song.notes.toLocaleString()} notes</em>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

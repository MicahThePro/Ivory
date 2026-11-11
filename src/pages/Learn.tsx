import { Link } from 'react-router-dom'
import { LESSONS } from '../data/lessons'
import { useProgress } from '../state/store'

export function Learn() {
  const state = useProgress()
  let locked = false
  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">Curriculum</p>
        <h1>Seventeen lessons, in order.</h1>
        <p>Each one ends at the keyboard. Finish it and the next door opens.</p>
      </header>
      <ol className="path">
        {LESSONS.map((lesson, index) => {
          const done = Boolean(state.lessons[lesson.id]?.done)
          const available = !locked
          if (!done) locked = true
          const unitChanged = index === 0 || LESSONS[index - 1].unit !== lesson.unit
          return (
            <li key={lesson.id}>
              {unitChanged && <p className="unit">{lesson.unit}</p>}
              {available ? (
                <Link to={`/lesson/${lesson.id}`} className={done ? 'done' : 'now'}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{lesson.title}</strong>
                    <em>{lesson.summary}</em>
                  </div>
                  <b>{done ? 'Done' : 'Open'}</b>
                </Link>
              ) : (
                <div className="locked">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{lesson.title}</strong>
                    <em>{lesson.summary}</em>
                  </div>
                  <b>Locked</b>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

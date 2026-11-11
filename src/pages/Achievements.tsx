import { ACHIEVEMENTS } from '../data/achievements'
import { useProgress } from '../state/store'

export function Achievements() {
  const state = useProgress()
  const unlocked = Object.keys(state.achievements).length
  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">Badges</p>
        <h1>{unlocked} of {ACHIEVEMENTS.length} on the wall.</h1>
        <p>They live in this browser, with your streak and your stars.</p>
      </header>
      <div className="badges">
        {ACHIEVEMENTS.map((badge) => {
          const at = state.achievements[badge.id]
          return (
            <article key={badge.id} className={at ? 'got' : ''}>
              <div className="seal">{badge.name.slice(0, 1)}</div>
              <h3>{badge.name}</h3>
              <p>{at ? badge.detail : badge.hint}</p>
              {at && <time>{new Date(at).toLocaleDateString()}</time>}
            </article>
          )
        })}
      </div>
    </div>
  )
}

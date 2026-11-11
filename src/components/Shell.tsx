import { NavLink, Outlet } from 'react-router-dom'
import { useLevel, useProgress, progress } from '../state/store'
import { useEffect } from 'react'

const LINKS = [
  ['/', 'Home'],
  ['/learn', 'Learn'],
  ['/train', 'Train'],
  ['/songs', 'Songs'],
  ['/playroom', 'Playroom'],
  ['/achievements', 'Achievements'],
  ['/calibrate', 'Mic & MIDI'],
]

export function Shell() {
  const level = useLevel()
  const state = useProgress()
  useEffect(() => {
    if (state.toast) {
      const t = window.setTimeout(() => progress.dismissToast(), 3200)
      return () => window.clearTimeout(t)
    }
  }, [state.toast])
  return (
    <div className="app">
      <aside className="side">
        <NavLink to="/" className="brand">
          <span className="mark" aria-hidden />
          Ivory
        </NavLink>
        <nav>
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="side-level">
          <span>Level {level.level}</span>
          <strong>{level.title}</strong>
          <div className="bar"><i style={{ width: `${(level.into / level.next) * 100}%` }} /></div>
          <em>{state.streak ? `${state.streak}-day streak` : 'Start a streak today'}</em>
        </div>
      </aside>
      <main>
        <Outlet />
      </main>
      {state.toast && <div className="toast">Achievement · {state.toast}</div>}
      {state.lastAward && Date.now() - state.lastAward.at < 1600 && (
        <div className="xp-pop">+{state.lastAward.xp} XP</div>
      )}
    </div>
  )
}

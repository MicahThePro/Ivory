import { NavLink, Outlet } from 'react-router-dom'
import { useLevel, useProgress, progress } from '../state/store'
import { useEffect, useState } from 'react'

const LINKS = [
  ['/', 'Home'],
  ['/learn', 'Learn'],
  ['/train', 'Train'],
  ['/songs', 'Songs'],
  ['/playroom', 'Playroom'],
  ['/achievements', 'Achievements'],
  ['/calibrate', 'Mic & MIDI'],
]
const TABS = [
  ['/', 'Home'],
  ['/learn', 'Learn'],
  ['/train', 'Train'],
  ['/songs', 'Songs'],
] as const
const MORE = [
  ['/playroom', 'Playroom'],
  ['/achievements', 'Achievements'],
  ['/calibrate', 'Mic & MIDI'],
] as const

export function Shell() {
  const level = useLevel()
  const state = useProgress()
  const [more, setMore] = useState(false)
  useEffect(() => {
    if (state.toast) {
      const t = window.setTimeout(() => progress.dismissToast(), 3200)
      return () => window.clearTimeout(t)
    }
  }, [state.toast])
  return (
    <div className="app">
      <aside className="side">
        <NavLink to="/" className="brand" onClick={() => setMore(false)}>
          <span className="mark" aria-hidden />
          Ivory
        </NavLink>
        <div className="phone-meta">
          <span>Lv {level.level}</span>
          <span>{state.streak ? `${state.streak}d` : 'New'}</span>
        </div>
        <nav className="side-nav">
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
      <nav className="tabbar" aria-label="Primary">
        {TABS.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={() => setMore(false)}>
            {label}
          </NavLink>
        ))}
        <button type="button" className={more ? 'on' : ''} onClick={() => setMore((v) => !v)} aria-expanded={more}>
          More
        </button>
      </nav>
      {more && (
        <div className="more-sheet">
          {MORE.map(([to, label]) => (
            <NavLink key={to} to={to} onClick={() => setMore(false)}>
              {label}
            </NavLink>
          ))}
        </div>
      )}
      {state.toast && <div className="toast">Achievement · {state.toast}</div>}
      {state.lastAward && Date.now() - state.lastAward.at < 1600 && (
        <div className="xp-pop">+{state.lastAward.xp} XP</div>
      )}
    </div>
  )
}

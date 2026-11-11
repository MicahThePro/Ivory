import type { Summary } from '../lib/engine'
import { spellMidi } from '../lib/notes'

export function Results({
  summary,
  title,
  xp,
  onAgain,
  onClose,
}: {
  summary: Summary
  title: string
  xp?: number
  onAgain: () => void
  onClose: () => void
}) {
  const pct = Math.round(summary.accuracy * 100)
  const misses = new Map<string, number>()
  for (const n of summary.notes) {
    if (n.status === 'miss') misses.set(n.name, (misses.get(n.name) ?? 0) + 1)
  }
  for (const w of summary.wrongEvents) {
    const name = w.name || spellMidi(w.midi).name
    misses.set(name, (misses.get(name) ?? 0) + 1)
  }
  const worst = [...misses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const end = Math.max(1, ...summary.notes.map((n) => n.start + n.duration))
  return (
    <div className="results-back" role="dialog" aria-label="Results">
      <div className="results">
        <p className="kicker">{summary.mode === 'wait' ? 'Wait mode' : 'Performance'}</p>
        <h2>{title}</h2>
        <div className="grade-row">
          <div className={`grade g-${summary.grade}`}>{summary.grade}</div>
          <div>
            <strong>{pct}%</strong>
            <span>accuracy</span>
            <div className="stars" aria-label={`${summary.stars} stars`}>
              {[0, 1, 2].map((i) => (
                <i key={i} className={i < summary.stars ? 'on' : ''} />
              ))}
            </div>
          </div>
          <ul className="result-stats">
            <li><b>{summary.hits}</b> hit</li>
            <li><b>{summary.misses}</b> missed</li>
            <li><b>{summary.wrongs}</b> wrong</li>
            <li><b>{summary.combo}</b> best combo</li>
            {xp != null && <li><b>+{xp}</b> XP</li>}
          </ul>
        </div>
        <div className="timeline" aria-hidden>
          {summary.notes.map((n) => (
            <i
              key={n.id}
              className={n.status}
              style={{ left: `${(n.start / end) * 100}%` }}
              title={`${n.name} ${n.status}`}
            />
          ))}
        </div>
        {worst.length > 0 && (
          <p className="miss-list">
            Work next on {worst.map(([name, count]) => `${name} (${count})`).join(', ')}.
          </p>
        )}
        <div className="row">
          <button className="btn gold" onClick={onAgain}>Play it again</button>
          <button className="btn ghost" onClick={onClose}>Back</button>
        </div>
      </div>
    </div>
  )
}

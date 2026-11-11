export function gradeFor(accuracy: number): string {
  if (accuracy >= 0.97) return 'S'
  if (accuracy >= 0.9) return 'A'
  if (accuracy >= 0.8) return 'B'
  if (accuracy >= 0.7) return 'C'
  if (accuracy >= 0.55) return 'D'
  return 'E'
}

export function starsForPerformance(accuracy: number): number {
  if (accuracy >= 0.95) return 3
  if (accuracy >= 0.8) return 2
  if (accuracy >= 0.6) return 1
  return 0
}

export function starsForWait(hits: number, wrongs: number): number {
  if (hits <= 0) return 0
  if (wrongs === 0) return 3
  if (wrongs <= Math.max(2, hits * 0.12)) return 2
  return 1
}

export interface LevelInfo {
  level: number
  title: string
  into: number
  next: number
  xp: number
}

const TITLES = [
  'Listener',
  'Beginner',
  'Student',
  'Apprentice',
  'Reader',
  'Player',
  'Musician',
  'Interpreter',
  'Performer',
  'Virtuoso',
  'Concert pianist',
]

export function xpForLevelStep(level: number): number {
  return Math.round(70 * level ** 1.32)
}

export function levelForXp(xp: number): LevelInfo {
  let level = 1
  let spent = 0
  let next = xpForLevelStep(1)
  while (xp >= spent + next && level < 99) {
    spent += next
    level += 1
    next = xpForLevelStep(level)
  }
  return {
    level,
    title: TITLES[Math.min(level, TITLES.length) - 1],
    into: xp - spent,
    next,
    xp,
  }
}

export function dayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - 1)
  return dayKey(date)
}

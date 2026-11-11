import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PlayStage } from '../components/PlayStage'
import { lessonById, LESSONS, type LessonStep } from '../data/lessons'
import { loadSong } from '../data/library'
import { buildSong } from '../lib/parse'
import type { Song } from '../lib/song'
import { progress, useProgress } from '../state/store'
import { useEffect } from 'react'

export function Lesson() {
  const { id = '' } = useParams()
  const lesson = lessonById(id)
  const state = useProgress()
  const index = LESSONS.findIndex((item) => item.id === id)
  const locked = index > 0 && !state.lessons[LESSONS[index - 1].id]?.done
  const [step, setStep] = useState(0)
  if (!lesson) return <div className="page"><h1>That lesson is not on the path.</h1></div>
  if (locked) {
    return (
      <div className="page">
        <h1>This lesson is still locked.</h1>
        <p>Finish the previous one first.</p>
        <Link className="btn gold" to="/learn">Back to the path</Link>
      </div>
    )
  }
  const current = lesson.steps[step]
  const finish = () => {
    const rhythm = lesson.steps.some((item) => item.kind === 'play' && item.mode === 'perform')
    progress.completeLesson(lesson.id, 0, rhythm)
  }
  const next = () => {
    if (step + 1 >= lesson.steps.length) finish()
    else setStep((n) => n + 1)
  }
  const completed = Boolean(state.lessons[lesson.id]?.done)
  return (
    <div className="page lesson">
      <header className="page-head tight">
        <p className="kicker">{lesson.unit} · {step + 1} / {lesson.steps.length}</p>
        <h1>{lesson.title}</h1>
      </header>
      <div className="dots">
        {lesson.steps.map((_, i) => <i key={i} className={i === step ? 'on' : i < step ? 'done' : ''} />)}
      </div>
      {completed && step === lesson.steps.length - 1 ? (
        <div className="card done-card">
          <h2>Lesson complete.</h2>
          <p>That one stays open. The next lesson is unlocked.</p>
          <div className="row">
            <Link className="btn gold" to="/learn">Back to the path</Link>
            <button className="btn ghost" onClick={() => { setStep(0) }}>Replay</button>
          </div>
        </div>
      ) : (
        <StepView step={current} lessonId={lesson.id} stepIndex={step} onNext={next} />
      )}
    </div>
  )
}

function StepView({ step, lessonId, stepIndex, onNext }: { step: LessonStep; lessonId: string; stepIndex: number; onNext: () => void }) {
  if (step.kind === 'read') {
    return (
      <article className="read">
        <div>
          <h2>{step.title}</h2>
          {step.body.map((p) => <p key={p}>{p}</p>)}
          <button className="btn gold" onClick={onNext}>I’m with you</button>
        </div>
        {step.visual && <Visual kind={step.visual} />}
      </article>
    )
  }
  if (step.kind === 'play') {
    const song = buildSong({
      id: `${lessonId}-${stepIndex}`,
      title: step.title,
      composer: 'Lesson',
      description: step.prompt,
      difficulty: 'beginner',
      bpm: step.bpm,
      time: step.time,
      fifths: step.fifths,
      minor: step.minor,
      spec: step.spec,
    })
    return (
      <div>
        <p className="prompt">{step.prompt}</p>
        <PlayStage
          song={song}
          sessionKey={`${lessonId}-${stepIndex}`}
          initialMode={step.mode ?? 'wait'}
          initialHands={step.hands ?? 'both'}
          celebrate="step"
          onExit={onNext}
        />
      </div>
    )
  }
  return <LibraryStep step={step} onNext={onNext} token={`${lessonId}-${stepIndex}`} />
}

function LibraryStep({ step, onNext, token }: { step: Extract<LessonStep, { kind: 'library' }>; onNext: () => void; token: string }) {
  const [song, setSong] = useState<Song | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    loadSong(step.songId).then((loaded) => {
      if (live) setSong(loaded)
    }).catch((err: Error) => setError(err.message))
    return () => { live = false }
  }, [step.songId])
  if (error) return <p>{error}</p>
  if (!song) return <p className="prompt">Opening the music…</p>
  return (
    <div>
      <p className="prompt">{step.prompt}</p>
      <PlayStage song={song} sessionKey={token} initialMode={step.mode ?? 'wait'} initialHands={step.hands ?? 'right'} celebrate="step" onExit={onNext} />
    </div>
  )
}

function Visual({ kind }: { kind: string }) {
  const keys = useMemo(() => ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'], [])
  if (kind === 'rhythm') {
    return (
      <div className="visual rhythm">
        <div><b>𝅝</b><span>whole · 4 beats</span></div>
        <div><b>𝅗𝅥</b><span>half · 2</span></div>
        <div><b>♩</b><span>quarter · 1</span></div>
        <div><b>♫</b><span>eighths · ½ + ½</span></div>
      </div>
    )
  }
  if (kind === 'treble' || kind === 'bass') {
    return (
      <div className="visual staff-card">
        <p>{kind === 'treble' ? 'Treble lines E G B D F · spaces F A C E' : 'Bass lines G B D F A · spaces A C E G'}</p>
        <strong>{kind === 'treble' ? 'G4 sits on the clef’s curl' : 'F3 sits between the clef’s dots'}</strong>
      </div>
    )
  }
  if (kind === 'chord') {
    return (
      <div className="visual chord">
        <div><span>C</span><span>E</span><span>G</span><em>major</em></div>
        <div><span>C</span><span className="flat">Eb</span><span>G</span><em>minor</em></div>
      </div>
    )
  }
  return (
    <div className="visual keys" aria-hidden>
      {keys.map((name, i) => (
        <div key={name + i} className={name === 'C' && kind !== 'white-keys' ? 'hot' : ''}>
          {kind !== 'octaves' && <i />}
          <span>{kind === 'octaves' ? `C${i < 4 ? 3 : i < 6 ? 4 : 5}` : name + (kind === 'black-keys' && i === 1 ? '#' : '')}</span>
        </div>
      ))}
    </div>
  )
}

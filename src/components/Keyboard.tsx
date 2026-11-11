import { useEffect, useRef } from 'react'
import { KEYBOARD, keyBox, spellMidi, type KeyGeom } from '../lib/notes'

export type Lit = Record<number, 'play' | 'good' | 'bad' | 'wait' | undefined>

export function PianoKeyboard({
  lit,
  onDown,
  onUp,
  focus,
}: {
  lit?: Lit
  onDown: (midi: number) => void
  onUp: (midi: number) => void
  focus?: [number, number]
}) {
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scroller.current
    if (!el || !focus) return
    const whiteW = 28
    const key = KEYBOARD.keys.find((k) => k.midi === focus[0])
    if (!key) return
    el.scrollLeft = key.left * whiteW - el.clientWidth * 0.35
  }, [focus])

  return (
    <div className="kb-scroll" ref={scroller}>
      <div className="kb" style={{ width: KEYBOARD.whiteCount * 28 }}>
        {KEYBOARD.keys.map((key) => (
          <Key key={key.midi} geom={key} kind={lit?.[key.midi]} onDown={onDown} onUp={onUp} />
        ))}
      </div>
    </div>
  )
}

function Key({
  geom,
  kind,
  onDown,
  onUp,
}: {
  geom: KeyGeom
  kind?: Lit[number]
  onDown: (midi: number) => void
  onUp: (midi: number) => void
}) {
  const box = keyBox(geom, 28)
  const name = spellMidi(geom.midi).name
  const label = !geom.black && (geom.midi % 12 === 0 || geom.midi === 21 || geom.midi === 108)
  return (
    <button
      type="button"
      className={`pkey ${geom.black ? 'black' : 'white'} ${kind ?? ''}`}
      style={{ left: box.x, width: box.w, height: geom.black ? '62%' : '100%' }}
      aria-label={name}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        onDown(geom.midi)
      }}
      onPointerUp={() => onUp(geom.midi)}
      onPointerCancel={() => onUp(geom.midi)}
      onPointerLeave={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) onUp(geom.midi)
      }}
    >
      {label && <span>{name}</span>}
    </button>
  )
}

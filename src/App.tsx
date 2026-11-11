import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { piano } from './audio/piano'
import { sfx } from './audio/sfx'
import { Achievements } from './pages/Achievements'
import { Calibrate } from './pages/Calibrate'
import { Home } from './pages/Home'
import { Learn } from './pages/Learn'
import { Lesson } from './pages/Lesson'
import { Play } from './pages/Play'
import { Playroom } from './pages/Playroom'
import { Songs } from './pages/Songs'
import { Train } from './pages/Train'
import { progress } from './state/store'

export function App() {
  useEffect(() => {
    void progress.hydrate()
    const unlock = () => {
      piano.resume()
      sfx.resume()
      piano.setVolume(progress.get().settings.volume)
    }
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '')
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="learn" element={<Learn />} />
          <Route path="lesson/:id" element={<Lesson />} />
          <Route path="train" element={<Train />} />
          <Route path="songs" element={<Songs />} />
          <Route path="play/:id" element={<Play />} />
          <Route path="playroom" element={<Playroom />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="calibrate" element={<Calibrate />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

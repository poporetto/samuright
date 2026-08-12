import { useEffect, useRef, useState } from 'react'
import type Phaser from 'phaser'
import { createGame } from './game/createGame'
import { gameEvents } from './game/events'
import { ROUND_SECONDS, STARTING_LIVES } from './game/rules'
import type { Feedback, HudState, RoundSummary } from './game/types'

type Screen = 'start' | 'game' | 'results'
const initialHud: HudState = { score: 0, lives: STARTING_LIVES, combo: 0, secondsLeft: ROUND_SECONDS, current: { japanese: '食べる', reading: 'たべる', meaning: 'to eat' } }
const mascotStrip = `${import.meta.env.BASE_URL}assets/mascot/ronin-voxel-slash-strip.png`
const mascotAnimation = `${import.meta.env.BASE_URL}assets/mascot/ronin-voxel-slash-strip-cropped.png`

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function Mascot({ state, direction = 0 }: { state: 'idle' | 'track' | 'slash'; direction?: number }) {
  const frame = state === 'slash' ? 5 : state === 'track' ? (Math.abs(direction) > 4 ? 2 : 1) : 0
  return <div className={`mascot mascot--${state} ${direction > 0 ? 'mascot--mirror' : ''}`} aria-hidden="true">
    <div className="mascot__sprite" style={{ backgroundImage: `url(${mascotAnimation})`, backgroundPosition: `${(frame / 7) * 100}% center` }} />
  </div>
}

function StartScreen({ sound, setSound, onPlay }: { sound: boolean; setSound: (value: boolean) => void; onPlay: () => void }) {
  return <main className="screen start-screen">
    <button className="icon-button sound-button" onClick={() => setSound(!sound)} aria-label={sound ? 'Mute sound' : 'Enable sound'}>{sound ? '◖))' : '◖×'}</button>
    <div className="wash wash--blue" />
    <div className="brand">SAMURIGHT</div>
    <section className="start-copy">
      <p className="eyebrow">Slash the meaning.</p>
      <h1 lang="ja">食べる</h1>
      <p className="translation">to eat</p>
      <button className="primary-button" onClick={onPlay}>PLAY</button>
      <p className="swipe-hint"><span>↔</span> Swipe with your finger</p>
    </section>
    <div className="hero-mascot" aria-hidden="true"><div style={{ backgroundImage: `url(${mascotStrip})` }} /></div>
  </main>
}

function GameScreen({ sound, onComplete }: { sound: boolean; onComplete: (result: RoundSummary) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const game = useRef<Phaser.Game | null>(null)
  const [hud, setHud] = useState(initialHud)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [mascot, setMascot] = useState<{ state: 'idle' | 'track' | 'slash'; direction?: number }>({ state: 'idle' })

  useEffect(() => {
    const offHud = gameEvents.on('hud', setHud)
    const offFeedback = gameEvents.on('feedback', (value) => { setFeedback(value); window.setTimeout(() => setFeedback(null), 520) })
    const offComplete = gameEvents.on('complete', onComplete)
    const offMascot = gameEvents.on('mascot', (value) => { setMascot(value); if (value.state === 'slash') window.setTimeout(() => setMascot({ state: 'idle' }), 420) })
    if (host.current) game.current = createGame(host.current, sound)
    return () => { offHud(); offFeedback(); offComplete(); offMascot(); game.current?.destroy(true); game.current = null }
  }, [onComplete, sound])

  return <main className="screen game-screen">
    <div ref={host} className="game-canvas" />
    <header className="hud">
      <span>✦ <b>{hud.score.toLocaleString()}</b></span>
      <span className="combo">×{hud.combo}</span>
      <span className="lives">{Array.from({ length: STARTING_LIVES }, (_, index) => <i key={index} className={index < hud.lives ? '' : 'lost'}>♥</i>)}</span>
      <span>◷ <b>{formatTime(hud.secondsLeft)}</b></span>
    </header>
    <section className="question" aria-live="polite">
      <p>Slash the meaning of</p>
      <h2 lang="ja">{hud.current.japanese}</h2>
      <small>{hud.current.reading}</small>
    </section>
    {feedback && <div className={`feedback feedback--${feedback.type}`}>{feedback.message}</div>}
    <Mascot {...mascot} />
  </main>
}

function ResultsScreen({ result, onPlay }: { result: RoundSummary; onPlay: () => void }) {
  const accuracy = result.attempted ? Math.round(result.correct / result.attempted * 100) : 0
  const review = Array.from(new Map(result.incorrect.map((word) => [word.japanese, word])).values()).slice(0, 4)
  return <main className="screen results-screen">
    <div className="brand brand--small">SAMURIGHT</div>
    <p className="eyebrow">ROUND COMPLETE</p>
    <h1 className="final-score">{result.score.toLocaleString()}</h1>
    <p className="score-label">FINAL SCORE</p>
    <div className="stats">
      <div><small>Accuracy</small><strong>{accuracy}%</strong></div>
      <div><small>Best Combo</small><strong>{result.bestCombo}</strong></div>
      <div><small>Correct</small><strong>{result.correct}/{result.attempted}</strong></div>
    </div>
    <section className="review">
      <h2>Review these words</h2>
      {review.length ? review.map((word) => <div className="review-row" key={word.japanese}><span>!</span><b lang="ja">{word.japanese}</b><small>{word.meaning}</small></div>) : <p className="perfect">Perfect round. Your path is sharp.</p>}
    </section>
    <section className="story-card">
      <span>CHAPTER 1 · THE EASTERN ROAD</span>
      <p>Every word sharpens our path.</p>
    </section>
    <button className="primary-button" onClick={onPlay}>PLAY AGAIN</button>
    <div className="result-mascot" aria-hidden="true"><div style={{ backgroundImage: `url(${mascotStrip})` }} /></div>
  </main>
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [sound, setSound] = useState(true)
  const [result, setResult] = useState<RoundSummary | null>(null)
  const start = () => { setResult(null); setScreen('game') }
  const complete = (summary: RoundSummary) => { setResult(summary); setScreen('results') }
  if (screen === 'start') return <StartScreen sound={sound} setSound={setSound} onPlay={start} />
  if (screen === 'results' && result) return <ResultsScreen result={result} onPlay={start} />
  return <GameScreen sound={sound} onComplete={complete} />
}

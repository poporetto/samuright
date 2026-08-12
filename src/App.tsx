import { useCallback, useEffect, useRef, useState } from 'react'
import type Phaser from 'phaser'
import { CHAPTERS, type Chapter } from './data/chapters'
import { createGame } from './game/createGame'
import { gameEvents } from './game/events'
import { ROUND_SECONDS, STARTING_LIVES } from './game/rules'
import type { Feedback, HudState, RoundSummary, VocabularyWord } from './game/types'

type Screen = 'start' | 'journey' | 'dialogue' | 'game' | 'results' | 'review'
type Progress = { unlocked: number; completed: string[]; bestScores: Record<string, number> }
const defaultProgress: Progress = { unlocked: 1, completed: [], bestScores: {} }
const initialHud: HudState = { score: 0, lives: STARTING_LIVES, combo: 0, secondsLeft: ROUND_SECONDS, current: { japanese: '食べる', reading: 'たべる', meaning: 'to eat' } }
const mascotStrip = `${import.meta.env.BASE_URL}assets/mascot/ronin-voxel-slash-strip.png`
const mascotAnimation = `${import.meta.env.BASE_URL}assets/mascot/ronin-pixel-detailed-strip.png`

const loadProgress = (): Progress => {
  try { return { ...defaultProgress, ...JSON.parse(localStorage.getItem('samuright-progress') ?? '') } }
  catch { return defaultProgress }
}
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
const uniqueWords = (words: VocabularyWord[]) => Array.from(new Map(words.map((word) => [word.japanese, word])).values())

function PixelPortrait({ pose = 0, className = '' }: { pose?: number; className?: string }) {
  return <div className={`pixel-portrait ${className}`} aria-hidden="true"><div style={{ backgroundImage: `url(${mascotAnimation})`, backgroundPosition: `${(pose / 7) * 100}% center` }} /></div>
}

function Mascot({ state, dx = 0, dy = 0 }: { state: 'idle' | 'track' | 'slash'; dx?: number; dy?: number }) {
  const isRight = dx > 0
  const vertical = Math.abs(dy) > Math.abs(dx) * 0.45 ? (dy < 0 ? 'up' : 'down') : 'level'
  const frame = state === 'idle' ? 0 : isRight ? vertical === 'up' ? 5 : vertical === 'down' ? 7 : 6 : vertical === 'up' ? 2 : vertical === 'down' ? 4 : 3
  const angle = Math.max(-7, Math.min(7, dy * 0.22))
  return <div className={`mascot mascot--${state}`} style={{ '--mascot-angle': `${angle}deg` } as React.CSSProperties} aria-hidden="true">
    <div className="mascot__sprite" style={{ backgroundImage: `url(${mascotAnimation})`, backgroundPosition: `${(frame / 7) * 100}% center` }} />
  </div>
}

function StartScreen({ sound, setSound, onJourney }: { sound: boolean; setSound: (value: boolean) => void; onJourney: () => void }) {
  return <main className="screen start-screen">
    <button className="icon-button sound-button" onClick={() => setSound(!sound)} aria-label={sound ? 'Mute sound' : 'Enable sound'}>{sound ? '◖))' : '◖×'}</button>
    <div className="wash wash--blue" /><div className="brand">SAMURIGHT</div>
    <section className="start-copy"><p className="eyebrow">A journey through words.</p><h1 lang="ja">旅</h1><p className="translation">the journey</p><button className="primary-button" onClick={onJourney}>BEGIN JOURNEY</button><p className="swipe-hint"><span>↔</span> Learn by the blade</p></section>
    <div className="hero-mascot" aria-hidden="true"><div style={{ backgroundImage: `url(${mascotStrip})` }} /></div>
  </main>
}

function JourneyScreen({ progress, onChapter }: { progress: Progress; onChapter: (chapter: Chapter) => void }) {
  return <main className="screen journey-screen">
    <header className="journey-header"><div className="brand brand--small">SAMURIGHT</div><p className="eyebrow">THE JOURNEY</p><h1>Choose the next road</h1></header>
    <div className="journey-path" aria-hidden="true" />
    <section className="chapter-list">
      {CHAPTERS.map((chapter) => {
        const unlocked = chapter.number <= progress.unlocked
        const complete = progress.completed.includes(chapter.id)
        return <button className={`chapter-node ${complete ? 'is-complete' : ''}`} disabled={!unlocked} onClick={() => onChapter(chapter)} key={chapter.id}>
          <span className="chapter-number">{complete ? '✓' : unlocked ? chapter.number : '◇'}</span>
          <span><small>CHAPTER {chapter.number}</small><strong>{chapter.title}</strong><i lang="ja">{chapter.japaneseTitle}</i><em>{chapter.description}</em></span>
          {progress.bestScores[chapter.id] ? <b>{progress.bestScores[chapter.id].toLocaleString()}</b> : null}
        </button>
      })}
    </section>
    <PixelPortrait className="journey-mascot" />
  </main>
}

function DialogueScreen({ chapter, lines, onContinue }: { chapter: Chapter; lines: string[]; onContinue: () => void }) {
  const [line, setLine] = useState(0)
  const next = () => line < lines.length - 1 ? setLine(line + 1) : onContinue()
  return <main className="screen dialogue-screen" onClick={next}>
    <div className="wash wash--blue" /><p className="eyebrow">CHAPTER {chapter.number}</p><h1>{chapter.title}</h1><p className="chapter-japanese" lang="ja">{chapter.japaneseTitle}</p>
    <PixelPortrait className="dialogue-mascot" pose={line % 2} />
    <section className="dialogue-box"><span>REN</span><p>{lines[line]}</p><small>{line + 1} / {lines.length} · TAP TO CONTINUE</small></section>
  </main>
}

function GameScreen({ sound, chapter, words, onComplete }: { sound: boolean; chapter: Chapter; words: VocabularyWord[]; onComplete: (result: RoundSummary) => void }) {
  const host = useRef<HTMLDivElement>(null); const game = useRef<Phaser.Game | null>(null)
  const [hud, setHud] = useState(initialHud); const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [mascot, setMascot] = useState<{ state: 'idle' | 'track' | 'slash'; dx?: number; dy?: number }>({ state: 'idle' })
  useEffect(() => {
    const offHud = gameEvents.on('hud', setHud)
    const offFeedback = gameEvents.on('feedback', (value) => { setFeedback(value); window.setTimeout(() => setFeedback(null), 520) })
    const offComplete = gameEvents.on('complete', onComplete)
    const offMascot = gameEvents.on('mascot', (value) => { setMascot(value); if (value.state === 'slash') window.setTimeout(() => setMascot({ state: 'idle' }), 360) })
    if (host.current) game.current = createGame(host.current, sound, words)
    return () => { offHud(); offFeedback(); offComplete(); offMascot(); game.current?.destroy(true); game.current = null }
  }, [onComplete, sound, words])
  return <main className="screen game-screen"><div ref={host} className="game-canvas" />
    <header className="hud"><span>✦ <b>{hud.score.toLocaleString()}</b></span><span className="combo">×{hud.combo}</span><span className="lives">{Array.from({ length: STARTING_LIVES }, (_, index) => <i key={index} className={index < hud.lives ? '' : 'lost'}>♥</i>)}</span><span>◷ <b>{formatTime(hud.secondsLeft)}</b></span></header>
    <div className="chapter-chip">{chapter.title}</div>
    <section className="question" aria-live="polite"><p>Slash the meaning of</p><h2 lang="ja">{hud.current.japanese}</h2><small>{hud.current.reading}</small></section>
    {feedback && <div className={`feedback feedback--${feedback.type}`}>{feedback.message}</div>}<Mascot {...mascot} />
  </main>
}

function ResultsScreen({ chapter, result, onJourney, onReplay, onReview }: { chapter: Chapter; result: RoundSummary; onJourney: () => void; onReplay: () => void; onReview: () => void }) {
  const accuracy = result.attempted ? Math.round(result.correct / result.attempted * 100) : 0
  const review = uniqueWords(result.incorrect).slice(0, 4)
  return <main className="screen results-screen"><div className="brand brand--small">SAMURIGHT</div><p className="eyebrow">CHAPTER {chapter.number} COMPLETE</p><h1 className="final-score">{result.score.toLocaleString()}</h1><p className="score-label">FINAL SCORE</p>
    <div className="stats"><div><small>Accuracy</small><strong>{accuracy}%</strong></div><div><small>Best Combo</small><strong>{result.bestCombo}</strong></div><div><small>Correct</small><strong>{result.correct}/{result.attempted}</strong></div></div>
    <section className="review"><h2>Review these words</h2>{review.length ? review.map((word) => <div className="review-row" key={word.japanese}><span>!</span><b lang="ja">{word.japanese}</b><small>{word.meaning}</small></div>) : <p className="perfect">Perfect round. Your path is sharp.</p>}</section>
    <section className="story-card"><span>REN · {chapter.title.toUpperCase()}</span><p>{chapter.complete}</p></section>
    <div className="result-actions">{review.length > 0 && <button className="secondary-button" onClick={onReview}>REVIEW {review.length}</button>}<button className="primary-button" onClick={onJourney}>CONTINUE</button><button className="text-button" onClick={onReplay}>Replay chapter</button></div>
  </main>
}

function ReviewScreen({ words, onDone }: { words: VocabularyWord[]; onDone: () => void }) {
  const [index, setIndex] = useState(0); const [revealed, setRevealed] = useState(false); const word = words[index]
  const next = () => { if (!revealed) return setRevealed(true); if (index === words.length - 1) return onDone(); setIndex(index + 1); setRevealed(false) }
  return <main className="screen review-screen"><p className="eyebrow">WORD REVIEW</p><div className="review-progress"><i style={{ width: `${((index + 1) / words.length) * 100}%` }} /></div><p className="review-count">{index + 1} / {words.length}</p>
    <section className={`review-card-large ${revealed ? 'is-revealed' : ''}`} onClick={next}><small>{revealed ? word.reading : 'Do you remember?'}</small><h1 lang="ja">{word.japanese}</h1><p>{revealed ? word.meaning : 'Tap to reveal'}</p></section>
    <PixelPortrait className="review-mascot" pose={revealed ? 1 : 0} /><button className="primary-button" onClick={next}>{revealed ? index === words.length - 1 ? 'FINISH' : 'NEXT WORD' : 'REVEAL'}</button>
  </main>
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('start'); const [sound, setSound] = useState(true)
  const [chapter, setChapter] = useState(CHAPTERS[0]); const [result, setResult] = useState<RoundSummary | null>(null)
  const [progress, setProgress] = useState<Progress>(loadProgress); const [reviewWords, setReviewWords] = useState<VocabularyWord[]>([])
  useEffect(() => { localStorage.setItem('samuright-progress', JSON.stringify(progress)) }, [progress])
  const chooseChapter = (selected: Chapter) => { setChapter(selected); setResult(null); setScreen('dialogue') }
  const startRound = () => setScreen('game')
  const complete = useCallback((summary: RoundSummary) => {
    setResult(summary); setReviewWords(uniqueWords(summary.incorrect)); setProgress((current) => ({ unlocked: Math.max(current.unlocked, Math.min(CHAPTERS.length, chapter.number + 1)), completed: current.completed.includes(chapter.id) ? current.completed : [...current.completed, chapter.id], bestScores: { ...current.bestScores, [chapter.id]: Math.max(current.bestScores[chapter.id] ?? 0, summary.score) } })); setScreen('results')
  }, [chapter])
  if (screen === 'start') return <StartScreen sound={sound} setSound={setSound} onJourney={() => setScreen('journey')} />
  if (screen === 'journey') return <JourneyScreen progress={progress} onChapter={chooseChapter} />
  if (screen === 'dialogue') return <DialogueScreen chapter={chapter} lines={chapter.intro} onContinue={startRound} />
  if (screen === 'results' && result) return <ResultsScreen chapter={chapter} result={result} onJourney={() => setScreen('journey')} onReplay={() => setScreen('dialogue')} onReview={() => setScreen('review')} />
  if (screen === 'review' && reviewWords.length) return <ReviewScreen words={reviewWords} onDone={() => setScreen('results')} />
  return <GameScreen sound={sound} chapter={chapter} words={chapter.words} onComplete={complete} />
}

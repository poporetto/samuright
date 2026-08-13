import { useCallback, useEffect, useRef, useState } from 'react'
import type Phaser from 'phaser'
import { getChapters, type Chapter, type DialogueLine } from './data/chapters'
import { createGame } from './game/createGame'
import { gameEvents } from './game/events'
import { ROUND_SECONDS, STARTING_LIVES } from './game/rules'
import type { Feedback, HudState, JlptLevel, RoundSummary, RunMode, VocabularyWord } from './game/types'
import { emptyProfile, masteryLabel, updateMastery, wordKey, type LearningProfile, type SessionRecord } from './game/learning'
import { JLPT_LEVELS, JLPT_VOCABULARY } from './data/jlptVocabulary'
import { ACHIEVEMENTS, dateKey, emptyProgression, rankForXp, rewardRound, type PlayerProgression } from './game/progression'

type Screen = 'start' | 'level' | 'journey' | 'dialogue' | 'game' | 'results' | 'review' | 'wordbook' | 'history' | 'achievements' | 'settings'
type Progress = { unlocked: number; completed: string[]; bestScores: Record<string, number>; companionMet: boolean }
const defaultProgress: Progress = { unlocked: 1, completed: [], bestScores: {}, companionMet: false }
const initialHud: HudState = { score: 0, lives: STARTING_LIVES, combo: 0, secondsLeft: ROUND_SECONDS, current: { japanese: '食べる', reading: 'たべる', meaning: 'to eat' }, prompt: '食べる', promptLabel: 'Slash the meaning of', promptReading: 'たべる', mode: 'japanese-meaning' }
const mascotAnimation = `${import.meta.env.BASE_URL}assets/mascot/ronin-pixel-hana-lines-v4-strip.png`
const MASCOT_FRAME_COUNT = 20
const companionAnimation = `${import.meta.env.BASE_URL}assets/mascot/companion-pixel-pouch-v4-strip.png`
const COMPANION_FRAME_COUNT = 20
const MASCOT_SLASH_RESET_MS = 440
const renDialogueArtwork = `${import.meta.env.BASE_URL}assets/characters/ren-dialogue-art-v1.webp`
const hanaDialogueArtwork = `${import.meta.env.BASE_URL}assets/characters/hana-dialogue-pouch-art-v2.webp`

const loadProgress = (level: JlptLevel): Progress => {
  try {
    const saved = JSON.parse(localStorage.getItem(`samuright-progress-${level.toLowerCase()}`) ?? (level === 'N5' ? localStorage.getItem('samuright-progress') : '') ?? '') as Progress
    if (level !== 'N5') return { ...defaultProgress, ...saved }
    const prefix = (id: string) => id.startsWith('n5-') ? id : `n5-${id}`
    return { ...defaultProgress, ...saved, completed: (saved.completed ?? []).map(prefix), bestScores: Object.fromEntries(Object.entries(saved.bestScores ?? {}).map(([id, score]) => [prefix(id), score])) }
  }
  catch { return defaultProgress }
}
const loadLearning = (): LearningProfile => {
  try { const saved = JSON.parse(localStorage.getItem('samuright-learning-v1') ?? ''); return saved?.version === 1 ? saved : emptyProfile() }
  catch { return emptyProfile() }
}
const loadPlayerProgression = (): PlayerProgression => {
  try { const saved = JSON.parse(localStorage.getItem('samuright-player-v1') ?? ''); return saved?.version === 1 ? { ...emptyProgression(), ...saved } : emptyProgression() }
  catch { return emptyProgression() }
}
const dailyDeck = (words: VocabularyWord[], level: JlptLevel) => {
  const seed = `${dateKey()}-${level}`
  const score = (word: VocabularyWord) => [...`${seed}-${word.japanese}`].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7)
  return [...words].sort((a, b) => score(a) - score(b)).slice(0, 12)
}
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
const uniqueWords = (words: VocabularyWord[]) => Array.from(new Map(words.map((word) => [word.japanese, word])).values())

function PixelPortrait({ pose = 0, className = '' }: { pose?: number; className?: string }) {
  const frame = Math.min(3, Math.max(0, pose))
  return <div className={`pixel-portrait ${className}`} aria-hidden="true"><div style={{ backgroundImage: `url(${mascotAnimation})`, backgroundPosition: `${(frame / (MASCOT_FRAME_COUNT - 1)) * 100}% center` }} /></div>
}

function CompanionPortrait({ frame = 0, className = '' }: { frame?: number; className?: string }) {
  const safeFrame = Math.min(COMPANION_FRAME_COUNT - 1, Math.max(0, frame))
  return <div className={`companion-portrait ${className}`} aria-hidden="true"><div style={{ backgroundImage: `url(${companionAnimation})`, backgroundPosition: `${(safeFrame / (COMPANION_FRAME_COUNT - 1)) * 100}% center` }} /></div>
}

type CompanionReactionKind = 'idle' | 'cheer' | 'clumsy' | 'incorrect' | 'missed'
type CompanionReaction = { kind: CompanionReactionKind; cue: number }

const companionReactionFrames: Record<CompanionReactionKind, number[]> = {
  idle: [0, 0, 0, 3, 3, 0],
  cheer: [4, 5, 6, 7],
  clumsy: [8, 9, 10, 11],
  incorrect: [12, 13, 14, 15],
  missed: [16, 17, 18, 19],
}

const companionReactionFrameMs: Record<CompanionReactionKind, number> = {
  idle: 520,
  cheer: 100,
  clumsy: 125,
  incorrect: 125,
  missed: 135,
}

const companionReactionHoldMs: Record<Exclude<CompanionReactionKind, 'idle'>, number> = {
  cheer: 520,
  clumsy: 680,
  incorrect: 680,
  missed: 740,
}

function CompanionMascot({ reaction }: { reaction: CompanionReaction }) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const sequence = companionReactionFrames[reaction.kind]
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) { setFrame(reaction.kind === 'idle' ? 0 : sequence[sequence.length - 1]); return }
    let index = 0
    setFrame(sequence[0])
    const timer = window.setInterval(() => {
      if (reaction.kind !== 'idle' && index === sequence.length - 1) return window.clearInterval(timer)
      index = (index + 1) % sequence.length
      setFrame(sequence[index])
    }, companionReactionFrameMs[reaction.kind])
    return () => window.clearInterval(timer)
  }, [reaction.cue, reaction.kind])
  return <CompanionPortrait className={`companion-mascot companion-mascot--${reaction.kind}`} frame={frame} />
}

function Mascot({ state, dx = 0, dy = 0 }: { state: 'idle' | 'track' | 'slash'; dx?: number; dy?: number }) {
  const [frame, setFrame] = useState(0)
  const speed = Math.hypot(dx, dy)
  const direction = Math.abs(dy) > Math.abs(dx) * .72 ? (dy < 0 ? 'up' : 'down') : dx < 0 ? 'left' : 'right'
  const directionStart = { left: 4, right: 8, up: 12, down: 16 }[direction]
  useEffect(() => {
    if (state === 'track') { setFrame(speed < 2 ? 1 : directionStart + (speed > 24 ? 1 : 0)); return }
    const sequence = state === 'slash' ? [directionStart, directionStart + 1, directionStart + 2, directionStart + 3] : [0, 1, 2, 1, 3, 1]
    const duration = state === 'slash' ? 76 : 360
    let index = 0
    setFrame(sequence[0])
    const timer = window.setInterval(() => {
      if (state === 'slash' && index === sequence.length - 1) return window.clearInterval(timer)
      index = (index + 1) % sequence.length; setFrame(sequence[index])
    }, duration)
    return () => window.clearInterval(timer)
  }, [directionStart, speed, state])
  const angle = Math.max(-7, Math.min(7, dy * 0.22))
  return <div className={`mascot mascot--${state}`} style={{ '--mascot-angle': `${angle}deg` } as React.CSSProperties} aria-hidden="true">
    <div className="mascot__sprite" style={{ backgroundImage: `url(${mascotAnimation})`, backgroundPosition: `${(frame / (MASCOT_FRAME_COUNT - 1)) * 100}% center` }} />
  </div>
}

function StartScreen({ sound, setSound, onJourney }: { sound: boolean; setSound: (value: boolean) => void; onJourney: () => void }) {
  return <main className="screen start-screen">
    <button className="icon-button sound-button" onClick={() => setSound(!sound)} aria-label={sound ? 'Mute sound' : 'Enable sound'}>{sound ? '◖))' : '◖×'}</button>
    <div className="wash wash--blue" /><div className="brand">SAMURIGHT</div>
    <section className="start-copy"><p className="eyebrow">A journey through words.</p><h1 lang="ja">旅</h1><p className="translation">the journey</p><button className="primary-button" onClick={onJourney}>BEGIN JOURNEY</button><p className="swipe-hint"><span>↔</span> Learn by the blade</p></section>
    <div className="hero-mascot" aria-hidden="true"><div style={{ backgroundImage: `url(${mascotAnimation})` }} /></div>
  </main>
}

const levelDetails: Record<JlptLevel, { label: string; description: string }> = {
  N5: { label: 'Beginner', description: 'Everyday actions and essential verbs' },
  N4: { label: 'Elementary', description: 'Common situations and wider expression' },
  N3: { label: 'Intermediate', description: 'Natural conversation and abstract ideas' },
  N2: { label: 'Upper intermediate', description: 'Detailed, formal, and nuanced language' },
  N1: { label: 'Advanced', description: 'Complex and highly expressive vocabulary' },
}

function LevelScreen({ selected, onSelect, onBack }: { selected: JlptLevel; onSelect: (level: JlptLevel) => void; onBack: () => void }) {
  return <main className="screen level-screen"><SubHeader title="Choose Your Path" onBack={onBack} />
    <header><p className="eyebrow">YOUR JAPANESE LEVEL</p><h1>Where should your journey begin?</h1><p>You can change this later. Each path uses a different vocabulary deck.</p></header>
    <section className="level-list">{JLPT_LEVELS.map((level) => <button className={selected === level ? 'is-selected' : ''} onClick={() => onSelect(level)} key={level}><b>{level}</b><span><strong>{levelDetails[level].label}</strong><small>{levelDetails[level].description}</small></span><i>›</i></button>)}</section>
    <PixelPortrait className="level-mascot" />
  </main>
}

function JourneyScreen({ progress, profile, player, level, chapters, words, onChapter, onFocus, onDaily, onOpen }: { progress: Progress; profile: LearningProfile; player: PlayerProgression; level: JlptLevel; chapters: Chapter[]; words: VocabularyWord[]; onChapter: (chapter: Chapter) => void; onFocus: () => void; onDaily: () => void; onOpen: (screen: Screen) => void }) {
  const weakCount = words.filter((word) => (profile.mastery[wordKey(word)]?.level ?? 0) < 2 && (profile.mastery[wordKey(word)]?.seen ?? 0) > 0).length
  const mastered = words.filter((word) => (profile.mastery[wordKey(word)]?.level ?? 0) >= 4).length
  const rank = rankForXp(player.xp); const dailyDone = player.dailyCompletedDate === dateKey()
  return <main className="screen journey-screen">
    <header className="journey-header"><div className="brand brand--small">SAMURIGHT</div><p className="eyebrow">THE JOURNEY</p><h1>Choose the next road</h1></header>
    <section className="player-rank"><span><b>RANK {rank.level}</b><small>{rank.title}</small></span><i><em style={{ width: `${rank.percent}%` }} /></i><strong>🔥 {player.streak}</strong></section>
    <div className="journey-path" aria-hidden="true" />
    <section className="chapter-list">
      {chapters.map((chapter) => {
        const unlocked = chapter.number <= progress.unlocked
        const complete = progress.completed.includes(chapter.id)
        return <button className={`chapter-node ${complete ? 'is-complete' : ''}`} disabled={!unlocked} onClick={() => onChapter(chapter)} key={chapter.id}>
          <span className="chapter-number">{complete ? '✓' : unlocked ? chapter.number : '◇'}</span>
          <span><small>CHAPTER {chapter.number}</small><strong>{chapter.title}</strong><i lang="ja">{chapter.japaneseTitle}</i><em>{chapter.description}</em></span>
          {progress.bestScores[chapter.id] ? <b>{progress.bestScores[chapter.id].toLocaleString()}</b> : null}
        </button>
      })}
    </section>
    <button className={`daily-cta ${dailyDone ? 'is-complete' : ''}`} onClick={onDaily} disabled={dailyDone}><span>{dailyDone ? '✓ DAILY TRAINING COMPLETE' : '☀ DAILY CHALLENGE'}</span><b>{dailyDone ? 'Return tomorrow' : '12 words · 60 sec · +75 XP'}</b></button>
    <nav className="learning-nav"><button onClick={() => onOpen('wordbook')}>WORD BOOK <b>{mastered}/{words.length}</b></button><button onClick={() => onOpen('achievements')}>CRESTS <b>{player.achievements.length}/6</b></button><button onClick={() => onOpen('settings')}>{level} · ⚙</button></nav>
    {weakCount > 0 && <button className="focus-cta" onClick={onFocus}><span>FOCUS TRAINING</span><b>{weakCount} weak words · 45 sec</b></button>}
    <PixelPortrait className="journey-mascot" />
  </main>
}

function DialogueScreen({ chapter, lines, onContinue }: { chapter: Chapter; lines: DialogueLine[]; onContinue: () => void }) {
  const [line, setLine] = useState(0)
  const next = () => line < lines.length - 1 ? setLine(line + 1) : onContinue()
  const activeLine = lines[line]
  const speaker = activeLine.speaker.toLowerCase()
  const artwork = activeLine.speaker === 'HANA' ? hanaDialogueArtwork : renDialogueArtwork
  return <main className="screen dialogue-screen">
    <div className="wash wash--blue" />
    <header className="dialogue-heading"><p className="eyebrow">CHAPTER {chapter.number}</p><h1>{chapter.title}</h1><p className="chapter-japanese" lang="ja">{chapter.japaneseTitle}</p></header>
    <div key={`${speaker}-${line}`} className={`dialogue-art dialogue-art--${speaker}`} aria-hidden="true">
      <img src={artwork} alt="" draggable="false" />
    </div>
    <button className="dialogue-box" type="button" onClick={next} aria-label={`${activeLine.speaker}: ${activeLine.text}. Continue dialogue.`}>
      <span>{activeLine.speaker}</span><p aria-live="polite">{activeLine.text}</p><small>{line + 1} / {lines.length} · TAP TO CONTINUE</small>
    </button>
  </main>
}

function GameScreen({ sound, chapter, words, profile, runMode, companionMet, onComplete }: { sound: boolean; chapter: Chapter; words: VocabularyWord[]; profile: LearningProfile; runMode: RunMode; companionMet: boolean; onComplete: (result: RoundSummary) => void }) {
  const host = useRef<HTMLDivElement>(null); const game = useRef<Phaser.Game | null>(null)
  const companionTimer = useRef<number | null>(null); const mascotTimer = useRef<number | null>(null); const correctCheerCount = useRef(0)
  const [hud, setHud] = useState(initialHud); const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [mascot, setMascot] = useState<{ state: 'idle' | 'track' | 'slash'; dx?: number; dy?: number }>({ state: 'idle' })
  const [companionReaction, setCompanionReaction] = useState<CompanionReaction>({ kind: 'idle', cue: 0 })
  useEffect(() => {
    correctCheerCount.current = 0
    const offHud = gameEvents.on('hud', setHud)
    const offFeedback = gameEvents.on('feedback', (value) => {
      setFeedback(value); window.setTimeout(() => setFeedback(null), 520)
      if (!companionMet) return

      if (companionTimer.current !== null) {
        window.clearTimeout(companionTimer.current)
        companionTimer.current = null
      }

      let kind: Exclude<CompanionReactionKind, 'idle'>
      if (value.type === 'correct') {
        correctCheerCount.current += 1
        kind = correctCheerCount.current % 4 === 0 ? 'clumsy' : 'cheer'
      } else {
        kind = value.type
      }

      setCompanionReaction((current) => ({ kind, cue: current.cue + 1 }))
      companionTimer.current = window.setTimeout(() => {
        setCompanionReaction((current) => ({ kind: 'idle', cue: current.cue + 1 }))
        companionTimer.current = null
      }, companionReactionHoldMs[kind])
    })
    const offComplete = gameEvents.on('complete', onComplete)
    const offMascot = gameEvents.on('mascot', (value) => {
      setMascot(value)
      if (mascotTimer.current !== null) {
        window.clearTimeout(mascotTimer.current)
        mascotTimer.current = null
      }
      if (value.state === 'slash') mascotTimer.current = window.setTimeout(() => {
        setMascot({ state: 'idle' })
        mascotTimer.current = null
      }, MASCOT_SLASH_RESET_MS)
    })
    if (host.current) game.current = createGame(host.current, sound, words, profile, runMode)
    return () => { offHud(); offFeedback(); offComplete(); offMascot(); if (companionTimer.current !== null) window.clearTimeout(companionTimer.current); if (mascotTimer.current !== null) window.clearTimeout(mascotTimer.current); game.current?.destroy(true); game.current = null }
  }, [companionMet, onComplete, profile, runMode, sound, words])
  return <main className="screen game-screen"><div ref={host} className="game-canvas" />
    <header className="hud"><span>✦ <b>{hud.score.toLocaleString()}</b></span><span className="combo">×{hud.combo}</span><span className="lives">{Array.from({ length: STARTING_LIVES }, (_, index) => <i key={index} className={index < hud.lives ? '' : 'lost'}>♥</i>)}</span><span>◷ <b>{formatTime(hud.secondsLeft)}</b></span></header>
    <div className="chapter-chip">{runMode === 'focus' ? 'Focus Training' : runMode === 'daily' ? 'Daily Challenge' : chapter.title}</div>
    <section className={`question question--${hud.mode}`} aria-live="polite"><p>{hud.promptLabel}</p><h2 lang={hud.mode === 'meaning-japanese' ? 'en' : 'ja'}>{hud.prompt}</h2>{hud.promptReading && <small>{hud.promptReading}</small>}</section>
    {feedback && <div className={`feedback feedback--${feedback.type}`}>{feedback.message}</div>}{companionMet && <CompanionMascot key={`${companionReaction.kind}-${companionReaction.cue}`} reaction={companionReaction} />}<Mascot {...mascot} />
  </main>
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) { return <header className="sub-header"><button onClick={onBack}>‹</button><h1>{title}</h1><span /></header> }

function WordbookScreen({ profile, words, level, onBack }: { profile: LearningProfile; words: VocabularyWord[]; level: JlptLevel; onBack: () => void }) {
  const [selected, setSelected] = useState<VocabularyWord | null>(null)
  return <main className="screen library-screen"><SubHeader title={`${level} Word Book`} onBack={onBack} /><p className="library-summary">Mastered {words.filter((w) => (profile.mastery[wordKey(w)]?.level ?? 0) >= 4).length} of {words.length}</p>
    <section className="word-grid">{words.map((word) => { const mastery = profile.mastery[wordKey(word)] ?? { level: 0, seen: 0, correct: 0, streak: 0, lastSeen: 0 }; return <button onClick={() => setSelected(word)} key={word.japanese}><b lang="ja">{word.japanese}</b><small>{word.reading}</small><span className={`mastery mastery--${mastery.level}`}>{masteryLabel(mastery.level)}</span></button> })}</section>
    {selected && <div className="word-modal" onClick={() => setSelected(null)}><section onClick={(event) => event.stopPropagation()}><button onClick={() => setSelected(null)}>×</button><h1 lang="ja">{selected.japanese}</h1><p>{selected.reading}</p><strong>{selected.meaning}</strong>{(() => { const m = profile.mastery[wordKey(selected)] ?? { level: 0, seen: 0, correct: 0, streak: 0 }; return <div className="word-stats"><span>{masteryLabel(m.level)}</span><span>{m.seen ? Math.round(m.correct / m.seen * 100) : 0}% accuracy</span><span>{m.seen} seen</span></div> })()}</section></div>}
  </main>
}

function HistoryScreen({ sessions, chapters, onBack }: { sessions: SessionRecord[]; chapters: Chapter[]; onBack: () => void }) {
  return <main className="screen library-screen"><SubHeader title="Session History" onBack={onBack} /><section className="session-list">{sessions.length ? sessions.map((session) => <article key={session.id}><span>{session.jlptLevel ? `${session.jlptLevel} · ` : ''}{session.mode === 'focus' ? 'FOCUS' : session.mode === 'daily' ? 'DAILY' : chapters.find((c) => c.id === session.chapterId)?.title ?? 'Chapter'}</span><strong>{session.score.toLocaleString()}</strong><b>{session.accuracy}%</b><small>{new Date(session.date).toLocaleDateString()}</small></article>) : <p className="empty-state">Complete a round to begin your training record.</p>}</section></main>
}

function AchievementsScreen({ player, onBack, onHistory }: { player: PlayerProgression; onBack: () => void; onHistory: () => void }) {
  const rank = rankForXp(player.xp)
  return <main className="screen library-screen"><SubHeader title="Training Record" onBack={onBack} />
    <section className="rank-card"><span>RANK {rank.level}</span><h1>{rank.title}</h1><p>{player.xp.toLocaleString()} total XP</p><i><em style={{ width: `${rank.percent}%` }} /></i><small>{rank.current} / {rank.needed} XP to next rank</small></section>
    <section className="record-stats"><div><strong>{player.streak}</strong><small>Day streak</small></div><div><strong>{player.totalCorrect}</strong><small>Correct</small></div><div><strong>{player.totalRounds}</strong><small>Rounds</small></div></section>
    <h2 className="crest-title">Training Crests</h2><section className="crest-grid">{ACHIEVEMENTS.map((item) => { const unlocked = player.achievements.includes(item.id); return <article className={unlocked ? 'is-unlocked' : ''} key={item.id}><b lang="ja">{unlocked ? item.japanese : '？'}</b><strong>{item.title}</strong><small>{item.description}</small></article> })}</section>
    <button className="history-link" onClick={onHistory}>VIEW SESSION HISTORY</button>
  </main>
}

function SettingsScreen({ level, onChangeLevel, onBack, onReset }: { level: JlptLevel; onChangeLevel: () => void; onBack: () => void; onReset: () => void }) {
  const [confirming, setConfirming] = useState(false)
  return <main className="screen library-screen"><SubHeader title="Settings" onBack={onBack} /><section className="settings-card"><h2>Japanese level</h2><p>Your current path uses {level} vocabulary. Changing level keeps your existing progress.</p><button className="level-change-button" onClick={onChangeLevel}>CHANGE JLPT LEVEL</button></section><section className="settings-card"><h2>Learning data</h2><p>Progress is stored only on this device.</p>{confirming ? <div className="reset-confirm"><p>Erase chapters, mastery, scores, and history?</p><button onClick={onReset}>YES, ERASE</button><button onClick={() => setConfirming(false)}>CANCEL</button></div> : <button className="danger-button" onClick={() => setConfirming(true)}>RESET ALL PROGRESS</button>}</section></main>
}

function ResultsScreen({ chapter, result, passed, earnedXp, newAchievements, player, onJourney, onReplay, onReview }: { chapter: Chapter; result: RoundSummary; passed: boolean; earnedXp: number; newAchievements: string[]; player: PlayerProgression; onJourney: () => void; onReplay: () => void; onReview: () => void }) {
  const accuracy = result.attempted ? Math.round(result.correct / result.attempted * 100) : 0
  const review = uniqueWords(result.incorrect).slice(0, 4)
  const rank = rankForXp(player.xp)
  return <main className="screen results-screen"><div className="brand brand--small">SAMURIGHT</div><p className="eyebrow">{result.mode === 'daily' ? 'DAILY CHALLENGE COMPLETE' : result.mode === 'focus' ? 'FOCUS TRAINING' : passed ? `CHAPTER ${chapter.number} CLEARED` : `CHAPTER ${chapter.number} · KEEP TRAINING`}</p><h1 className="final-score">{result.score.toLocaleString()}</h1><p className="score-label">FINAL SCORE</p>
    <div className="stats"><div><small>Accuracy</small><strong>{accuracy}%</strong></div><div><small>Best Combo</small><strong>{result.bestCombo}</strong></div><div><small>Correct</small><strong>{result.correct}/{result.attempted}</strong></div></div>
    <section className="review"><h2>Review these words</h2>{review.length ? review.map((word) => <div className="review-row" key={word.japanese}><span>!</span><b lang="ja">{word.japanese}</b><small>{word.meaning}</small></div>) : <p className="perfect">Perfect round. Your path is sharp.</p>}</section>
    <section className="reward-card"><span><b>+{earnedXp} XP</b><small>RANK {rank.level} · {rank.title}</small></span><i><em style={{ width: `${rank.percent}%` }} /></i><strong>🔥 {player.streak} day streak</strong></section>
    {newAchievements.map((id) => { const crest = ACHIEVEMENTS.find((item) => item.id === id); return crest ? <section className="achievement-toast" key={id}><b lang="ja">{crest.japanese}</b><span><small>NEW CREST</small><strong>{crest.title}</strong></span></section> : null })}
    <section className="story-card"><span>REN · {result.mode === 'daily' ? 'DAILY CHALLENGE' : result.mode === 'focus' ? 'FOCUS TRAINING' : chapter.title.toUpperCase()}</span><p>{result.mode === 'daily' ? 'A little training each day keeps the blade bright.' : result.mode === 'focus' ? 'Weak points become strengths when we face them directly.' : passed ? chapter.complete : 'Reach 70% accuracy to clear this road. We will try again.'}</p></section>
    <div className="result-actions">{review.length > 0 && <button className="secondary-button" onClick={onReview}>REVIEW {review.length}</button>}<button className="primary-button" onClick={onJourney}>CONTINUE</button>{result.mode !== 'daily' && <button className="text-button" onClick={onReplay}>{result.mode === 'focus' ? 'Replay focus training' : 'Replay chapter'}</button>}</div>
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
  const [jlptLevel, setJlptLevel] = useState<JlptLevel>(() => (localStorage.getItem('samuright-jlpt-level') as JlptLevel) || 'N5')
  const chapters = getChapters(jlptLevel); const vocabulary = JLPT_VOCABULARY[jlptLevel]
  const [chapter, setChapter] = useState(() => getChapters((localStorage.getItem('samuright-jlpt-level') as JlptLevel) || 'N5')[0]); const [result, setResult] = useState<RoundSummary | null>(null)
  const [progress, setProgress] = useState<Progress>(() => loadProgress((localStorage.getItem('samuright-jlpt-level') as JlptLevel) || 'N5')); const [reviewWords, setReviewWords] = useState<VocabularyWord[]>([])
  const [learning, setLearning] = useState<LearningProfile>(loadLearning); const [runMode, setRunMode] = useState<RunMode>('chapter')
  const [player, setPlayer] = useState<PlayerProgression>(loadPlayerProgression); const [earnedXp, setEarnedXp] = useState(0); const [newAchievements, setNewAchievements] = useState<string[]>([])
  useEffect(() => { localStorage.setItem(`samuright-progress-${jlptLevel.toLowerCase()}`, JSON.stringify(progress)) }, [jlptLevel, progress])
  useEffect(() => { localStorage.setItem('samuright-learning-v1', JSON.stringify(learning)) }, [learning])
  useEffect(() => { localStorage.setItem('samuright-player-v1', JSON.stringify(player)) }, [player])
  const chooseLevel = (level: JlptLevel) => {
    localStorage.setItem('samuright-jlpt-level', level); setJlptLevel(level)
    const nextChapters = getChapters(level); setChapter(nextChapters[0]); setProgress(loadProgress(level)); setResult(null); setReviewWords([]); setScreen('journey')
  }
  const chooseChapter = (selected: Chapter) => { if (selected.number >= 2) setProgress((current) => ({ ...current, companionMet: true })); setRunMode('chapter'); setChapter(selected); setResult(null); setScreen('dialogue') }
  const startRound = () => setScreen('game')
  const startFocus = () => {
    const weak = vocabulary.filter((word) => { const mastery = learning.mastery[wordKey(word)]; return mastery?.seen && mastery.level < 2 })
    if (!weak.length) return
    setRunMode('focus'); setReviewWords(weak); setResult(null); setScreen('game')
  }
  const startDaily = () => { setRunMode('daily'); setReviewWords(dailyDeck(vocabulary, jlptLevel)); setResult(null); setScreen('game') }
  const complete = useCallback((summary: RoundSummary) => {
    const accuracy = summary.attempted ? Math.round(summary.correct / summary.attempted * 100) : 0
    const session: SessionRecord = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, chapterId: chapter.id, score: summary.score, accuracy, date: Date.now(), mode: summary.mode, jlptLevel }
    setLearning((current) => { const updated = updateMastery(current, summary.outcomes); return { ...updated, sessions: [session, ...updated.sessions].slice(0, 30) } })
    setPlayer((current) => { const reward = rewardRound(current, summary); setEarnedXp(reward.earnedXp); setNewAchievements(reward.newlyUnlocked); return reward.progression })
    setResult(summary); setReviewWords(uniqueWords(summary.incorrect))
    if (summary.mode === 'chapter') setProgress((current) => {
      const passed = accuracy >= 70
      return { ...current, unlocked: passed ? Math.max(current.unlocked, Math.min(chapters.length, chapter.number + 1)) : current.unlocked, completed: passed && !current.completed.includes(chapter.id) ? [...current.completed, chapter.id] : current.completed, bestScores: { ...current.bestScores, [chapter.id]: Math.max(current.bestScores[chapter.id] ?? 0, summary.score) } }
    })
    setScreen('results')
  }, [chapter, chapters.length, jlptLevel])
  const resetAll = () => { setProgress(defaultProgress); setLearning(emptyProfile()); setPlayer(emptyProgression()); setResult(null); setReviewWords([]); localStorage.removeItem('samuright-progress'); JLPT_LEVELS.forEach((level) => localStorage.removeItem(`samuright-progress-${level.toLowerCase()}`)); localStorage.removeItem('samuright-learning-v1'); localStorage.removeItem('samuright-player-v1'); localStorage.removeItem('samuright-jlpt-level'); setJlptLevel('N5'); setChapter(getChapters('N5')[0]); setScreen('start') }
  if (screen === 'start') return <StartScreen sound={sound} setSound={setSound} onJourney={() => setScreen('level')} />
  if (screen === 'level') return <LevelScreen selected={jlptLevel} onSelect={chooseLevel} onBack={() => setScreen('start')} />
  if (screen === 'journey') return <JourneyScreen progress={progress} profile={learning} player={player} level={jlptLevel} chapters={chapters} words={vocabulary} onChapter={chooseChapter} onFocus={startFocus} onDaily={startDaily} onOpen={setScreen} />
  if (screen === 'dialogue') return <DialogueScreen chapter={chapter} lines={chapter.intro} onContinue={startRound} />
  if (screen === 'results' && result) return <ResultsScreen chapter={chapter} result={result} passed={result.mode !== 'chapter' || (result.attempted ? result.correct / result.attempted >= .7 : false)} earnedXp={earnedXp} newAchievements={newAchievements} player={player} onJourney={() => setScreen('journey')} onReplay={() => runMode === 'focus' ? startFocus() : runMode === 'daily' ? startDaily() : setScreen('dialogue')} onReview={() => setScreen('review')} />
  if (screen === 'review' && reviewWords.length) return <ReviewScreen words={reviewWords} onDone={() => setScreen('results')} />
  if (screen === 'wordbook') return <WordbookScreen profile={learning} words={vocabulary} level={jlptLevel} onBack={() => setScreen('journey')} />
  if (screen === 'history') return <HistoryScreen sessions={learning.sessions} chapters={chapters} onBack={() => setScreen('journey')} />
  if (screen === 'achievements') return <AchievementsScreen player={player} onBack={() => setScreen('journey')} onHistory={() => setScreen('history')} />
  if (screen === 'settings') return <SettingsScreen level={jlptLevel} onChangeLevel={() => setScreen('level')} onBack={() => setScreen('journey')} onReset={resetAll} />
  return <GameScreen sound={sound} chapter={chapter} words={runMode === 'chapter' ? chapter.words : reviewWords} profile={learning} runMode={runMode} companionMet={progress.companionMet} onComplete={complete} />
}

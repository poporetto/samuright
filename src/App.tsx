import { useCallback, useEffect, useRef, useState } from 'react'
import type Phaser from 'phaser'
import { getChapters, type Chapter, type ChapterPart, type DialogueLine } from './data/chapters'
import { createGame } from './game/createGame'
import { gameEvents } from './game/events'
import { ROUND_SECONDS, STARTING_LIVES, STORY_FOCUS, STORY_RESOLVE } from './game/rules'
import type { Feedback, HudState, JlptLevel, RoundSummary, RunMode, VocabularyWord } from './game/types'
import { emptyProfile, masteryLabel, updateMastery, wordKey, type LearningProfile, type SessionRecord } from './game/learning'
import { JLPT_LEVELS, JLPT_VOCABULARY } from './data/jlptVocabulary'
import { ACHIEVEMENTS, dateKey, emptyProgression, rankForXp, rewardRound, type PlayerProgression } from './game/progression'

type Screen = 'start' | 'level' | 'journey' | 'dojo' | 'dialogue' | 'game' | 'epilogue' | 'results' | 'review' | 'wordbook' | 'history' | 'achievements' | 'settings'
type Progress = { unlocked: number; completed: string[]; completedParts: string[]; bestScores: Record<string, number>; companionMet: boolean }
const defaultProgress: Progress = { unlocked: 1, completed: [], completedParts: [], bestScores: {}, companionMet: false }
const initialHud: HudState = { score: 0, lives: STARTING_LIVES, combo: 0, secondsLeft: ROUND_SECONDS, current: { japanese: '食べる', reading: 'たべる', meaning: 'to eat' }, prompt: '食べる', promptLabel: 'Slash the meaning of', promptReading: 'たべる', mode: 'japanese-meaning', focus: STORY_FOCUS, maxFocus: STORY_FOCUS, resolve: STORY_RESOLVE, maxResolve: STORY_RESOLVE, battlePhase: 1 }
const mascotAnimation = `${import.meta.env.BASE_URL}assets/mascot/ronin-pixel-single-sword-v9-strip.png`
const MASCOT_FRAME_COUNT = 20
const companionAnimation = `${import.meta.env.BASE_URL}assets/mascot/companion-pixel-pouch-v4-strip.png`
const companionGoofyAnimation = `${import.meta.env.BASE_URL}assets/mascot/companion-goofy-downtime-v6-strip.png`
const COMPANION_FRAME_COUNT = 20
const MASCOT_SLASH_RESET_MS = 440
const renDialogueArtwork = `${import.meta.env.BASE_URL}assets/characters/ren-dialogue-art-v1.webp`
const hanaDialogueArtwork = `${import.meta.env.BASE_URL}assets/characters/hana-dialogue-pouch-art-v2.webp`
const startScreenKeyArt = `${import.meta.env.BASE_URL}assets/backgrounds/start-screen-key-art-v1.webp`
const castArtwork: Record<string, string> = {
  'iwao-jubei': `${import.meta.env.BASE_URL}assets/characters/cast/iwao-jubei.webp`,
  saburo: `${import.meta.env.BASE_URL}assets/characters/cast/saburo.webp`,
  'ashigaru-foot-soldier': `${import.meta.env.BASE_URL}assets/characters/cast/ashigaru-foot-soldier.webp`,
  'mizuno-kichiro': `${import.meta.env.BASE_URL}assets/characters/cast/mizuno-kichiro.webp`,
  'lady-shizuru': `${import.meta.env.BASE_URL}assets/characters/cast/lady-shizuru.webp`,
  'takamine-harunobu': `${import.meta.env.BASE_URL}assets/characters/cast/takamine-harunobu.webp`,
  'genzo-masatsugu': `${import.meta.env.BASE_URL}assets/characters/cast/genzo-masatsugu.webp`,
  'akane-tomoe': `${import.meta.env.BASE_URL}assets/characters/cast/akane-tomoe.webp`,
  masanori: `${import.meta.env.BASE_URL}assets/characters/cast/masanori.webp`,
  'takamine-nobumasa': `${import.meta.env.BASE_URL}assets/characters/cast/takamine-nobumasa.webp`,
}
const speakerArtwork: Partial<Record<string, string>> = {
  REN: renDialogueArtwork,
  HANA: hanaDialogueArtwork,
  JŪBEI: castArtwork['iwao-jubei'],
  SABURŌ: castArtwork.saburo,
  ASHIGARU: castArtwork['ashigaru-foot-soldier'],
  KICHIROU: castArtwork['mizuno-kichiro'],
  SHIZURU: castArtwork['lady-shizuru'],
  HARU: castArtwork['takamine-harunobu'],
  HARUNOBU: castArtwork['takamine-harunobu'],
  GENZOU: castArtwork['genzo-masatsugu'],
  AKANE: castArtwork['akane-tomoe'],
  MASANORI: castArtwork.masanori,
  NOBUMASA: castArtwork['takamine-nobumasa'],
}
const chapterBackgrounds: Record<number, string> = {
  1: `${import.meta.env.BASE_URL}assets/backgrounds/chapter-1-eastern-road-v1.webp`,
  2: `${import.meta.env.BASE_URL}assets/backgrounds/chapter-2-river-crossing-v1.webp`,
  3: `${import.meta.env.BASE_URL}assets/backgrounds/chapter-3-lantern-town-v1.webp`,
  4: `${import.meta.env.BASE_URL}assets/backgrounds/chapter-4-bamboo-dojo-v1.webp`,
  5: `${import.meta.env.BASE_URL}assets/backgrounds/chapter-5-foxfire-inn-v1.webp`,
  6: `${import.meta.env.BASE_URL}assets/backgrounds/chapter-6-lordless-village-v1.webp`,
  7: `${import.meta.env.BASE_URL}assets/backgrounds/chapter-7-crimson-pass-v1.webp`,
  8: `${import.meta.env.BASE_URL}assets/backgrounds/chapter-8-white-heron-castle-v1.webp`,
  9: `${import.meta.env.BASE_URL}assets/backgrounds/chapter-9-broken-alliance-v1.webp`,
  10: `${import.meta.env.BASE_URL}assets/backgrounds/chapter-10-golden-dojo-v1.webp`,
  11: `${import.meta.env.BASE_URL}assets/backgrounds/chapter-11-road-home-v1.webp`,
}

const storyCrests: Partial<Record<number, { kanji: string; title: string }>> = {
  4: { kanji: '律', title: 'Discipline' },
  5: { kanji: '観', title: 'Perception' },
  6: { kanji: '慈', title: 'Compassion' },
  7: { kanji: '勇', title: 'Courage' },
  8: { kanji: '智', title: 'Wisdom' },
}

const saveLocal = (key: string, value: unknown) => {
  try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)) }
  catch { /* Progress remains in memory if private browsing blocks storage. */ }
}
const readLocal = (key: string) => {
  try { return localStorage.getItem(key) }
  catch { return null }
}
const removeLocal = (key: string) => {
  try { localStorage.removeItem(key) }
  catch { /* Storage may be unavailable in private browsing. */ }
}

const loadProgress = (level: JlptLevel): Progress => {
  try {
    const saved = JSON.parse(readLocal(`samuright-progress-${level.toLowerCase()}`) ?? (level === 'N5' ? readLocal('samuright-progress') : '') ?? '') as Progress
    const prefix = (id: string) => id.startsWith('n5-') ? id : `n5-${id}`
    const completed = level === 'N5' ? (saved.completed ?? []).map(prefix) : saved.completed ?? []
    const bestScores = level === 'N5' ? Object.fromEntries(Object.entries(saved.bestScores ?? {}).map(([id, score]) => [prefix(id), score])) : saved.bestScores ?? {}
    const legacyChapterOneComplete = completed.some((id) => id.endsWith('-eastern-road'))
    const legacyChapterTwoComplete = completed.some((id) => id.endsWith('-river-crossing'))
    const legacyChapterThreeComplete = completed.some((id) => id.endsWith('-lantern-town'))
    const legacyChapterFourComplete = completed.some((id) => id.endsWith('-bamboo-dojo'))
    const legacyChapterFiveComplete = completed.some((id) => id.endsWith('-foxfire-inn'))
    const legacyChapterSixComplete = completed.some((id) => id.endsWith('-lordless-village'))
    const levelPrefix = level.toLowerCase()
    const migratedChapterOneParts = legacyChapterOneComplete ? ['departure', 'five-masters', 'first-lesson'].map((id) => `${levelPrefix}-eastern-road-${id}`) : []
    const migratedChapterTwoParts = legacyChapterTwoComplete ? ['disobedient-river', 'ordinary-traveller', 'river-wolf'].map((id) => `${levelPrefix}-river-crossing-${id}`) : []
    const migratedChapterThreeParts = legacyChapterThreeComplete ? ['lantern-gate', 'market-pursuit', 'captains-judgment'].map((id) => `${levelPrefix}-lantern-town-${id}`) : []
    const migratedChapterFourParts = legacyChapterFourComplete ? ['master-in-the-mist', 'broken-rhythm', 'discipline-crest'].map((id) => `${levelPrefix}-bamboo-dojo-${id}`) : []
    const migratedChapterFiveParts = legacyChapterFiveComplete ? ['room-with-two-doors', 'stranger-by-firelight', 'perception-crest'].map((id) => `${levelPrefix}-foxfire-inn-${id}`) : []
    const migratedChapterSixParts = legacyChapterSixComplete ? ['empty-granary', 'unjust-tithe', 'compassion-crest'].map((id) => `${levelPrefix}-lordless-village-${id}`) : []
    const completedParts = Array.from(new Set([...(saved.completedParts ?? []), ...migratedChapterOneParts, ...migratedChapterTwoParts, ...migratedChapterThreeParts, ...migratedChapterFourParts, ...migratedChapterFiveParts, ...migratedChapterSixParts]))
    const chapterOrder = ['eastern-road', 'river-crossing', 'lantern-town', 'bamboo-dojo', 'foxfire-inn', 'lordless-village', 'crimson-pass', 'white-heron-castle', 'broken-alliance', 'golden-dojo', 'road-home']
    const highestCompleted = chapterOrder.reduce((highest, slug, index) => completed.some((id) => id.endsWith(`-${slug}`)) ? Math.max(highest, index + 1) : highest, 0)
    const unlocked = Math.max(saved.unlocked ?? 1, Math.min(chapterOrder.length, highestCompleted + 1))
    return { ...defaultProgress, ...saved, completed, completedParts, bestScores, unlocked }
  }
  catch { return defaultProgress }
}
const loadLearning = (): LearningProfile => {
  try { const saved = JSON.parse(readLocal('samuright-learning-v1') ?? ''); return saved?.version === 1 ? saved : emptyProfile() }
  catch { return emptyProfile() }
}
const loadPlayerProgression = (): PlayerProgression => {
  try { const saved = JSON.parse(readLocal('samuright-player-v1') ?? ''); return saved?.version === 1 ? { ...emptyProgression(), ...saved } : emptyProgression() }
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

function CompanionPortrait({ frame = 0, className = '', animation = companionAnimation }: { frame?: number; className?: string; animation?: string }) {
  const safeFrame = Math.min(COMPANION_FRAME_COUNT - 1, Math.max(0, frame))
  return <div className={`companion-portrait ${className}`} aria-hidden="true"><div style={{ backgroundImage: `url(${animation})`, backgroundPosition: `${(safeFrame / (COMPANION_FRAME_COUNT - 1)) * 100}% center` }} /></div>
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
  const [animation, setAnimation] = useState(companionAnimation)
  useEffect(() => {
    const sequence = companionReactionFrames[reaction.kind]
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setAnimation(companionAnimation)
    if (reducedMotion) { setFrame(reaction.kind === 'idle' ? 0 : sequence[sequence.length - 1]); return }
    let index = 0
    setFrame(sequence[0])
    let timer: number | null = window.setInterval(() => {
      if (reaction.kind !== 'idle' && index === sequence.length - 1) {
        if (timer !== null) window.clearInterval(timer)
        timer = null
        return
      }
      index = (index + 1) % sequence.length
      setFrame(sequence[index])
    }, companionReactionFrameMs[reaction.kind])
    let goofyTimer: number | null = null
    let returnTimer: number | null = null
    const scheduleGoofyMoment = () => {
      goofyTimer = window.setTimeout(() => {
        if (timer !== null) window.clearInterval(timer)
        const activityStart = Math.floor(Math.random() * 5) * 4
        let activityFrame = 0
        setAnimation(companionGoofyAnimation)
        setFrame(activityStart)
        timer = window.setInterval(() => {
          activityFrame += 1
          if (activityFrame >= 4) {
            if (timer !== null) window.clearInterval(timer)
            timer = null
            return
          }
          setFrame(activityStart + activityFrame)
        }, 520)
        returnTimer = window.setTimeout(() => {
          setAnimation(companionAnimation)
          index = 0
          setFrame(sequence[0])
          timer = window.setInterval(() => {
            index = (index + 1) % sequence.length
            setFrame(sequence[index])
          }, companionReactionFrameMs.idle)
          scheduleGoofyMoment()
        }, 2550)
      }, 6500 + Math.floor(Math.random() * 3500))
    }
    if (reaction.kind === 'idle') scheduleGoofyMoment()
    return () => {
      if (timer !== null) window.clearInterval(timer)
      if (goofyTimer !== null) window.clearTimeout(goofyTimer)
      if (returnTimer !== null) window.clearTimeout(returnTimer)
    }
  }, [reaction.cue, reaction.kind])
  return <CompanionPortrait className={`companion-mascot companion-mascot--${reaction.kind} ${animation === companionGoofyAnimation ? 'companion-mascot--goofy' : ''}`} frame={frame} animation={animation} />
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

function StartScreen({ sound, setSound, onStory, onDojo }: { sound: boolean; setSound: (value: boolean) => void; onStory: () => void; onDojo: () => void }) {
  return <main className="screen start-screen">
    <div className="start-key-art" aria-hidden="true"><img src={startScreenKeyArt} alt="" draggable="false" /></div>
    <button className="icon-button sound-button" onClick={() => setSound(!sound)} aria-label={sound ? 'Mute sound' : 'Enable sound'}>{sound ? '◖))' : '◖×'}</button>
    <div className="brand">SAMURIGHT</div>
    <section className="start-copy"><p className="eyebrow">A journey through words.</p><h1 lang="ja">旅</h1><p className="translation">the journey</p><div className="mode-actions"><button className="primary-button" onClick={onStory}>STORY MODE</button><button className="dojo-button" onClick={onDojo}><span>DOJO MODE</span><small>Quick training · High score</small></button></div><p className="swipe-hint"><span>↔</span> Learn by the blade</p></section>
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

function DojoScreen({ level, onStart, onBack }: { level: JlptLevel; onStart: () => void; onBack: () => void }) {
  return <main className="screen dojo-screen"><SubHeader title="Dojo Mode" onBack={onBack} />
    <header className="dojo-heading"><p className="eyebrow">自由稽古 · FREE TRAINING</p><h1>Two-Minute Trial</h1><p>Sharpen speed, accuracy, and combos with your full {level} vocabulary deck.</p></header>
    <section className="dojo-trial"><div className="dojo-mon" lang="ja">道</div><span><small>SELECTED TRIAL</small><strong>Two-Minute Trial</strong><p>Three Focus · Increasing speed · High score</p></span></section>
    <section className="dojo-rules"><div><b>02:00</b><small>TIME</small></div><div><b>3</b><small>FOCUS</small></div><div><b>{level}</b><small>DECK</small></div></section>
    <button className="primary-button" onClick={onStart}>BEGIN TRAINING</button><PixelPortrait className="dojo-mascot" />
  </main>
}

function JourneyScreen({ progress, profile, player, level, chapters, words, onChapter, onPart, onFocus, onDaily, onOpen }: { progress: Progress; profile: LearningProfile; player: PlayerProgression; level: JlptLevel; chapters: Chapter[]; words: VocabularyWord[]; onChapter: (chapter: Chapter) => void; onPart: (chapter: Chapter, part: ChapterPart) => void; onFocus: () => void; onDaily: () => void; onOpen: (screen: Screen) => void }) {
  const weakCount = words.filter((word) => (profile.mastery[wordKey(word)]?.level ?? 0) < 2 && (profile.mastery[wordKey(word)]?.seen ?? 0) > 0).length
  const mastered = words.filter((word) => (profile.mastery[wordKey(word)]?.level ?? 0) >= 4).length
  const rank = rankForXp(player.xp); const dailyDone = player.dailyCompletedDate === dateKey()
  const campaignComplete = chapters.length > 0 && progress.completed.includes(chapters[chapters.length - 1].id)
  const firstOpenChapter = chapters.find((chapter) => chapter.number <= progress.unlocked && chapter.parts?.some((part) => !progress.completedParts.includes(part.id)))
    ?? chapters.find((chapter) => chapter.number <= progress.unlocked && chapter.parts?.length)
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(firstOpenChapter?.id ?? null)
  return <main className="screen journey-screen">
    <header className="journey-header"><div className="brand brand--small">SAMURIGHT</div><p className="eyebrow">REN'S JOURNEY</p><h1>Choose a chapter or stage</h1></header>
    {campaignComplete && <section className="journey-complete"><b lang="ja">剣聖</b><span><small>JOURNEY COMPLETE</small><strong>Ren has become a Sword Saint</strong><p>The road continues wherever there is more to learn.</p></span></section>}
    <section className="player-rank"><span><b>RANK {rank.level}</b><small>{rank.title}</small></span><i><em style={{ width: `${rank.percent}%` }} /></i><strong>🔥 {player.streak}</strong></section>
    <div className="journey-path" aria-hidden="true" />
    <section className="chapter-list">
      {chapters.map((chapter) => {
        const unlocked = chapter.number <= progress.unlocked
        const complete = progress.completed.includes(chapter.id)
        const completedPartCount = chapter.parts?.filter((part) => progress.completedParts.includes(part.id)).length ?? 0
        const expanded = chapter.id === expandedChapterId
        return <div className={`chapter-group ${expanded ? 'is-expanded' : ''}`} key={chapter.id}>
          <button className={`chapter-node ${complete ? 'is-complete' : ''}`} disabled={!unlocked} onClick={() => chapter.parts?.length ? setExpandedChapterId(expanded ? null : chapter.id) : onChapter(chapter)} aria-expanded={chapter.parts?.length ? expanded : undefined}>
            <span className="chapter-number">{complete ? '✓' : unlocked ? chapter.number : '◇'}</span>
            <span><small>CHAPTER {chapter.number}</small><strong>{chapter.title}</strong><i lang="ja">{chapter.japaneseTitle}</i><em>{chapter.description}</em></span>
            {chapter.parts ? <b>{completedPartCount}/{chapter.parts.length}<small> STAGES</small><span aria-hidden="true">{expanded ? '⌃' : '⌄'}</span></b> : progress.bestScores[chapter.id] ? <b>{progress.bestScores[chapter.id].toLocaleString()}</b> : null}
          </button>
          {expanded && unlocked && chapter.parts && <div className="chapter-parts-inline">
            {chapter.parts.map((part, index) => {
              const partComplete = progress.completedParts.includes(part.id)
              const partUnlocked = index === 0 || progress.completedParts.includes(chapter.parts![index - 1].id)
              const roman = ['I', 'II', 'III'][index] ?? String(index + 1)
              return <button className={`chapter-part-node ${partComplete ? 'is-complete' : ''}`} disabled={!partUnlocked} onClick={() => onPart(chapter, part)} key={part.id}>
                <span>{partComplete ? '✓' : partUnlocked ? roman : '◇'}</span>
                <div><small>STAGE {roman}</small><strong>{part.title}</strong><p>{part.description}</p><em>{part.words.length} words</em></div>
                <b aria-hidden="true">›</b>
              </button>
            })}
          </div>}
        </div>
      })}
    </section>
    <button className={`daily-cta ${dailyDone ? 'is-complete' : ''}`} onClick={onDaily} disabled={dailyDone}><span>{dailyDone ? '✓ DAILY TRAINING COMPLETE' : '☀ DAILY CHALLENGE'}</span><b>{dailyDone ? 'Return tomorrow' : '12 words · 60 sec · +75 XP'}</b></button>
    <nav className="learning-nav"><button onClick={() => onOpen('wordbook')}>WORD BOOK <b>{mastered}/{words.length}</b></button><button onClick={() => onOpen('achievements')}>CRESTS <b>{player.achievements.length}/6</b></button><button onClick={() => onOpen('settings')}>{level} · ⚙</button></nav>
    {weakCount > 0 && <button className="focus-cta" onClick={onFocus}><span>FOCUS TRAINING</span><b>{weakCount} weak words · 45 sec</b></button>}
    <PixelPortrait className="journey-mascot" />
  </main>
}

function DialogueScreen({ chapter, lines, onContinue, phase = 'CHAPTER' }: { chapter: Chapter; lines: DialogueLine[]; onContinue: () => void; phase?: 'CHAPTER' | 'EPILOGUE' }) {
  const [line, setLine] = useState(0)
  const next = () => line < lines.length - 1 ? setLine(line + 1) : onContinue()
  const activeLine = lines[line]
  const speaker = activeLine.speaker.toLowerCase()
  const artwork = speakerArtwork[activeLine.speaker]
  const displaySpeaker = activeLine.speaker === 'NARRATOR' ? 'NARRATOR' : chapter.number === 1 && activeLine.speaker === 'JŪBEI' ? 'WANDERING SWORDSMAN' : activeLine.speaker
  return <main className="screen dialogue-screen">
    <div className="dialogue-background" aria-hidden="true">
      <img src={chapterBackgrounds[chapter.number]} alt="" draggable="false" />
    </div>
    <header className="dialogue-heading"><p className="eyebrow">{phase === 'EPILOGUE' ? `CHAPTER ${chapter.number} · EPILOGUE` : `CHAPTER ${chapter.number}`}</p><h1>{chapter.title}</h1><p className="chapter-japanese" lang="ja">{chapter.japaneseTitle}</p></header>
    {artwork && <div key={`${speaker}-${line}`} className={`dialogue-art dialogue-art--${speaker}`} aria-hidden="true">
      <img src={artwork} alt="" draggable="false" />
    </div>}
    <button className={`dialogue-box ${activeLine.speaker === 'NARRATOR' ? 'dialogue-box--narrator' : ''}`} type="button" onClick={next} aria-label={`${displaySpeaker}: ${activeLine.text}. Continue dialogue.`}>
      <span>{displaySpeaker}</span><p aria-live="polite">{activeLine.text}</p><small>{line + 1} / {lines.length} · TAP TO CONTINUE</small>
    </button>
  </main>
}

function GameScreen({ sound, chapter, words, profile, runMode, companionMet, onComplete }: { sound: boolean; chapter: Chapter; words: VocabularyWord[]; profile: LearningProfile; runMode: RunMode; companionMet: boolean; onComplete: (result: RoundSummary) => void }) {
  const host = useRef<HTMLDivElement>(null); const game = useRef<Phaser.Game | null>(null)
  const companionTimer = useRef<number | null>(null); const mascotTimer = useRef<number | null>(null); const opponentTimer = useRef<number | null>(null); const battleTimer = useRef<number | null>(null); const correctCheerCount = useRef(0)
  const [hud, setHud] = useState(initialHud); const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [mascot, setMascot] = useState<{ state: 'idle' | 'track' | 'slash'; dx?: number; dy?: number }>({ state: 'idle' })
  const [companionReaction, setCompanionReaction] = useState<CompanionReaction>({ kind: 'idle', cue: 0 })
  const [opponentLine, setOpponentLine] = useState<string | null>(chapter.opponent.opening)
  const [battleCue, setBattleCue] = useState<{ title: string; message: string } | null>(null)
  const showCompanion = runMode === 'chapter' ? chapter.number >= 2 : companionMet
  const masterEncounter = runMode === 'chapter' && chapter.opponent.masterEncounter === true
  useEffect(() => {
    correctCheerCount.current = 0
    const showOpponentLine = (line: string, duration = 1900) => {
      if (opponentTimer.current !== null) window.clearTimeout(opponentTimer.current)
      setOpponentLine(line)
      opponentTimer.current = window.setTimeout(() => {
        setOpponentLine(null)
        opponentTimer.current = null
      }, duration)
    }
    if (runMode === 'chapter' && !chapter.opponent.hidden) showOpponentLine(chapter.opponent.opening, 2800)
    const offHud = gameEvents.on('hud', setHud)
    const offFeedback = gameEvents.on('feedback', (value) => {
      setFeedback(value); window.setTimeout(() => setFeedback(null), 520)
      if (masterEncounter) showOpponentLine(value.type === 'correct' ? chapter.opponent.pressured : chapter.opponent.counter)
      if (!showCompanion) return

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
    const offBattle = gameEvents.on('battle', (cue) => {
      if (battleTimer.current !== null) window.clearTimeout(battleTimer.current)
      setBattleCue(cue)
      battleTimer.current = window.setTimeout(() => { setBattleCue(null); battleTimer.current = null }, cue.type === 'ability' ? 1700 : 2100)
    })
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
    if (host.current) game.current = createGame(host.current, sound, words, profile, runMode, runMode === 'chapter' ? chapter.opponent.id : undefined, masterEncounter)
    return () => { offHud(); offFeedback(); offComplete(); offBattle(); offMascot(); if (companionTimer.current !== null) window.clearTimeout(companionTimer.current); if (mascotTimer.current !== null) window.clearTimeout(mascotTimer.current); if (opponentTimer.current !== null) window.clearTimeout(opponentTimer.current); if (battleTimer.current !== null) window.clearTimeout(battleTimer.current); game.current?.destroy(true); game.current = null }
  }, [chapter.opponent.counter, chapter.opponent.opening, chapter.opponent.pressured, masterEncounter, onComplete, profile, runMode, showCompanion, sound, words])
  return <main className={`screen game-screen game-screen--${runMode}`}><div ref={host} className="game-canvas" />
    <header className="hud"><span>✦ <b>{hud.score.toLocaleString()}</b></span><span className="combo">×{hud.combo}</span><span className="hud-vitals"><small><b>FOCUS</b><i><em style={{ width: `${hud.focus / hud.maxFocus * 100}%` }} /></i></small>{runMode === 'chapter' && <small><b>{chapter.opponent.hidden ? 'PRACTICE' : `${masterEncounter ? `P${hud.battlePhase}` : chapter.number === 1 ? 'PRACTICE' : 'ENCOUNTER'} · ${chapter.opponent.name.toUpperCase()}`}</b><i><em className="resolve-fill" style={{ width: `${hud.resolve / hud.maxResolve * 100}%` }} /></i></small>}</span><span>◷ <b>{formatTime(hud.secondsLeft)}</b></span></header>
    <div className="chapter-chip">{runMode === 'focus' ? 'Focus Training' : runMode === 'daily' ? 'Daily Challenge' : runMode === 'dojo' ? 'Dojo Mode' : chapter.title}</div>
    <section className={`question question--${hud.mode}`} aria-live="polite"><p>{hud.promptLabel}</p><h2 lang={hud.mode === 'meaning-japanese' ? 'en' : 'ja'}>{hud.prompt}</h2>{hud.promptReading && <small>{hud.promptReading}</small>}</section>
    {runMode === 'chapter' && !chapter.opponent.hidden && opponentLine && <aside key={opponentLine} className="battle-opponent" aria-live="polite"><div className="battle-opponent__portrait"><img src={castArtwork[chapter.opponent.id]} alt={chapter.opponent.name} /></div><div className="battle-opponent__bubble"><span>{chapter.opponent.name}</span><small>{chapter.opponent.title}</small><p>{opponentLine}</p></div></aside>}
    {battleCue && <div key={battleCue.title} className="battle-cue" aria-live="assertive"><b>{battleCue.title}</b><span>{battleCue.message}</span></div>}
    {feedback && <div className={`feedback feedback--${feedback.type}`}>{feedback.type === 'correct' ? <><span lang="ja">正解</span><small>CORRECT</small></> : feedback.message}</div>}{showCompanion && <CompanionMascot key={`${companionReaction.kind}-${companionReaction.cue}`} reaction={companionReaction} />}<Mascot {...mascot} />
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
  return <main className="screen library-screen"><SubHeader title="Session History" onBack={onBack} /><section className="session-list">{sessions.length ? sessions.map((session) => <article key={session.id}><span>{session.jlptLevel ? `${session.jlptLevel} · ` : ''}{session.mode === 'focus' ? 'FOCUS' : session.mode === 'daily' ? 'DAILY' : session.mode === 'dojo' ? 'DOJO' : chapters.find((c) => c.id === session.chapterId)?.title ?? 'Chapter'}</span><strong>{session.score.toLocaleString()}</strong><b>{session.accuracy}%</b><small>{new Date(session.date).toLocaleDateString()}</small></article>) : <p className="empty-state">Complete a round to begin your training record.</p>}</section></main>
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

function ResultsScreen({ chapter, result, passed, earnedXp, newAchievements, player, storyCrest, campaignComplete, onJourney, onReplay, onReview }: { chapter: Chapter; result: RoundSummary; passed: boolean; earnedXp: number; newAchievements: string[]; player: PlayerProgression; storyCrest?: { kanji: string; title: string }; campaignComplete: boolean; onJourney: () => void; onReplay: () => void; onReview: () => void }) {
  const accuracy = result.attempted ? Math.round(result.correct / result.attempted * 100) : 0
  const review = uniqueWords(result.incorrect).slice(0, 4)
  const rank = rankForXp(player.xp)
  return <main className="screen results-screen"><div className="brand brand--small">SAMURIGHT</div><p className="eyebrow">{campaignComplete ? 'JOURNEY COMPLETE' : result.mode === 'daily' ? 'DAILY CHALLENGE COMPLETE' : result.mode === 'dojo' ? 'DOJO TRAINING COMPLETE' : result.mode === 'focus' ? 'FOCUS TRAINING' : passed ? `CHAPTER ${chapter.number} CLEARED` : `CHAPTER ${chapter.number} · KEEP TRAINING`}</p><h1 className="final-score">{result.score.toLocaleString()}</h1><p className="score-label">FINAL SCORE</p>
    <div className="stats"><div><small>Accuracy</small><strong>{accuracy}%</strong></div><div><small>Best Combo</small><strong>{result.bestCombo}</strong></div><div><small>Correct</small><strong>{result.correct}/{result.attempted}</strong></div></div>
    <section className="review"><h2>Review these words</h2>{review.length ? review.map((word) => <div className="review-row" key={word.japanese}><span>!</span><b lang="ja">{word.japanese}</b><small>{word.meaning}</small></div>) : <p className="perfect">Perfect round. Your path is sharp.</p>}</section>
    <section className="reward-card"><span><b>+{earnedXp} XP</b><small>RANK {rank.level} · {rank.title}</small></span><i><em style={{ width: `${rank.percent}%` }} /></i><strong>🔥 {player.streak} day streak</strong></section>
    {result.mode === 'chapter' && passed && storyCrest && <section className="achievement-toast story-crest"><b lang="ja">{storyCrest.kanji}</b><span><small>MASTER CREST EARNED</small><strong>{storyCrest.title}</strong></span></section>}
    {campaignComplete && <section className="campaign-finale"><b lang="ja">剣聖</b><span><small>THE GOLDEN DOJO RECOGNISES REN</small><strong>Sword Saint</strong><p>He reached the end of this journey without losing the joy that began it.</p></span></section>}
    {newAchievements.map((id) => { const crest = ACHIEVEMENTS.find((item) => item.id === id); return crest ? <section className="achievement-toast" key={id}><b lang="ja">{crest.japanese}</b><span><small>NEW CREST</small><strong>{crest.title}</strong></span></section> : null })}
    {(result.mode !== 'chapter' || !passed) && <section className="story-card"><span>REN · {result.mode === 'daily' ? 'DAILY CHALLENGE' : result.mode === 'dojo' ? 'DOJO MODE' : result.mode === 'focus' ? 'FOCUS TRAINING' : chapter.title.toUpperCase()}</span><p>{result.mode === 'daily' ? 'A little training each day keeps the blade bright.' : result.mode === 'dojo' ? 'The dojo sharpens speed, accuracy, and resolve.' : result.mode === 'focus' ? 'Weak points become strengths when we face them directly.' : 'Reach 70% accuracy to complete this chapter. We will try again.'}</p></section>}
    <div className="result-actions">{review.length > 0 && <button className="secondary-button" onClick={onReview}>REVIEW {review.length}</button>}<button className="primary-button" onClick={onJourney}>{campaignComplete ? 'RETURN TO THE JOURNEY' : 'CONTINUE'}</button>{result.mode !== 'daily' && <button className="text-button" onClick={onReplay}>{result.mode === 'focus' ? 'Replay focus training' : 'Replay chapter'}</button>}</div>
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
  const [jlptLevel, setJlptLevel] = useState<JlptLevel>(() => (readLocal('samuright-jlpt-level') as JlptLevel) || 'N5')
  const chapters = getChapters(jlptLevel); const vocabulary = JLPT_VOCABULARY[jlptLevel]
  const [chapter, setChapter] = useState(() => getChapters((readLocal('samuright-jlpt-level') as JlptLevel) || 'N5')[0]); const [result, setResult] = useState<RoundSummary | null>(null)
  const [selectedPart, setSelectedPart] = useState<ChapterPart | null>(null)
  const [progress, setProgress] = useState<Progress>(() => loadProgress((readLocal('samuright-jlpt-level') as JlptLevel) || 'N5')); const [reviewWords, setReviewWords] = useState<VocabularyWord[]>([])
  const [learning, setLearning] = useState<LearningProfile>(loadLearning); const [runMode, setRunMode] = useState<RunMode>('chapter')
  const [player, setPlayer] = useState<PlayerProgression>(loadPlayerProgression); const [earnedXp, setEarnedXp] = useState(0); const [newAchievements, setNewAchievements] = useState<string[]>([])
  const activeStory: Chapter = selectedPart ? { ...chapter, title: selectedPart.title, description: selectedPart.description, intro: selectedPart.intro, epilogue: selectedPart.epilogue, opponent: selectedPart.opponent, complete: selectedPart.complete, words: selectedPart.words } : chapter
  useEffect(() => { saveLocal(`samuright-progress-${jlptLevel.toLowerCase()}`, progress) }, [jlptLevel, progress])
  useEffect(() => { saveLocal('samuright-learning-v1', learning) }, [learning])
  useEffect(() => { saveLocal('samuright-player-v1', player) }, [player])
  useEffect(() => {
    const flushProgress = () => saveLocal(`samuright-progress-${jlptLevel.toLowerCase()}`, progress)
    window.addEventListener('pagehide', flushProgress)
    return () => window.removeEventListener('pagehide', flushProgress)
  }, [jlptLevel, progress])
  const chooseLevel = (level: JlptLevel) => {
    saveLocal('samuright-jlpt-level', level); setJlptLevel(level)
    const nextChapters = getChapters(level); setChapter(nextChapters[0]); setSelectedPart(null); setProgress(loadProgress(level)); setResult(null); setReviewWords([]); setScreen('journey')
  }
  const chooseChapter = (selected: Chapter) => {
    if (selected.number >= 2) setProgress((current) => ({ ...current, companionMet: true }))
    setRunMode('chapter'); setChapter(selected); setSelectedPart(null); setResult(null)
    setScreen('dialogue')
  }
  const choosePart = (selected: Chapter, part: ChapterPart) => {
    if (selected.number >= 2) setProgress((current) => ({ ...current, companionMet: true }))
    setRunMode('chapter'); setChapter(selected); setSelectedPart(part); setResult(null)
    setScreen('dialogue')
  }
  const startRound = () => setScreen('game')
  const startFocus = () => {
    const weak = vocabulary.filter((word) => { const mastery = learning.mastery[wordKey(word)]; return mastery?.seen && mastery.level < 2 })
    if (!weak.length) return
    setRunMode('focus'); setSelectedPart(null); setReviewWords(weak); setResult(null); setScreen('game')
  }
  const startDaily = () => { setRunMode('daily'); setSelectedPart(null); setReviewWords(dailyDeck(vocabulary, jlptLevel)); setResult(null); setScreen('game') }
  const startDojo = () => { setRunMode('dojo'); setSelectedPart(null); setReviewWords(vocabulary); setResult(null); setScreen('game') }
  const complete = useCallback((summary: RoundSummary) => {
    const accuracy = summary.attempted ? Math.round(summary.correct / summary.attempted * 100) : 0
    const session: SessionRecord = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, chapterId: chapter.id, score: summary.score, accuracy, date: Date.now(), mode: summary.mode, jlptLevel }
    setLearning((current) => { const updated = updateMastery(current, summary.outcomes); return { ...updated, sessions: [session, ...updated.sessions].slice(0, 30) } })
    setPlayer((current) => { const reward = rewardRound(current, summary); setEarnedXp(reward.earnedXp); setNewAchievements(reward.newlyUnlocked); return reward.progression })
    setResult(summary); setReviewWords(uniqueWords(summary.incorrect))
    if (summary.mode === 'chapter') setProgress((current) => {
      const passed = accuracy >= 70
      const scoreKey = selectedPart?.id ?? chapter.id
      const completedParts = passed && selectedPart && !current.completedParts.includes(selectedPart.id) ? [...current.completedParts, selectedPart.id] : current.completedParts
      const finishedChapter = !selectedPart || selectedPart.number === chapter.parts?.length
      const completed = passed && finishedChapter && !current.completed.includes(chapter.id) ? [...current.completed, chapter.id] : current.completed
      const unlocked = passed && finishedChapter ? Math.max(current.unlocked, Math.min(chapters.length, chapter.number + 1)) : current.unlocked
      return { ...current, unlocked, completed, completedParts, bestScores: { ...current.bestScores, [scoreKey]: Math.max(current.bestScores[scoreKey] ?? 0, summary.score) } }
    })
    setScreen(summary.mode === 'chapter' && accuracy >= 70 ? 'epilogue' : 'results')
  }, [chapter, chapters.length, jlptLevel, selectedPart])
  const resetAll = () => { setProgress(defaultProgress); setLearning(emptyProfile()); setPlayer(emptyProgression()); setResult(null); setReviewWords([]); setSelectedPart(null); removeLocal('samuright-progress'); JLPT_LEVELS.forEach((level) => removeLocal(`samuright-progress-${level.toLowerCase()}`)); removeLocal('samuright-learning-v1'); removeLocal('samuright-player-v1'); removeLocal('samuright-jlpt-level'); setJlptLevel('N5'); setChapter(getChapters('N5')[0]); setScreen('start') }
  if (screen === 'start') return <StartScreen sound={sound} setSound={setSound} onStory={() => setScreen('level')} onDojo={() => setScreen('dojo')} />
  if (screen === 'level') return <LevelScreen selected={jlptLevel} onSelect={chooseLevel} onBack={() => setScreen('start')} />
  if (screen === 'dojo') return <DojoScreen level={jlptLevel} onStart={startDojo} onBack={() => setScreen('start')} />
  if (screen === 'journey') return <JourneyScreen progress={progress} profile={learning} player={player} level={jlptLevel} chapters={chapters} words={vocabulary} onChapter={chooseChapter} onPart={choosePart} onFocus={startFocus} onDaily={startDaily} onOpen={setScreen} />
  if (screen === 'dialogue') return <DialogueScreen chapter={activeStory} lines={activeStory.intro} onContinue={startRound} />
  if (screen === 'epilogue') return <DialogueScreen chapter={activeStory} lines={activeStory.epilogue} phase="EPILOGUE" onContinue={() => setScreen('results')} />
  if (screen === 'results' && result) return <ResultsScreen chapter={activeStory} result={result} passed={result.mode !== 'chapter' || (result.attempted ? result.correct / result.attempted >= .7 : false)} earnedXp={earnedXp} newAchievements={newAchievements} player={player} storyCrest={selectedPart?.number === chapter.parts?.length ? storyCrests[chapter.number] : undefined} campaignComplete={result.mode === 'chapter' && chapter.number === chapters.length && selectedPart?.number === chapter.parts?.length && (result.attempted ? result.correct / result.attempted >= .7 : false)} onJourney={() => { setSelectedPart(null); setScreen('journey') }} onReplay={() => runMode === 'focus' ? startFocus() : runMode === 'daily' ? startDaily() : runMode === 'dojo' ? startDojo() : setScreen('dialogue')} onReview={() => setScreen('review')} />
  if (screen === 'review' && reviewWords.length) return <ReviewScreen words={reviewWords} onDone={() => setScreen('results')} />
  if (screen === 'wordbook') return <WordbookScreen profile={learning} words={vocabulary} level={jlptLevel} onBack={() => setScreen('journey')} />
  if (screen === 'history') return <HistoryScreen sessions={learning.sessions} chapters={chapters} onBack={() => setScreen('journey')} />
  if (screen === 'achievements') return <AchievementsScreen player={player} onBack={() => setScreen('journey')} onHistory={() => setScreen('history')} />
  if (screen === 'settings') return <SettingsScreen level={jlptLevel} onChangeLevel={() => setScreen('level')} onBack={() => setScreen('journey')} onReset={resetAll} />
  return <GameScreen sound={sound} chapter={activeStory} words={runMode === 'chapter' ? activeStory.words : reviewWords} profile={learning} runMode={runMode} companionMet={progress.companionMet} onComplete={complete} />
}

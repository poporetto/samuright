export type VocabularyWord = {
  japanese: string
  reading: string
  meaning: string
}

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
export type RunMode = 'chapter' | 'dojo' | 'focus' | 'daily'

export type RoundSummary = {
  score: number
  correct: number
  attempted: number
  bestCombo: number
  incorrect: VocabularyWord[]
  outcomes: WordOutcome[]
  mode: RunMode
}

export type QuestionMode = 'japanese-meaning' | 'meaning-japanese' | 'reading-meaning'
export type WordOutcome = { word: VocabularyWord; correct: boolean; mode: QuestionMode }

export type HudState = {
  score: number
  lives: number
  combo: number
  secondsLeft: number
  current: VocabularyWord
  prompt: string
  promptLabel: string
  promptReading?: string
  mode: QuestionMode
}

export type Feedback = { type: 'correct' | 'incorrect' | 'missed'; message: string }

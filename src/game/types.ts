export type VocabularyWord = {
  japanese: string
  reading: string
  meaning: string
}

export type RoundSummary = {
  score: number
  correct: number
  attempted: number
  bestCombo: number
  incorrect: VocabularyWord[]
}

export type HudState = {
  score: number
  lives: number
  combo: number
  secondsLeft: number
  current: VocabularyWord
}

export type Feedback = { type: 'correct' | 'incorrect' | 'missed'; message: string }

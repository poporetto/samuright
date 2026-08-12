import { VOCABULARY } from '../data/vocabulary'
import type { VocabularyWord } from './types'

export const ROUND_SECONDS = 120
export const STARTING_LIVES = 3

export function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function makeAnswers(word: VocabularyWord, pool: VocabularyWord[] = VOCABULARY): string[] {
  const distractors = shuffle(pool.filter((item) => item !== word))
    .map((item) => item.meaning)
    .filter((meaning, index, all) => all.indexOf(meaning) === index && meaning !== word.meaning)
    .slice(0, 2)
  return shuffle([word.meaning, ...distractors])
}

export function pointsFor(combo: number) {
  return 100 + Math.min(combo, 10) * 20
}

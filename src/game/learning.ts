import type { JlptLevel, QuestionMode, RunMode, VocabularyWord, WordOutcome } from './types'

export type WordMastery = { seen: number; correct: number; streak: number; level: number; lastSeen: number }
export type SessionRecord = { id: string; chapterId: string; score: number; accuracy: number; date: number; mode: RunMode; jlptLevel?: JlptLevel }
export type LearningProfile = { version: 1; mastery: Record<string, WordMastery>; sessions: SessionRecord[] }

export const emptyProfile = (): LearningProfile => ({ version: 1, mastery: {}, sessions: [] })
export const wordKey = (word: VocabularyWord) => word.japanese
export const masteryLabel = (level: number) => ['New', 'Learning', 'Familiar', 'Strong', 'Mastered'][Math.min(level, 4)]

export function updateMastery(profile: LearningProfile, outcomes: WordOutcome[]): LearningProfile {
  const mastery = { ...profile.mastery }
  outcomes.forEach(({ word, correct }) => {
    const key = wordKey(word); const previous = mastery[key] ?? { seen: 0, correct: 0, streak: 0, level: 0, lastSeen: 0 }
    const streak = correct ? previous.streak + 1 : 0
    const level = correct ? Math.min(4, previous.level + (streak >= 2 ? 1 : 0)) : Math.max(0, previous.level - 1)
    mastery[key] = { seen: previous.seen + 1, correct: previous.correct + (correct ? 1 : 0), streak, level, lastSeen: Date.now() }
  })
  return { ...profile, mastery }
}

export function adaptiveDeck(words: VocabularyWord[], profile: LearningProfile) {
  return [...words].sort((a, b) => {
    const ma = profile.mastery[wordKey(a)] ?? { level: 0, streak: 0, lastSeen: 0 }
    const mb = profile.mastery[wordKey(b)] ?? { level: 0, streak: 0, lastSeen: 0 }
    return (ma.level * 3 + ma.streak + ma.lastSeen / 1e13) - (mb.level * 3 + mb.streak + mb.lastSeen / 1e13)
  })
}

export function chooseMode(word: VocabularyWord, profile: LearningProfile): QuestionMode {
  const level = profile.mastery[wordKey(word)]?.level ?? 0
  if (level < 1) return 'japanese-meaning'
  const modes: QuestionMode[] = level >= 3 ? ['japanese-meaning', 'meaning-japanese', 'reading-meaning'] : ['japanese-meaning', 'reading-meaning']
  return modes[Math.floor(Math.random() * modes.length)]
}

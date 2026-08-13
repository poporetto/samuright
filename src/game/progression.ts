import type { RoundSummary } from './types'

export type PlayerProgression = {
  version: 1
  xp: number
  streak: number
  bestStreak: number
  lastActiveDate: string
  dailyCompletedDate: string
  totalCorrect: number
  totalRounds: number
  perfectRounds: number
  achievements: string[]
}

export type Achievement = { id: string; title: string; japanese: string; description: string }

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-cut', title: 'First Cut', japanese: '初太刀', description: 'Answer your first word correctly.' },
  { id: 'combo-ten', title: 'Flow State', japanese: '無心', description: 'Reach a combo of 10.' },
  { id: 'perfect', title: 'Flawless Blade', japanese: '無傷', description: 'Finish a round with 100% accuracy.' },
  { id: 'daily', title: 'Dawn Training', japanese: '朝稽古', description: 'Complete a daily challenge.' },
  { id: 'streak-three', title: 'Three-Day Path', japanese: '三日道', description: 'Train on three consecutive days.' },
  { id: 'hundred', title: 'Hundred Words', japanese: '百語', description: 'Answer 100 words correctly.' },
]

export const emptyProgression = (): PlayerProgression => ({ version: 1, xp: 0, streak: 0, bestStreak: 0, lastActiveDate: '', dailyCompletedDate: '', totalCorrect: 0, totalRounds: 0, perfectRounds: 0, achievements: [] })

export const dateKey = (date = new Date()) => {
  const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const yesterdayKey = () => { const date = new Date(); date.setDate(date.getDate() - 1); return dateKey(date) }

export function rankForXp(xp: number) {
  const level = Math.floor(xp / 600) + 1
  const titles = ['Novice', 'Apprentice', 'Ronin', 'Blademaster', 'Sensei']
  const intoLevel = xp % 600
  return { level, title: titles[Math.min(level - 1, titles.length - 1)], current: intoLevel, needed: 600, percent: intoLevel / 600 * 100 }
}

export function roundXp(summary: RoundSummary, dailyBonus = true) {
  const accuracy = summary.attempted ? summary.correct / summary.attempted : 0
  return summary.correct * 12 + Math.min(summary.bestCombo, 20) * 3 + (accuracy >= .9 ? 100 : accuracy >= .7 ? 50 : 0) + (summary.mode === 'daily' && dailyBonus ? 75 : 0)
}

export function rewardRound(current: PlayerProgression, summary: RoundSummary) {
  const today = dateKey()
  const earnedXp = roundXp(summary, current.dailyCompletedDate !== today)
  const streak = current.lastActiveDate === today ? current.streak : current.lastActiveDate === yesterdayKey() ? current.streak + 1 : 1
  const perfect = summary.attempted > 0 && summary.correct === summary.attempted
  const next = { ...current, xp: current.xp + earnedXp, streak, bestStreak: Math.max(current.bestStreak, streak), lastActiveDate: today, dailyCompletedDate: summary.mode === 'daily' ? today : current.dailyCompletedDate, totalCorrect: current.totalCorrect + summary.correct, totalRounds: current.totalRounds + 1, perfectRounds: current.perfectRounds + (perfect ? 1 : 0) }
  const unlocked = new Set(next.achievements)
  if (next.totalCorrect >= 1) unlocked.add('first-cut')
  if (summary.bestCombo >= 10) unlocked.add('combo-ten')
  if (perfect) unlocked.add('perfect')
  if (summary.mode === 'daily') unlocked.add('daily')
  if (streak >= 3) unlocked.add('streak-three')
  if (next.totalCorrect >= 100) unlocked.add('hundred')
  return { progression: { ...next, achievements: [...unlocked] }, earnedXp, newlyUnlocked: [...unlocked].filter((id) => !current.achievements.includes(id)) }
}

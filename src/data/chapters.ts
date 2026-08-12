import { VOCABULARY } from './vocabulary'
import type { VocabularyWord } from '../game/types'

export type Chapter = {
  id: string
  number: number
  title: string
  japaneseTitle: string
  description: string
  intro: string[]
  complete: string
  words: VocabularyWord[]
}

const take = (indices: number[]) => indices.map((index) => VOCABULARY[index])

export const CHAPTERS: Chapter[] = [
  {
    id: 'eastern-road', number: 1, title: 'The Eastern Road', japaneseTitle: '東の道',
    description: 'Daily actions for the first steps of our journey.',
    intro: ['The road east begins at sunrise.', 'Keep your eyes calm. Let meaning guide the blade.'],
    complete: 'The first milestone is behind us. Your instincts are sharpening.',
    words: take([0, 1, 2, 3, 4, 5, 6, 7, 8, 29]),
  },
  {
    id: 'river-crossing', number: 2, title: 'The River Crossing', japaneseTitle: '川越え',
    description: 'Movement words carried by the current.',
    intro: ['A wide river cuts across our path.', 'Move decisively. Hesitation gives the current power.'],
    complete: 'We crossed before the rain. The road opens again.',
    words: take([9, 10, 11, 14, 15, 16, 17, 18, 19, 20]),
  },
  {
    id: 'lantern-town', number: 3, title: 'The Lantern Town', japaneseTitle: '灯り町',
    description: 'Words for meeting, making, and understanding.',
    intro: ['Lanterns glow beyond the gate.', 'Listen closely here. Every voice carries a clue.'],
    complete: 'The town remembers our name. A longer road waits beyond.',
    words: take([12, 13, 21, 22, 23, 24, 25, 26, 27, 28]),
  },
]

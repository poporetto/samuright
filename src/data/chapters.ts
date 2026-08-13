import { JLPT_VOCABULARY } from './jlptVocabulary'
import type { JlptLevel, VocabularyWord } from '../game/types'

export type Chapter = {
  id: string
  number: number
  title: string
  japaneseTitle: string
  description: string
  intro: DialogueLine[]
  complete: string
  words: VocabularyWord[]
}

export type DialogueSpeaker = 'REN' | 'HANA'
export type DialogueLine = { speaker: DialogueSpeaker; text: string }

const chapterTemplate: Array<Omit<Chapter, 'words'> & { indices: number[] }> = [
  {
    id: 'eastern-road', number: 1, title: 'The Eastern Road', japaneseTitle: '東の道',
    description: 'Daily actions for the first steps of our journey.',
    intro: [
      { speaker: 'REN', text: 'The road east begins at sunrise.' },
      { speaker: 'REN', text: 'Keep your eyes calm. Let meaning guide the blade.' },
    ],
    complete: 'The first milestone is behind us. Your instincts are sharpening.',
    indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 29],
  },
  {
    id: 'river-crossing', number: 2, title: 'The River Crossing', japaneseTitle: '川越え',
    description: 'Movement words carried by the current.',
    intro: [
      { speaker: 'REN', text: 'The river is running high. Watch your step.' },
      { speaker: 'HANA', text: 'Too late—ah! I meant to land like that.' },
      { speaker: 'REN', text: 'You are cheerful for someone soaked to the knees.' },
      { speaker: 'HANA', text: "I’m Hana! Let me travel with you—I’ll only trip occasionally." },
    ],
    complete: 'We crossed before the rain. With Hana beside us, the road feels brighter.',
    indices: [9, 10, 11, 14, 15, 16, 17, 18, 19, 20],
  },
  {
    id: 'lantern-town', number: 3, title: 'The Lantern Town', japaneseTitle: '灯り町',
    description: 'Words for meeting, making, and understanding.',
    intro: [
      { speaker: 'REN', text: 'Lanterns glow beyond the gate.' },
      { speaker: 'HANA', text: 'A warm town! I’ll ask around—without knocking anything over.' },
      { speaker: 'REN', text: 'Listen closely here. Every voice carries a clue.' },
    ],
    complete: 'The town remembers our name. A longer road waits beyond.',
    indices: [12, 13, 21, 22, 23, 24, 25, 26, 27, 28],
  },
]

export const getChapters = (level: JlptLevel): Chapter[] => chapterTemplate.map(({ indices, ...chapter }) => ({
  ...chapter,
  id: `${level.toLowerCase()}-${chapter.id}`,
  words: indices.map((index) => JLPT_VOCABULARY[level][index]),
}))

export const CHAPTERS = getChapters('N5')

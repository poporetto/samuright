import { JLPT_VOCABULARY } from './jlptVocabulary'
import type { JlptLevel, VocabularyWord } from '../game/types'

export type Chapter = {
  id: string
  number: number
  title: string
  japaneseTitle: string
  description: string
  intro: DialogueLine[]
  opponent: BattleOpponent
  complete: string
  words: VocabularyWord[]
}

export type DialogueSpeaker = 'REN' | 'HANA' | 'JŪBEI' | 'SABURŌ' | 'KICHIRŌ'
export type DialogueLine = { speaker: DialogueSpeaker; text: string }
export type BattleOpponent = {
  id: 'iwao-jubei' | 'saburo' | 'mizuno-kichiro'
  name: string
  title: string
  opening: string
  pressured: string
  counter: string
}

const chapterTemplate: Array<Omit<Chapter, 'words'> & { indices: number[] }> = [
  {
    id: 'eastern-road', number: 1, title: 'The Eastern Road', japaneseTitle: '東の道',
    description: 'Daily actions for the first steps of our journey.',
    intro: [
      { speaker: 'REN', text: 'The road east begins at sunrise.' },
      { speaker: 'JŪBEI', text: 'A fine stance, lad. Very impressive.' },
      { speaker: 'REN', text: 'You have been watching me?' },
      { speaker: 'JŪBEI', text: 'Only long enough to see what happens after the stance. Come—let an old ronin loosen those shoulders.' },
    ],
    opponent: { id: 'iwao-jubei', name: 'Iwao Jūbei', title: 'Wandering Ronin', opening: 'Calm eyes. Clean cuts. Show me.', pressured: 'Good. Now keep that rhythm.', counter: 'The blade follows a restless mind.' },
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
      { speaker: 'SABURŌ', text: 'Nobody crosses without paying tribute to Saburō, the River Wolf!' },
      { speaker: 'HANA', text: 'You may stand aside, good subject—ah. I mean, please move.' },
      { speaker: 'REN', text: 'Stay behind me, Hana.' },
    ],
    opponent: { id: 'saburo', name: 'Saburō', title: 'The River Wolf', opening: 'Hand over your coins—or your lunch!', pressured: 'Wait! Wolves are better at this!', counter: 'The River Wolf bites back!' },
    complete: 'We crossed before the rain. With Hana beside us, the road feels brighter.',
    indices: [9, 10, 11, 14, 15, 16, 17, 18, 19, 20],
  },
  {
    id: 'lantern-town', number: 3, title: 'The Lantern Town', japaneseTitle: '灯り町',
    description: 'Words for meeting, making, and understanding.',
    intro: [
      { speaker: 'REN', text: 'Lanterns glow beyond the gate.' },
      { speaker: 'HANA', text: 'A warm town! I’ll ask around—without knocking anything over.' },
      { speaker: 'KICHIRŌ', text: 'By order of the court, travellers are to submit to inspection.' },
      { speaker: 'HANA', text: 'The court has no authority to—over my luggage. Common luggage.' },
      { speaker: 'REN', text: 'We want no trouble, Captain.' },
      { speaker: 'KICHIRŌ', text: 'Then lower your blade and answer plainly.' },
    ],
    opponent: { id: 'mizuno-kichiro', name: 'Mizuno Kichirō', title: 'Captain of the Road Guard', opening: 'Prove your intent through your discipline.', pressured: 'Your technique is honest. Are you?', counter: 'Hesitation invites suspicion.' },
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

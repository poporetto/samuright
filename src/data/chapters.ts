import { JLPT_VOCABULARY } from './jlptVocabulary'
import type { JlptLevel, VocabularyWord } from '../game/types'

export type Chapter = {
  id: string
  number: number
  title: string
  japaneseTitle: string
  description: string
  intro: DialogueLine[]
  epilogue: DialogueLine[]
  opponent: BattleOpponent
  complete: string
  words: VocabularyWord[]
}

export type DialogueSpeaker = 'NARRATOR' | 'REN' | 'HANA' | 'JŪBEI' | 'SABURŌ' | 'KICHIRŌ'
export type DialogueLine = { speaker: DialogueSpeaker; text: string }
export type BattleOpponent = {
  id: 'iwao-jubei' | 'saburo' | 'mizuno-kichiro'
  name: string
  title: string
  masterEncounter?: boolean
  opening: string
  pressured: string
  counter: string
}

const chapterTemplate: Array<Omit<Chapter, 'words'> & { indices: number[] }> = [
  {
    id: 'eastern-road', number: 1, title: 'The Eastern Road', japaneseTitle: '東の道',
    description: 'Daily actions for the first steps of our journey.',
    intro: [
      { speaker: 'NARRATOR', text: 'At sunrise, Ren left home with one sword, one travel permit, and an ambition far heavier than either.' },
      { speaker: 'REN', text: 'Five masters, five crests, and the Golden Dojo waiting at the end. I’ve dreamed of this road since I could first hold a wooden sword.' },
      { speaker: 'JŪBEI', text: 'A fine speech. Did you practise it all morning, or only since I started listening?' },
      { speaker: 'REN', text: 'Mostly while walking. The sunrise made it sound better.' },
      { speaker: 'JŪBEI', text: 'That would worry me more than the speech. Show me your stance, young samurai.' },
      { speaker: 'REN', text: 'Not yet. But give me a little road and a lot of practice.' },
      { speaker: 'JŪBEI', text: 'Good. Then you may still be teachable.' },
    ],
    epilogue: [
      { speaker: 'NARRATOR', text: 'Ren’s final cut stopped a breath from the old ronin’s sleeve. Jūbei looked down at the blade, then broke into a delighted grin.' },
      { speaker: 'JŪBEI', text: 'There it is. For one heartbeat, you forgot to be impressive.' },
      { speaker: 'REN', text: 'I’ll take that as praise. It may be the only kind you offer.' },
      { speaker: 'JŪBEI', text: 'Do not become greedy. You have five masters to impress.' },
      { speaker: 'REN', text: 'You know the masters? Wait—was this more than a roadside lesson?' },
      { speaker: 'JŪBEI', text: 'Listen better when next we meet, and perhaps I will tell you.' },
      { speaker: 'NARRATOR', text: 'But Jūbei was already walking west, exactly opposite the direction sensible travellers took. In the dust where he had stood lay a plain stone charm.' },
      { speaker: 'REN', text: 'A mysterious teacher, a stone charm, and no name. The road is already better than I imagined.' },
    ],
    opponent: { id: 'iwao-jubei', name: 'Iwao Jūbei', title: 'Wandering Ronin', opening: 'Do not chase the answer. Let it come within reach.', pressured: 'Better. Your hands are finally listening to your eyes.', counter: 'Ambition moves quickly. A disciplined blade does not.' },
    complete: 'The old ronin departed without giving Ren his name. In the dust, he left a plain stone charm—and the feeling that their duel had only just begun.',
    indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 29],
  },
  {
    id: 'river-crossing', number: 2, title: 'The River Crossing', japaneseTitle: '川越え',
    description: 'Movement words carried by the current.',
    intro: [
      { speaker: 'NARRATOR', text: 'By midday, the Eastern Road reached a swollen river. In its shallows stood a young woman, balanced upon one stone and losing an argument with the next.' },
      { speaker: 'HANA', text: 'I command you to remain perfectly—oh!' },
      { speaker: 'NARRATOR', text: 'The stone remained perfectly still. Hana did not.' },
      { speaker: 'REN', text: 'Take my hand. I promise the shore is less argumentative.' },
      { speaker: 'HANA', text: 'An excellent rescue. You may be proud of your service—your help! I meant your help.' },
      { speaker: 'REN', text: 'Do common travellers usually command rivers, or have I met someone exceptional?' },
      { speaker: 'HANA', text: 'Only especially disobedient ones. I’m Hana, by the way.' },
      { speaker: 'SABURŌ', text: 'And I am Saburō, the River Wolf! This crossing belongs to my fearsome pack.' },
      { speaker: 'REN', text: 'Then your pack has mastered invisibility. I only see one man.' },
      { speaker: 'SABURŌ', text: 'The others are positioned somewhere extremely strategic.' },
      { speaker: 'HANA', text: 'Then your absent subjects may watch you stand aside.' },
    ],
    epilogue: [
      { speaker: 'SABURŌ', text: 'A temporary defeat! The River Wolf shall return with a larger and much more present pack!' },
      { speaker: 'NARRATOR', text: 'Saburō vanished into the reeds. His threats travelled farther than he did; his forgotten lunch remained behind.' },
      { speaker: 'HANA', text: 'Victory has provided rice balls. A promising arrangement.' },
      { speaker: 'REN', text: 'Those belong to the bandit. Although he did threaten to steal ours, so morality has become complicated.' },
      { speaker: 'HANA', text: 'Then we shall preserve them as evidence. Carefully. In our stomachs.' },
      { speaker: 'REN', text: 'Well, Hana of the disobedient river, which road are you taking now?' },
      { speaker: 'HANA', text: 'Yours. You require someone diplomatic, and I require someone who notices stepping stones.' },
      { speaker: 'REN', text: 'I was planning a quiet journey. But I’m beginning to suspect the road had other plans.' },
      { speaker: 'HANA', text: 'Wonderful. Neither did I. We already have something in common.' },
      { speaker: 'NARRATOR', text: 'And so Ren’s solitary journey became a journey of two—though only one of them appeared to have voted.' },
    ],
    opponent: { id: 'saburo', name: 'Saburō', title: 'The River Wolf', opening: 'Coins, provisions, or that very expensive-looking pouch!', pressured: 'A tactical retreat is still a wolf technique!', counter: 'Ha! The River Wolf has teeth after all!' },
    complete: 'Saburō fled with his pride bruised and his lunch forgotten. Hana claimed it as a victory feast, then announced she would accompany Ren—without waiting for his agreement.',
    indices: [9, 10, 11, 14, 15, 16, 17, 18, 19, 20],
  },
  {
    id: 'lantern-town', number: 3, title: 'The Lantern Town', japaneseTitle: '灯り町',
    description: 'Words for meeting, making, and understanding.',
    intro: [
      { speaker: 'NARRATOR', text: 'Two days later, the unlikely pair reached a post town glowing with evening lanterns—and crowded with road guards.' },
      { speaker: 'HANA', text: 'Wonderful! Food, baths, and beds that do not contain roots.' },
      { speaker: 'REN', text: 'A hot meal, a soft bed, and then the small matter of why every guard is studying your memorable, entirely ordinary face.' },
      { speaker: 'HANA', text: 'Perhaps I have a memorable, entirely ordinary face.' },
      { speaker: 'KICHIRŌ', text: 'Travellers. By order of the court, submit your names and belongings for inspection.' },
      { speaker: 'HANA', text: 'You cannot search a lady of the royal—road. A lady of the royal road.' },
      { speaker: 'REN', text: 'Hana. Your ordinary is showing.' },
      { speaker: 'HANA', text: 'I heard it as soon as I said it.' },
      { speaker: 'KICHIRŌ', text: 'The young woman described in my orders speaks with unusual refinement. You will both come with me.' },
      { speaker: 'REN', text: 'She travels by choice. I’d rather settle this with words—but if you threaten her, Captain, I will become very serious.' },
      { speaker: 'KICHIRŌ', text: 'I hoped you would choose the peaceful answer. Do not make me regret giving you the chance.' },
    ],
    epilogue: [
      { speaker: 'NARRATOR', text: 'Steel rang once beneath the lanterns. Ren held his ground; Kichirō lowered his sword first.' },
      { speaker: 'KICHIRŌ', text: 'You fight to shield her, not restrain her. I was wrong about that.' },
      { speaker: 'REN', text: 'Then let us pass. I promised myself a hot meal, and I take promises very seriously.' },
      { speaker: 'KICHIRŌ', text: 'I said I was wrong about you. I said nothing about her.' },
      { speaker: 'HANA', text: 'An unfortunate distinction.' },
      { speaker: 'KICHIRŌ', text: 'My orders concern a missing young noblewoman. If you know anything, trust that I mean her no harm.' },
      { speaker: 'HANA', text: 'If we encounter anyone noble, Captain, you shall be the very first to know.' },
      { speaker: 'REN', text: 'The second. I’m hoping she tells her travelling companion first.' },
      { speaker: 'HANA', text: 'Ren.' },
      { speaker: 'NARRATOR', text: 'They disappeared into the lantern crowd before Kichirō could ask another question. He let them go—then ordered two guards to follow at a respectful distance.' },
    ],
    opponent: { id: 'mizuno-kichiro', name: 'Mizuno Kichirō', title: 'Captain of the Road Guard', opening: 'I will judge your control before I judge your story.', pressured: 'Your technique protects her. That much is true.', counter: 'A careless answer can condemn an innocent person.' },
    complete: 'Kichirō lowered his sword, unconvinced but unwilling to arrest an innocent traveller by force. As Ren and Hana vanished among the lanterns, the captain quietly ordered his men to follow at a distance.',
    indices: [12, 13, 21, 22, 23, 24, 25, 26, 27, 28],
  },
]

export const getChapters = (level: JlptLevel): Chapter[] => chapterTemplate.map(({ indices, ...chapter }) => ({
  ...chapter,
  id: `${level.toLowerCase()}-${chapter.id}`,
  words: indices.map((index) => JLPT_VOCABULARY[level][index]),
}))

export const CHAPTERS = getChapters('N5')

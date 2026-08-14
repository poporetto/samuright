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
      { speaker: 'REN', text: 'All right. My training to become a kensei begins today—the finest swordsman in the realm.' },
      { speaker: 'REN', text: 'It sounds impossible. Good. Now… where do I begin? The capital, I suppose?' },
      { speaker: 'JŪBEI', text: 'The capital has plenty of polished swords. Polished swordsmen are harder to find.' },
      { speaker: 'REN', text: 'I was thinking aloud. I didn’t realise I had an audience.' },
      { speaker: 'JŪBEI', text: 'A very loud dream tends to attract one. If you truly seek the title of kensei, the capital cannot grant it.' },
      { speaker: 'JŪBEI', text: 'Defeat the Five Masters and earn their crests. Only then may you enter the Golden Dojo, where the realm’s greatest swordsmen are recognised.' },
      { speaker: 'REN', text: 'Five Masters… So my dream has a beginning after all.' },
      { speaker: 'JŪBEI', text: 'It has an ending too, if your confidence is sharper than your blade. Show me what you know.' },
      { speaker: 'REN', text: 'Gladly. If this is my first step, I intend to make it count.' },
    ],
    epilogue: [
      { speaker: 'NARRATOR', text: 'Ren’s final cut stopped a breath from the old ronin’s sleeve. The stranger looked down at the blade, then broke into a delighted grin.' },
      { speaker: 'JŪBEI', text: 'There it is. For one heartbeat, you forgot to be impressive.' },
      { speaker: 'REN', text: 'I’ll take that as praise. It may be the only kind you offer.' },
      { speaker: 'JŪBEI', text: 'Keep that heartbeat. You will need it when you face the first Master.' },
      { speaker: 'REN', text: 'At least tell me the name of the man who just changed my entire journey.' },
      { speaker: 'JŪBEI', text: 'Earn your first crest. If we meet again, perhaps you may earn my name as well.' },
      { speaker: 'NARRATOR', text: 'The old ronin turned away. Where he had stood, Ren found a plain stone charm pressed into the dust.' },
      { speaker: 'REN', text: 'Five Masters, one Golden Dojo, and a mysterious teacher. This is going to be even better than I imagined.' },
    ],
    opponent: { id: 'iwao-jubei', name: 'Wandering Swordsman', title: 'Unnamed Ronin', opening: 'Let us see whether that great dream has a steady hand behind it.', pressured: 'Better. Your hands are finally listening to your eyes.', counter: 'Ambition moves quickly. A disciplined blade does not.' },
    complete: 'The old ronin departed without giving Ren his name. In the dust, he left a plain stone charm—and the feeling that their duel had only just begun.',
    indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 29],
  },
  {
    id: 'river-crossing', number: 2, title: 'The River Crossing', japaneseTitle: '川越え',
    description: 'Movement words carried by the current.',
    intro: [
      { speaker: 'NARRATOR', text: 'By midday, Ren reached a swollen river. In its shallows stood a young woman, balanced upon one stone and losing an argument with the next.' },
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
      { speaker: 'REN', text: 'Well, Hana of the disobedient river, where are you headed?' },
      { speaker: 'HANA', text: 'Wherever you are. You require someone diplomatic, and I require someone who notices stepping stones.' },
      { speaker: 'REN', text: 'I was planning to travel alone. Somehow that plan lasted less than a day.' },
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
      { speaker: 'HANA', text: 'You cannot search a lady of the royal house—household! A perfectly ordinary household.' },
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

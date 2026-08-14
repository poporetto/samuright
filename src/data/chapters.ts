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
      { speaker: 'REN', text: 'Okay! Today’s the day I start becoming a kensei—the greatest swordsman in the whole realm!' },
      { speaker: 'REN', text: 'Now I just need to figure out where great swordsmen go. The capital! That has to be it.' },
      { speaker: 'JŪBEI', text: 'You reached that conclusion rather quickly.' },
      { speaker: 'REN', text: 'Oh! You heard me? Great—do you know where I should start?' },
      { speaker: 'JŪBEI', text: 'Not the capital. If you want the title of kensei, you must defeat the Five Masters and earn their crests.' },
      { speaker: 'JŪBEI', text: 'Bring all five crests to the Golden Dojo. Only those accepted there may stand among the realm’s greatest swordsmen.' },
      { speaker: 'REN', text: 'Five Masters and a Golden Dojo? That sounds amazing! Finally, I know where to begin.' },
      { speaker: 'JŪBEI', text: 'You have not heard the dangerous part yet.' },
      { speaker: 'REN', text: 'They’re called the Five Masters. I assumed there was a dangerous part. Come on—test me!' },
    ],
    epilogue: [
      { speaker: 'NARRATOR', text: 'Ren’s final cut stopped a breath from the old ronin’s sleeve. The stranger looked down at the blade, then broke into a delighted grin.' },
      { speaker: 'JŪBEI', text: 'Rough, reckless… but honest. That final cut was your best.' },
      { speaker: 'REN', text: 'Really? Then let’s go again! I can make the next one even better.' },
      { speaker: 'JŪBEI', text: 'Save that energy. You will need all of it against the first Master.' },
      { speaker: 'REN', text: 'Wait—you can’t tell me all that and leave without giving me your name!' },
      { speaker: 'JŪBEI', text: 'Earn your first crest. If we meet again, I may tell you.' },
      { speaker: 'NARRATOR', text: 'The old ronin turned away. Where he had stood, Ren found a plain stone charm pressed into the dust.' },
      { speaker: 'REN', text: 'All right! First crest, then the Golden Dojo. I’m coming for both!' },
    ],
    opponent: { id: 'iwao-jubei', name: 'Wandering Swordsman', title: 'Unnamed Ronin', opening: 'All right, dreamer. Show me what you can do.', pressured: 'Better. Your hands are finally listening to your eyes.', counter: 'Ambition moves quickly. A disciplined blade does not.' },
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
      { speaker: 'REN', text: 'Whoa—hold on! Grab my hand!' },
      { speaker: 'HANA', text: 'An excellent rescue. You may be proud of your service—your help! I meant your help.' },
      { speaker: 'REN', text: 'You’re okay! Good. I’m Ren. Do you always argue with rivers?' },
      { speaker: 'HANA', text: 'Only especially disobedient ones. I’m Hana, by the way.' },
      { speaker: 'SABURŌ', text: 'And I am Saburō, the River Wolf! This crossing belongs to my fearsome pack.' },
      { speaker: 'REN', text: 'A whole pack? Where are they? I only see you.' },
      { speaker: 'SABURŌ', text: 'The others are positioned somewhere extremely strategic.' },
      { speaker: 'HANA', text: 'Then your absent subjects may watch you stand aside.' },
    ],
    epilogue: [
      { speaker: 'SABURŌ', text: 'A temporary defeat! The River Wolf shall return with a larger and much more present pack!' },
      { speaker: 'NARRATOR', text: 'Saburō vanished into the reeds. His threats travelled farther than he did; his forgotten lunch remained behind.' },
      { speaker: 'HANA', text: 'Victory has provided rice balls. A promising arrangement.' },
      { speaker: 'REN', text: 'He left rice balls? I like winning already.' },
      { speaker: 'HANA', text: 'Then we shall preserve them as evidence. Carefully. In our stomachs.' },
      { speaker: 'REN', text: 'So, Hana—where are you headed?' },
      { speaker: 'HANA', text: 'Wherever you are. You require someone diplomatic, and I require someone who notices stepping stones.' },
      { speaker: 'REN', text: 'You want to come with me? Great! Travelling is more fun with company.' },
      { speaker: 'HANA', text: 'Wonderful! I knew you would recognise the wisdom of it.' },
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
      { speaker: 'REN', text: 'Hot food! Finally— Wait. Why are all those guards staring at you?' },
      { speaker: 'HANA', text: 'Perhaps I have a memorable, entirely ordinary face.' },
      { speaker: 'KICHIRŌ', text: 'Travellers. By order of the court, submit your names and belongings for inspection.' },
      { speaker: 'HANA', text: 'You cannot search a lady of the royal house—household! A perfectly ordinary household.' },
      { speaker: 'REN', text: 'Hana… that didn’t sound ordinary at all.' },
      { speaker: 'HANA', text: 'I heard it as soon as I said it.' },
      { speaker: 'KICHIRŌ', text: 'The young woman described in my orders speaks with unusual refinement. You will both come with me.' },
      { speaker: 'REN', text: 'Hana is travelling with me because she chose to. I won’t let you drag my friend away.' },
      { speaker: 'KICHIRŌ', text: 'I hoped you would choose the peaceful answer. Do not make me regret giving you the chance.' },
    ],
    epilogue: [
      { speaker: 'NARRATOR', text: 'Steel rang once beneath the lanterns. Ren held his ground; Kichirō lowered his sword first.' },
      { speaker: 'KICHIRŌ', text: 'You fight to shield her, not restrain her. I was wrong about that.' },
      { speaker: 'REN', text: 'Good! Then we’re done here. Come on, Hana—I can already smell dinner.' },
      { speaker: 'KICHIRŌ', text: 'I said I was wrong about you. I said nothing about her.' },
      { speaker: 'HANA', text: 'An unfortunate distinction.' },
      { speaker: 'KICHIRŌ', text: 'My orders concern a missing young noblewoman. If you know anything, trust that I mean her no harm.' },
      { speaker: 'HANA', text: 'If we encounter anyone noble, Captain, you shall be the very first to know.' },
      { speaker: 'REN', text: 'The second. Friends tell each other important things first… right, Hana?' },
      { speaker: 'HANA', text: 'Ren.' },
      { speaker: 'NARRATOR', text: 'They disappeared into the lantern crowd before Kichirō could ask another question. He let them go—then ordered two guards to follow at a respectful distance.' },
    ],
    opponent: { id: 'mizuno-kichiro', name: 'Mizuno Kichirō', title: 'Captain of the Road Guard', opening: 'I will judge your control before I judge your story.', pressured: 'Your technique protects her. That much is true.', counter: 'A careless answer can condemn an innocent person.' },
    complete: 'Kichirō lowered his sword, unconvinced but unwilling to arrest an innocent traveller by force. As Ren and Hana vanished among the lanterns, the captain quietly ordered his men to follow at a distance.',
    indices: [12, 13, 21, 22, 23, 24, 25, 26, 27, 28],
  },
  {
    id: 'bamboo-dojo', number: 4, title: 'The Bamboo Dojo', japaneseTitle: '竹の道場',
    description: 'Hold your rhythm through the first Master’s trial.',
    intro: [
      { speaker: 'NARRATOR', text: 'The stone charm led Ren and Hana beyond the town, into a bamboo grove where a quiet dojo waited in the morning mist.' },
      { speaker: 'REN', text: 'This has to be it! My first Master is somewhere in there.' },
      { speaker: 'HANA', text: 'A hidden dojo in a bamboo forest. Very dignified. We should enter with grace and composure.' },
      { speaker: 'NARRATOR', text: 'Hana caught her sandal on the first step. Ren caught her before her introduction to the floor.' },
      { speaker: 'REN', text: 'Graceful enough. Come on!' },
      { speaker: 'JŪBEI', text: 'Still announcing yourself before you arrive, I see.' },
      { speaker: 'REN', text: 'You! I knew we’d meet again. Wait… do you work for the Master?' },
      { speaker: 'JŪBEI', text: 'Iwao Jūbei. Keeper of the Discipline Crest—and the first of the Five Masters you intend to defeat.' },
      { speaker: 'REN', text: 'You’re the first Master? That’s even better! I wanted another match anyway.' },
      { speaker: 'JŪBEI', text: 'This is not our roadside practice. I will break your rhythm, crowd your thoughts, and punish every careless cut.' },
      { speaker: 'REN', text: 'Then I’ll keep finding my rhythm again. That’s what training is for!' },
      { speaker: 'JŪBEI', text: 'Good answer. Now show me whether you can live by it.' },
    ],
    epilogue: [
      { speaker: 'NARRATOR', text: 'The final target split cleanly. For the first time that morning, the bamboo dojo became completely still.' },
      { speaker: 'REN', text: 'Did I do it? I did it, right?' },
      { speaker: 'JŪBEI', text: 'You lost your rhythm more than once.' },
      { speaker: 'REN', text: 'I know. But I found it again every time.' },
      { speaker: 'JŪBEI', text: 'Exactly. Discipline is not perfection. It is returning to your center before one mistake becomes ten.' },
      { speaker: 'JŪBEI', text: 'Ren, you have earned the Discipline Crest.' },
      { speaker: 'REN', text: 'My first crest! Four more, then the Golden Dojo!' },
      { speaker: 'HANA', text: 'A magnificent victory. As your official travelling comp—companion, I shall safeguard the crest.' },
      { speaker: 'REN', text: 'You just want to put it in your pouch.' },
      { speaker: 'HANA', text: 'A secure and extremely dignified pouch.' },
      { speaker: 'JŪBEI', text: 'When your mind settles, the world seems to slow. Remember that feeling. It is the first technique of a disciplined blade.' },
      { speaker: 'NARRATOR', text: 'With one crest secured and Jūbei’s lesson in his heart, Ren turned toward the next name: Lady Shizuru of the Foxfire Inn.' },
    ],
    opponent: { id: 'iwao-jubei', name: 'Master Iwao Jūbei', title: 'Master of Discipline', masterEncounter: true, opening: 'The trial begins. Keep your rhythm, Ren.', pressured: 'Good. Do not let success make you careless.', counter: 'One mistake is only one mistake. Return to your center.' },
    complete: 'Ren earned the Discipline Crest and learned Still Mind: when his rhythm is true, the field briefly slows around him.',
    indices: [5, 7, 8, 14, 15, 16, 23, 26, 27, 28],
  },
]

export const getChapters = (level: JlptLevel): Chapter[] => chapterTemplate.map(({ indices, ...chapter }) => ({
  ...chapter,
  id: `${level.toLowerCase()}-${chapter.id}`,
  words: indices.map((index) => JLPT_VOCABULARY[level][index]),
}))

export const CHAPTERS = getChapters('N5')

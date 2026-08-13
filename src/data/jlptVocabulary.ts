import type { JlptLevel, VocabularyWord } from '../game/types'
import { VOCABULARY as N5 } from './vocabulary'

const words = (entries: [string, string, string][]): VocabularyWord[] =>
  entries.map(([japanese, reading, meaning]) => ({ japanese, reading, meaning }))

export const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

export const JLPT_VOCABULARY: Record<JlptLevel, VocabularyWord[]> = {
  N5,
  N4: words([
    ['始める','はじめる','to begin'],['終わる','おわる','to finish'],['続ける','つづける','to continue'],['決める','きめる','to decide'],['調べる','しらべる','to investigate'],
    ['運ぶ','はこぶ','to carry'],['直す','なおす','to fix'],['変える','かえる','to change'],['選ぶ','えらぶ','to choose'],['乗る','のる','to ride'],
    ['降りる','おりる','to get off'],['急ぐ','いそぐ','to hurry'],['間に合う','まにあう','to be on time'],['渡る','わたる','to cross'],['曲がる','まがる','to turn'],
    ['集める','あつめる','to collect'],['捨てる','すてる','to throw away'],['届ける','とどける','to deliver'],['足りる','たりる','to be enough'],['慣れる','なれる','to get used to'],
    ['考える','かんがえる','to think'],['覚える','おぼえる','to remember'],['忘れる','わすれる','to forget'],['知らせる','しらせる','to notify'],['答える','こたえる','to answer'],
    ['手伝う','てつだう','to help'],['迎える','むかえる','to welcome'],['比べる','くらべる','to compare'],['楽しむ','たのしむ','to enjoy'],['見つける','みつける','to find'],
  ]),
  N3: words([
    ['認める','みとめる','to acknowledge'],['任せる','まかせる','to entrust'],['求める','もとめる','to seek'],['含む','ふくむ','to include'],['防ぐ','ふせぐ','to prevent'],
    ['増える','ふえる','to increase'],['減る','へる','to decrease'],['進む','すすむ','to advance'],['達する','たっする','to reach'],['避ける','さける','to avoid'],
    ['確かめる','たしかめる','to make sure'],['支える','ささえる','to support'],['断る','ことわる','to refuse'],['許す','ゆるす','to permit'],['疑う','うたがう','to doubt'],
    ['伝える','つたえる','to convey'],['通じる','つうじる','to communicate'],['述べる','のべる','to state'],['語る','かたる','to tell'],['黙る','だまる','to be silent'],
    ['暮らす','くらす','to live'],['過ごす','すごす','to spend time'],['似合う','にあう','to suit'],['起こる','おこる','to occur'],['残る','のこる','to remain'],
    ['現れる','あらわれる','to appear'],['隠す','かくす','to hide'],['失う','うしなう','to lose'],['得る','える','to obtain'],['望む','のぞむ','to desire'],
  ]),
  N2: words([
    ['促す','うながす','to urge'],['維持する','いじする','to maintain'],['及ぼす','およぼす','to exert'],['伴う','ともなう','to accompany'],['補う','おぎなう','to supplement'],
    ['妨げる','さまたげる','to hinder'],['遂げる','とげる','to accomplish'],['扱う','あつかう','to handle'],['応じる','おうじる','to respond'],['従う','したがう','to obey'],
    ['優れる','すぐれる','to excel'],['劣る','おとる','to be inferior'],['省く','はぶく','to omit'],['省みる','かえりみる','to reflect upon'],['備える','そなえる','to prepare'],
    ['整える','ととのえる','to arrange'],['保つ','たもつ','to preserve'],['測る','はかる','to measure'],['占める','しめる','to occupy'],['限る','かぎる','to limit'],
    ['見込む','みこむ','to anticipate'],['見直す','みなおす','to reconsider'],['取り組む','とりくむ','to tackle'],['引き受ける','ひきうける','to undertake'],['乗り越える','のりこえる','to overcome'],
    ['結びつく','むすびつく','to be connected'],['当てはまる','あてはまる','to apply'],['差し支える','さしつかえる','to interfere'],['受け入れる','うけいれる','to accept'],['引き起こす','ひきおこす','to cause'],
  ]),
  N1: words([
    ['覆す','くつがえす','to overturn'],['免れる','まぬがれる','to escape'],['阻む','はばむ','to obstruct'],['損なう','そこなう','to impair'],['培う','つちかう','to cultivate'],
    ['繕う','つくろう','to mend'],['賄う','まかなう','to finance'],['滞る','とどこおる','to stagnate'],['廃れる','すたれる','to fall out of use'],['携わる','たずさわる','to engage in'],
    ['企てる','くわだてる','to scheme'],['試みる','こころみる','to attempt'],['成し遂げる','なしとげる','to accomplish'],['弁える','わきまえる','to discern'],['見据える','みすえる','to keep in view'],
    ['見落とす','みおとす','to overlook'],['取り巻く','とりまく','to surround'],['食い違う','くいちがう','to conflict'],['立ちはだかる','たちはだかる','to stand in the way'],['差し掛かる','さしかかる','to approach'],
    ['打ち切る','うちきる','to discontinue'],['踏まえる','ふまえる','to take into account'],['唱える','となえる','to advocate'],['嘆く','なげく','to lament'],['慕う','したう','to adore'],
    ['欺く','あざむく','to deceive'],['貫く','つらぬく','to carry through'],['退ける','しりぞける','to repel'],['繰り広げる','くりひろげる','to unfold'],['差し控える','さしひかえる','to refrain'],
  ]),
}

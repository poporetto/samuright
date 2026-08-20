export type CrestId = 'wind' | 'fire' | 'earth' | 'water' | 'void'

export const CRESTS: Record<CrestId, { kanji: string; name: string; technique: string; shortEffect: string }> = {
  wind: { kanji: '風', name: 'Wind', technique: 'Kaze Harai', shortEffect: 'Remove one false answer' },
  fire: { kanji: '火', name: 'Fire', technique: 'Homura Barai', shortEffect: 'Two choices ×2' },
  earth: { kanji: '地', name: 'Earth', technique: 'Daichi Shizume', shortEffect: 'Still targets ×2' },
  water: { kanji: '水', name: 'Water', technique: 'Seisui no Toki', shortEffect: 'Slow targets ×3' },
  void: { kanji: '空', name: 'Void', technique: 'Kūgan', shortEffect: 'Reveal truth ×1' },
}

const CREST_PARTS: Array<[CrestId, string]> = [
  ['wind', '-discipline-crest'],
  ['fire', '-perception-crest'],
  ['earth', '-compassion-crest'],
  ['water', '-courage-crest'],
  ['void', '-empty-blade'],
]

export function unlockedCrests(completedParts: string[]): CrestId[] {
  return CREST_PARTS.filter(([, suffix]) => completedParts.some((id) => id.endsWith(suffix))).map(([crest]) => crest)
}

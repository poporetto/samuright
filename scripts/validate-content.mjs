import { build } from 'esbuild'

async function loadTypeScriptModule(entryPoint) {
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
  })
  const source = Buffer.from(result.outputFiles[0].contents).toString('base64')
  return import(`data:text/javascript;base64,${source}`)
}

const chaptersModule = await loadTypeScriptModule('src/data/chapters.ts')
const vocabularyModule = await loadTypeScriptModule('src/data/jlptVocabulary.ts')
const { getChapters } = chaptersModule
const { JLPT_LEVELS, JLPT_VOCABULARY } = vocabularyModule
const wordKey = (word) => `${word.japanese}|${word.reading}|${word.meaning}`

for (const level of JLPT_LEVELS) {
  const deck = JLPT_VOCABULARY[level]
  const deckKeys = new Set(deck.map(wordKey))
  const chapters = getChapters(level)
  const stages = chapters.flatMap((chapter) => chapter.parts ?? [])

  if (chapters.length !== 11) throw new Error(`${level}: expected 11 chapters, found ${chapters.length}`)
  if (stages.length !== 33) throw new Error(`${level}: expected 33 stages, found ${stages.length}`)

  for (const stage of stages) {
    if (stage.words.length !== 10) throw new Error(`${level}: ${stage.id} must contain exactly 10 words`)
    for (const word of stage.words) {
      if (!deckKeys.has(wordKey(word))) throw new Error(`${level}: ${stage.id} uses a word outside its selected deck: ${word.japanese}`)
    }
  }

  const storyKeys = new Set(stages.flatMap((stage) => stage.words).map(wordKey))
  const missing = deck.filter((word) => !storyKeys.has(wordKey(word)))
  if (missing.length) throw new Error(`${level}: story is missing ${missing.map((word) => word.japanese).join(', ')}`)

  console.log(`${level}: ${storyKeys.size}/${deck.length} unique words covered across ${stages.length} stages`)
}

import Phaser from 'phaser'
import { GameScene } from './GameScene'
import type { RunMode, VocabularyWord } from './types'
import type { LearningProfile } from './learning'
import type { CrestId } from './crests'

export function createGame(parent: HTMLElement, soundEnabled: boolean, words: VocabularyWord[], profile: LearningProfile, mode: RunMode, opponentId?: string, masterEncounter = false, availableCrests: CrestId[] = []) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#faf8f3',
    transparent: false,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    input: { activePointers: 2, touch: { capture: true } },
    render: { antialias: true, pixelArt: false },
    scene: [GameScene],
  })
  game.scene.start('game', { soundEnabled, words, profile, mode, opponentId, masterEncounter, availableCrests })
  return game
}

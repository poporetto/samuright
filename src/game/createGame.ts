import Phaser from 'phaser'
import { GameScene } from './GameScene'
import type { VocabularyWord } from './types'

export function createGame(parent: HTMLElement, soundEnabled: boolean, words: VocabularyWord[]) {
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
  game.scene.start('game', { soundEnabled, words })
  return game
}

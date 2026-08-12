import Phaser from 'phaser'
import { VOCABULARY } from '../data/vocabulary'
import { gameEvents } from './events'
import { makeAnswers, pointsFor, ROUND_SECONDS, shuffle, STARTING_LIVES } from './rules'
import type { VocabularyWord } from './types'
import { haptic, playCue } from './feedback'

type Target = {
  container: Phaser.GameObjects.Container
  meaning: string
  correct: boolean
  vx: number
  vy: number
  resolved: boolean
}

type Point = { x: number; y: number }

export class GameScene extends Phaser.Scene {
  private targets: Target[] = []
  private trail: Point[] = []
  private trailGraphic!: Phaser.GameObjects.Graphics
  private particles!: Phaser.GameObjects.Graphics
  private deck: VocabularyWord[] = []
  private wordPool: VocabularyWord[] = VOCABULARY
  private current!: VocabularyWord
  private score = 0
  private lives = STARTING_LIVES
  private combo = 0
  private bestCombo = 0
  private correct = 0
  private attempted = 0
  private incorrect: VocabularyWord[] = []
  private secondsLeft = ROUND_SECONDS
  private elapsed = 0
  private questionStartedAt = 0
  private questionElapsed = 0
  private pointerDown = false
  private finished = false
  private soundEnabled = true
  private hitStopMs = 0

  constructor() { super('game') }

  init(data: { soundEnabled?: boolean; words?: VocabularyWord[] }) {
    this.soundEnabled = data.soundEnabled ?? true
    this.wordPool = data.words?.length ? data.words : VOCABULARY
  }

  create() {
    this.cameras.main.setBackgroundColor('#faf8f3')
    this.trailGraphic = this.add.graphics().setDepth(50)
    this.particles = this.add.graphics().setDepth(51)
    this.deck = shuffle(this.wordPool)
    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointermove', this.onPointerMove, this)
    this.input.on('pointerup', this.onPointerUp, this)
    this.input.on('pointerupoutside', this.onPointerUp, this)
    this.nextQuestion()
  }

  update(_time: number, delta: number) {
    if (this.finished) return
    if (this.hitStopMs > 0) {
      this.hitStopMs -= delta
      this.drawTrail()
      return
    }
    this.elapsed += delta
    this.questionElapsed += delta
    this.secondsLeft = Math.max(0, ROUND_SECONDS - Math.floor(this.elapsed / 1000))
    if (this.secondsLeft <= 0 || this.lives <= 0) return this.completeRound()

    const speedScale = 1 + Math.min(this.elapsed / 120000, 1) * 1.15
    const width = this.scale.width
    const height = this.scale.height
    for (const target of [...this.targets]) {
      target.container.x += target.vx * speedScale * delta / 1000
      target.container.y += target.vy * speedScale * delta / 1000
      target.container.rotation = Phaser.Math.Clamp(target.container.rotation + target.vx * 0.00000025 * delta, -0.052, 0.052)
      if (target.container.x < -180 || target.container.x > width + 180 || target.container.y > height + 100) {
        if (target.correct && !target.resolved) this.resolveMiss()
        target.container.destroy()
        this.targets = this.targets.filter((item) => item !== target)
      }
    }

    if (this.questionElapsed > 6500 && this.targets.some((target) => target.correct && !target.resolved)) {
      this.resolveMiss()
    }
    this.drawTrail()
  }

  private nextQuestion() {
    if (this.deck.length === 0) this.deck = shuffle(this.wordPool)
    this.current = this.deck.shift()!
    this.questionStartedAt = this.time.now
    this.questionElapsed = 0
    this.clearTargets()
    this.spawnTargets(makeAnswers(this.current, this.wordPool))
    this.emitHud()
  }

  private spawnTargets(answers: string[]) {
    const w = this.scale.width
    const h = this.scale.height
    const cardWidth = Phaser.Math.Clamp(w * 0.42, 145, 210)
    const cardHeight = 72
    const rows = [h * 0.37, h * 0.55, h * 0.72]
    answers.forEach((answer, index) => {
      const fromLeft = index % 2 === 0
      const x = fromLeft ? -cardWidth / 2 : w + cardWidth / 2
      const y = rows[index] + Phaser.Math.Between(-24, 24)
      const background = this.add.graphics()
      background.fillStyle(0xffffff, 0.97)
      background.lineStyle(1.5, 0xc6a15b, 0.75)
      background.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 20)
      background.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 20)
      const label = this.add.text(0, 0, answer, {
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: `${Phaser.Math.Clamp(w * 0.052, 20, 28)}px`, color: '#202322',
      }).setOrigin(0.5)
      const container = this.add.container(x, y, [background, label]).setSize(cardWidth, cardHeight).setDepth(10)
      container.rotation = Phaser.Math.FloatBetween(-0.035, 0.035)
      const duration = Phaser.Math.Between(5200, 6900)
      const vx = (fromLeft ? 1 : -1) * (w + cardWidth * 2) / (duration / 1000)
      const vy = Phaser.Math.Between(-10, 14)
      this.targets.push({ container, meaning: answer, correct: answer === this.current.meaning, vx, vy, resolved: false })
    })
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (this.finished) return
    this.pointerDown = true
    this.trail = [{ x: pointer.x, y: pointer.y }]
    gameEvents.emit('mascot', { state: 'track', dx: 0, dy: 0 })
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.pointerDown || this.finished) return
    const previous = this.trail[this.trail.length - 1]
    const point = { x: pointer.x, y: pointer.y }
    if (Phaser.Math.Distance.Between(previous.x, previous.y, point.x, point.y) < 4) return
    this.trail.push(point)
    if (this.trail.length > 18) this.trail.shift()
    gameEvents.emit('mascot', { state: 'track', dx: point.x - previous.x, dy: point.y - previous.y })
    this.checkCollisions(previous, point)
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (!this.pointerDown) return
    this.pointerDown = false
    const first = this.trail[0]
    const dx = first ? pointer.x - first.x : 0
    const dy = first ? pointer.y - first.y : 0
    gameEvents.emit('mascot', { state: this.trail.length > 2 ? 'slash' : 'idle', dx, dy })
    if (this.trail.length > 2) playCue('slash', this.soundEnabled)
    this.time.delayedCall(170, () => { this.trail = []; this.trailGraphic.clear() })
  }

  private checkCollisions(a: Point, b: Point) {
    for (const target of this.targets) {
      if (target.resolved) continue
      const bounds = target.container.getBounds()
      if (Phaser.Geom.Intersects.LineToRectangle(new Phaser.Geom.Line(a.x, a.y, b.x, b.y), bounds)) {
        target.resolved = true
        target.correct ? this.resolveCorrect(target) : this.resolveIncorrect(target)
        break
      }
    }
  }

  private resolveCorrect(target: Target) {
    this.hitStopMs = 70
    this.attempted++
    this.correct++
    this.combo++
    this.bestCombo = Math.max(this.bestCombo, this.combo)
    this.score += pointsFor(this.combo)
    this.feedback('correct', 'CORRECT')
    this.burst(target.container.x, target.container.y, 0xe4513d)
    playCue('correct', this.soundEnabled)
    haptic(22)
    this.destroyTarget(target)
    this.emitHud()
    this.time.delayedCall(460, () => this.nextQuestion())
  }

  private resolveIncorrect(target: Target) {
    this.hitStopMs = 95
    this.attempted++
    this.combo = 0
    this.lives--
    this.incorrect.push(this.current)
    this.feedback('incorrect', 'WRONG TARGET')
    this.burst(target.container.x, target.container.y, 0x8c8f8d)
    playCue('incorrect', this.soundEnabled)
    haptic([32, 28, 45])
    this.destroyTarget(target)
    this.emitHud()
    this.time.delayedCall(520, () => this.lives > 0 ? this.nextQuestion() : this.completeRound())
  }

  private resolveMiss() {
    if (this.finished) return
    const correctTarget = this.targets.find((target) => target.correct && !target.resolved)
    if (!correctTarget) return
    correctTarget.resolved = true
    this.attempted++
    this.combo = 0
    this.lives--
    this.incorrect.push(this.current)
    this.feedback('missed', 'MISSED')
    playCue('missed', this.soundEnabled)
    haptic([18, 35, 18])
    this.emitHud()
    this.time.delayedCall(450, () => this.lives > 0 ? this.nextQuestion() : this.completeRound())
  }

  private destroyTarget(target: Target) {
    this.tweens.add({ targets: target.container, scale: 1.18, alpha: 0, duration: 220, ease: 'Quad.easeOut', onComplete: () => target.container.destroy() })
    this.targets = this.targets.filter((item) => item !== target)
  }

  private clearTargets() {
    this.targets.forEach((target) => target.container.destroy())
    this.targets = []
  }

  private feedback(type: 'correct' | 'incorrect' | 'missed', message: string) {
    gameEvents.emit('feedback', { type, message })
  }

  private emitHud() {
    gameEvents.emit('hud', { score: this.score, lives: this.lives, combo: this.combo, secondsLeft: this.secondsLeft, current: this.current })
  }

  private completeRound() {
    if (this.finished) return
    this.finished = true
    this.clearTargets()
    gameEvents.emit('complete', { score: this.score, correct: this.correct, attempted: this.attempted, bestCombo: this.bestCombo, incorrect: this.incorrect })
  }

  private drawTrail() {
    this.trailGraphic.clear()
    if (this.trail.length < 2) return
    this.trailGraphic.lineStyle(10, 0xe4513d, 0.16)
    this.trailGraphic.beginPath(); this.trailGraphic.moveTo(this.trail[0].x, this.trail[0].y)
    this.trail.slice(1).forEach((point) => this.trailGraphic.lineTo(point.x, point.y)); this.trailGraphic.strokePath()
    this.trailGraphic.lineStyle(3, 0xfff7df, 0.95)
    this.trailGraphic.beginPath(); this.trailGraphic.moveTo(this.trail[0].x, this.trail[0].y)
    this.trail.slice(1).forEach((point) => this.trailGraphic.lineTo(point.x, point.y)); this.trailGraphic.strokePath()
  }

  private burst(x: number, y: number, color: number) {
    this.particles.clear()
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = Phaser.Math.Between(18, 70)
      this.particles.fillStyle(i % 3 === 0 ? 0xc6a15b : color, 0.9)
      this.particles.fillCircle(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, Phaser.Math.Between(2, 5))
    }
    this.time.delayedCall(180, () => this.particles.clear())
  }

}

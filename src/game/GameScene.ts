import Phaser from 'phaser'
import { VOCABULARY } from '../data/vocabulary'
import { gameEvents } from './events'
import { answerFor, makeAnswers, pointsFor, ROUND_SECONDS, shuffle, STARTING_LIVES, STORY_FOCUS, STORY_RESOLVE } from './rules'
import type { QuestionMode, RunMode, VocabularyWord, WordOutcome } from './types'
import { haptic, playCue } from './feedback'
import { adaptiveDeck, chooseMode, emptyProfile, type LearningProfile } from './learning'
import { CRESTS, type CrestId } from './crests'

type Target = {
  container: Phaser.GameObjects.Container
  meaning: string
  correct: boolean
  vx: number
  vy: number
  resolved: boolean
  width: number
  height: number
  fontSize: number
  label: Phaser.GameObjects.Text
  effect?: Phaser.GameObjects.Graphics
  effectPhase: number
  shakeX: number
  shakeY: number
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
  private questionMode: QuestionMode = 'japanese-meaning'
  private learningProfile: LearningProfile = emptyProfile()
  private outcomes: WordOutcome[] = []
  private runMode: RunMode = 'chapter'
  private roundSeconds = ROUND_SECONDS
  private score = 0
  private lives = STARTING_LIVES
  private maxFocus = STARTING_LIVES
  private resolve = STORY_RESOLVE
  private maxResolve = STORY_RESOLVE
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
  private nativeTouchActive = false
  private finished = false
  private questionAdvanceTimer: number | null = null
  private questionAdvanceQueued = false
  private questionAdvanceDeadline = 0
  private questionAdvanceRemainingMs = 0
  private questionAdvanceCallback: (() => void) | null = null
  private soundEnabled = true
  private hitStopMs = 0
  private opponentId = ''
  private masterEncounter = false
  private battlePhase: 1 | 2 | 3 = 1
  private availableCrests: CrestId[] = []
  private usedCrests: CrestId[] = []
  private crestCharges = 2
  private questionNumber = 0
  private fireTurns = 0
  private earthTurns = 0
  private waterTurns = 0
  private currentEarth = false
  private currentWater = false
  private currentMasterTechnique: CrestId | null = null
  private offCrest?: () => void

  constructor() { super('game') }

  init(data: { soundEnabled?: boolean; words?: VocabularyWord[]; profile?: LearningProfile; mode?: RunMode; opponentId?: string; masterEncounter?: boolean; availableCrests?: CrestId[] }) {
    this.soundEnabled = data.soundEnabled ?? true
    this.wordPool = data.words?.length ? data.words : VOCABULARY
    this.learningProfile = data.profile ?? emptyProfile()
    this.runMode = data.mode ?? 'chapter'
    this.opponentId = data.opponentId ?? ''
    this.masterEncounter = data.masterEncounter ?? false
    this.availableCrests = data.availableCrests ?? []
    this.roundSeconds = this.runMode === 'chapter' ? 90 : this.runMode === 'focus' ? 45 : this.runMode === 'daily' ? 60 : ROUND_SECONDS
    this.maxFocus = this.runMode === 'chapter' ? STORY_FOCUS : STARTING_LIVES
    this.lives = this.maxFocus
    this.maxResolve = this.runMode === 'chapter' ? Math.min(STORY_RESOLVE, Math.max(8, this.wordPool.length)) : STORY_RESOLVE
    this.resolve = this.maxResolve
    this.score = 0; this.combo = 0; this.bestCombo = 0; this.correct = 0; this.attempted = 0
    this.elapsed = 0; this.outcomes = []; this.incorrect = []; this.finished = false; this.hitStopMs = 0
    this.battlePhase = 1; this.usedCrests = []; this.crestCharges = 2; this.questionNumber = 0
    this.fireTurns = 0; this.earthTurns = 0; this.waterTurns = 0; this.currentEarth = false; this.currentWater = false
    this.currentMasterTechnique = this.masterEncounter ? this.crestForOpponent() : null
    this.questionAdvanceQueued = false; this.questionAdvanceDeadline = 0; this.questionAdvanceRemainingMs = 0; this.questionAdvanceCallback = null
    this.secondsLeft = this.roundSeconds
  }

  create() {
    this.cameras.main.setBackgroundColor('#faf8f3')
    this.trailGraphic = this.add.graphics().setDepth(50)
    this.particles = this.add.graphics().setDepth(51)
    this.deck = this.makeDeck()
    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointermove', this.onPointerMove, this)
    this.input.on('pointerup', this.onPointerUp, this)
    this.input.on('pointerupoutside', this.onPointerUp, this)
    this.input.on('pointercancel', this.onPointerCancel, this)
    this.bindNativeTouchInput()
    this.events.once('shutdown', this.handleShutdown, this)
    this.offCrest = gameEvents.on('crest', ({ crest }) => this.activateCrest(crest))
    this.nextQuestion()
    if (this.currentMasterTechnique) this.time.delayedCall(180, () => this.announceMasterTechnique(this.currentMasterTechnique!))
  }

  private handleShutdown() {
    this.unbindNativeTouchInput()
    this.clearQuestionAdvanceTimer()
    this.offCrest?.()
    this.offCrest = undefined
  }

  /**
   * Scene timers can be suspended while iOS is handing off a touch gesture.
   * Keep the question transition on the browser clock and guard it so one
   * swipe can only resolve one answer.
   */
  private scheduleQuestionAdvance(delay: number, callback: () => void) {
    if (this.finished || this.questionAdvanceQueued) return
    this.questionAdvanceQueued = true
    this.questionAdvanceDeadline = Date.now() + delay
    this.questionAdvanceRemainingMs = delay
    this.questionAdvanceCallback = callback
    this.questionAdvanceTimer = window.setTimeout(() => this.runQuestionAdvance(), delay)
  }

  private runQuestionAdvance() {
    if (!this.questionAdvanceQueued) return
    const callback = this.questionAdvanceCallback
    if (this.questionAdvanceTimer !== null) window.clearTimeout(this.questionAdvanceTimer)
    this.questionAdvanceTimer = null
    this.questionAdvanceQueued = false
    this.questionAdvanceDeadline = 0
    this.questionAdvanceRemainingMs = 0
    this.questionAdvanceCallback = null
    if (!this.finished) callback?.()
  }

  private clearQuestionAdvanceTimer() {
    if (this.questionAdvanceTimer !== null) window.clearTimeout(this.questionAdvanceTimer)
    this.questionAdvanceTimer = null
    this.questionAdvanceQueued = false
    this.questionAdvanceDeadline = 0
    this.questionAdvanceRemainingMs = 0
    this.questionAdvanceCallback = null
  }

  private nativeTouchCanvas?: HTMLCanvasElement
  private nativeTouchHandlers?: {
    start: (event: TouchEvent) => void
    move: (event: TouchEvent) => void
    end: (event: TouchEvent) => void
    cancel: (event: TouchEvent) => void
  }

  private bindNativeTouchInput() {
    const canvas = this.game.canvas
    if (!canvas) return
    this.nativeTouchCanvas = canvas
    const toPoint = (touch: Touch): Point => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: (touch.clientX - rect.left) * (this.scale.width / Math.max(1, rect.width)),
        y: (touch.clientY - rect.top) * (this.scale.height / Math.max(1, rect.height)),
      }
    }
    const firstTouch = (event: TouchEvent) => event.changedTouches[0] ?? event.touches[0]
    const start = (event: TouchEvent) => {
      const touch = firstTouch(event)
      if (!touch || this.finished) return
      event.preventDefault()
      this.nativeTouchActive = true
      this.beginSwipe(toPoint(touch))
    }
    const move = (event: TouchEvent) => {
      if (!this.nativeTouchActive) return
      const touch = firstTouch(event)
      if (!touch) return
      event.preventDefault()
      this.moveSwipe(toPoint(touch))
    }
    const end = (event: TouchEvent) => {
      if (!this.nativeTouchActive) return
      const touch = firstTouch(event)
      event.preventDefault()
      this.endSwipe(touch ? toPoint(touch) : undefined)
      this.nativeTouchActive = false
    }
    const cancel = (event: TouchEvent) => {
      if (!this.nativeTouchActive) return
      event.preventDefault()
      this.cancelSwipe()
      this.nativeTouchActive = false
    }
    this.nativeTouchHandlers = { start, move, end, cancel }
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', end, { passive: false })
    canvas.addEventListener('touchcancel', cancel, { passive: false })
  }

  private unbindNativeTouchInput() {
    if (!this.nativeTouchCanvas || !this.nativeTouchHandlers) return
    const canvas = this.nativeTouchCanvas
    const { start, move, end, cancel } = this.nativeTouchHandlers
    canvas.removeEventListener('touchstart', start)
    canvas.removeEventListener('touchmove', move)
    canvas.removeEventListener('touchend', end)
    canvas.removeEventListener('touchcancel', cancel)
    this.nativeTouchCanvas = undefined
    this.nativeTouchHandlers = undefined
    this.nativeTouchActive = false
  }

  update(_time: number, delta: number) {
    if (this.finished) return
    // Browsers can report a multi-second frame after a tab, screenshot, audio
    // prompt, or iOS gesture temporarily suspends rendering. Never let that
    // single frame teleport targets off-screen or consume an entire question.
    const frameDelta = Math.min(Math.max(0, delta), 100)
    // WebKit can defer browser timers around touch handling. Count down from
    // rendered frames as the primary clock, with wall time and setTimeout as
    // independent fallbacks so a missed target can never strand the question.
    if (this.questionAdvanceQueued) {
      this.questionAdvanceRemainingMs -= frameDelta
      if (this.questionAdvanceRemainingMs <= 0 || Date.now() >= this.questionAdvanceDeadline) this.runQuestionAdvance()
    }
    if (this.finished) return
    if (this.hitStopMs > 0) {
      this.hitStopMs -= frameDelta
      this.drawTrail()
      return
    }
    this.elapsed += frameDelta
    this.questionElapsed += frameDelta
    this.secondsLeft = Math.max(0, this.roundSeconds - Math.floor(this.elapsed / 1000))
    if (this.secondsLeft <= 0 || this.lives <= 0) return this.completeRound()

    const storyPressure = this.runMode === 'chapter' && this.masterEncounter ? this.battlePhase === 3 ? 1.18 : this.battlePhase === 2 ? 1.08 : 1 : 1
    const playerWaterScale = this.currentWater ? .5 : 1
    const speedScale = (1 + Math.min(this.elapsed / (this.roundSeconds * 1000), 1) * .65) * storyPressure * playerWaterScale
    const width = this.scale.width
    const height = this.scale.height
    for (const target of [...this.targets]) {
      target.container.x -= target.shakeX
      target.container.y -= target.shakeY
      target.shakeX = 0; target.shakeY = 0
      if (!this.currentEarth) {
        const windActive = this.currentMasterTechnique === 'wind' && this.questionNumber <= 3
        const windX = windActive ? Math.sin(this.questionElapsed * .012 + target.effectPhase) * 72 : 0
        const windY = windActive ? Math.cos(this.questionElapsed * .009 + target.effectPhase) * 46 : 0
        target.container.x += (target.vx + windX) * speedScale * frameDelta / 1000
        target.container.y += (target.vy + windY) * speedScale * frameDelta / 1000
      }
      if (this.currentMasterTechnique === 'earth' && this.questionNumber <= 3) {
        target.shakeX = Math.sin(this.questionElapsed * .05 + target.effectPhase) * 5
        target.shakeY = Math.cos(this.questionElapsed * .043 + target.effectPhase) * 3
        target.container.x += target.shakeX; target.container.y += target.shakeY
      }
      if (target.effect) {
        const pulse = .62 + Math.sin(this.questionElapsed * .01 + target.effectPhase) * .22
        target.effect.setAlpha(pulse)
        target.effect.setScale(1 + Math.sin(this.questionElapsed * .008 + target.effectPhase) * .035)
      }
      if (this.currentMasterTechnique === 'void' && this.questionNumber <= 3) target.label.setAlpha(this.questionElapsed >= 2000 ? 0 : 1)
      target.container.rotation = Phaser.Math.Clamp(target.container.rotation + target.vx * 0.00000025 * frameDelta, -0.052, 0.052)
      if (target.container.x < -180 || target.container.x > width + 180 || target.container.y > height + 100) {
        if (target.correct && !target.resolved) this.resolveMiss()
        target.container.destroy()
        this.targets = this.targets.filter((item) => item !== target)
      }
    }

    if (this.questionElapsed > 8500 && this.targets.some((target) => target.correct && !target.resolved)) {
      this.resolveMiss()
    }
    this.drawTrail()
  }

  private nextQuestion() {
    if (this.finished) return
    this.questionAdvanceQueued = false
    this.questionAdvanceRemainingMs = 0
    if (this.deck.length === 0) this.deck = this.makeDeck()
    this.current = this.deck.shift()!
    this.questionMode = chooseMode(this.current, this.learningProfile)
    this.questionStartedAt = this.time.now
    this.questionElapsed = 0
    this.questionNumber++
    this.currentEarth = this.earthTurns > 0
    this.currentWater = this.waterTurns > 0
    if (this.earthTurns > 0) this.earthTurns--
    if (this.waterTurns > 0) this.waterTurns--
    this.clearTargets()
    this.spawnTargets(makeAnswers(this.current, this.wordPool, this.questionMode))
    if (this.fireTurns > 0) { this.burnWrongTarget(); this.fireTurns-- }
    if (this.currentEarth) this.arrangeTargets()
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
      const fontSize = Phaser.Math.Clamp(w * 0.052, 20, 28)
      const label = this.add.text(0, 0, answer, {
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: `${fontSize}px`, color: '#202322',
      }).setOrigin(0.5)
      const children: Phaser.GameObjects.GameObject[] = [background, label]
      const effect = this.createMasterEffect(cardWidth, cardHeight)
      if (effect) children.push(effect)
      const container = this.add.container(x, y, children).setSize(cardWidth, cardHeight).setDepth(10)
      container.rotation = Phaser.Math.FloatBetween(-0.035, 0.035)
      const duration = Phaser.Math.Between(6500, 8200)
      const vx = (fromLeft ? 1 : -1) * (w + cardWidth * 2) / (duration / 1000)
      const vy = Phaser.Math.Between(-10, 14)
      this.targets.push({ container, meaning: answer, correct: answer === answerFor(this.current, this.questionMode), vx, vy, resolved: false, width: cardWidth, height: cardHeight, fontSize, label, effect, effectPhase: index * 1.9 + Math.random(), shakeX: 0, shakeY: 0 })
    })
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (this.nativeTouchActive) return
    this.beginSwipe({ x: pointer.x, y: pointer.y })
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (this.nativeTouchActive) return
    this.moveSwipe({ x: pointer.x, y: pointer.y })
  }

  private beginSwipe(point: Point) {
    if (this.finished) return
    this.pointerDown = true
    this.trail = [point]
    gameEvents.emit('mascot', { state: 'track', dx: 0, dy: 0 })
  }

  private moveSwipe(point: Point) {
    if (!this.pointerDown || this.finished) return
    const previous = this.trail[this.trail.length - 1]
    if (Phaser.Math.Distance.Between(previous.x, previous.y, point.x, point.y) < 4) return
    this.trail.push(point)
    if (this.trail.length > 18) this.trail.shift()
    const directionAnchor = this.trail[Math.max(0, this.trail.length - 5)]
    gameEvents.emit('mascot', { state: 'track', dx: point.x - directionAnchor.x, dy: point.y - directionAnchor.y })
    this.checkCollisions(previous, point)
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (this.nativeTouchActive) return
    this.endSwipe({ x: pointer.x, y: pointer.y })
  }

  private endSwipe(point?: Point) {
    if (!this.pointerDown) return
    this.finishSwipe(point)
  }

  private finishSwipe(point?: Point) {
    if (!this.pointerDown) return
    const finalPoint = point ?? this.trail[this.trail.length - 1]
    const previous = this.trail[this.trail.length - 1]
    if (finalPoint) {
      if (previous && (previous.x !== finalPoint.x || previous.y !== finalPoint.y)) {
        this.checkCollisions(previous, finalPoint)
      }
      // A fast touch can deliver only down/up. Sweep the complete gesture and
      // also test the release point so the last iPhone event cannot skip a card.
      const first = this.trail[0]
      if (first && (first.x !== finalPoint.x || first.y !== finalPoint.y)) {
        this.checkCollisions(first, finalPoint)
      }
      this.checkPointCollisions(finalPoint)
    }
    this.pointerDown = false
    const first = this.trail[0]
    const dx = first && finalPoint ? finalPoint.x - first.x : 0
    const dy = first && finalPoint ? finalPoint.y - first.y : 0
    gameEvents.emit('mascot', { state: this.trail.length > 2 ? 'slash' : 'idle', dx, dy })
    if (this.trail.length > 2) playCue('slash', this.soundEnabled)
    this.time.delayedCall(170, () => { this.trail = []; this.trailGraphic.clear() })
  }

  private onPointerCancel(pointer?: Phaser.Input.Pointer) {
    if (this.nativeTouchActive) return
    this.cancelSwipe(pointer ? { x: pointer.x, y: pointer.y } : undefined)
  }

  private cancelSwipe(point?: Point) {
    if (!this.pointerDown) return
    if (point) return this.finishSwipe(point)
    this.pointerDown = false
    this.trail = []
    this.trailGraphic.clear()
    gameEvents.emit('mascot', { state: 'idle' })
  }

  private checkCollisions(a: Point, b: Point) {
    for (const target of this.targets) {
      if (target.resolved) continue
      const bounds = target.container.getBounds()
      // Finger input is coarser than a mouse, and iOS may coalesce the final
      // touchmove. A small collision cushion keeps a visible slash reliable
      // without making adjacent targets feel sticky.
      const touchPadding = 12
      const paddedBounds = new Phaser.Geom.Rectangle(bounds.x - touchPadding, bounds.y - touchPadding, bounds.width + touchPadding * 2, bounds.height + touchPadding * 2)
      if (Phaser.Geom.Intersects.LineToRectangle(new Phaser.Geom.Line(a.x, a.y, b.x, b.y), paddedBounds)) {
        target.resolved = true
        target.correct ? this.resolveCorrect(target, a, b) : this.resolveIncorrect(target, a, b)
        break
      }
    }
  }

  private checkPointCollisions(point: Point) {
    const touchPadding = 20
    for (const target of this.targets) {
      if (target.resolved) continue
      const bounds = target.container.getBounds()
      const paddedBounds = new Phaser.Geom.Rectangle(bounds.x - touchPadding, bounds.y - touchPadding, bounds.width + touchPadding * 2, bounds.height + touchPadding * 2)
      if (paddedBounds.contains(point.x, point.y)) {
        target.resolved = true
        const previous = this.trail[Math.max(0, this.trail.length - 2)] ?? { x: point.x - 40, y: point.y }
        target.correct ? this.resolveCorrect(target, previous, point) : this.resolveIncorrect(target, previous, point)
        return
      }
    }
  }

  private resolveCorrect(target: Target, slashStart: Point, slashEnd: Point) {
    if (this.finished || this.questionAdvanceQueued) return
    this.hitStopMs = 70
    this.attempted++
    this.correct++
    this.combo++
    this.bestCombo = Math.max(this.bestCombo, this.combo)
    this.score += pointsFor(this.combo)
    if (this.runMode === 'chapter') this.resolve = Math.max(0, this.resolve - 1)
    // Commit the transition before phase announcements or any other UI event.
    // A presentation-layer failure must not be able to freeze the battle.
    this.scheduleQuestionAdvance(460, () => this.runMode === 'chapter' && this.resolve <= 0 ? this.completeRound() : this.nextQuestion())
    if (this.runMode === 'chapter' && this.masterEncounter) this.updateBattlePhase()
    this.recordOutcome(true)
    this.emitHud()
    this.feedback('correct', 'CORRECT')
    this.burst(target.container.x, target.container.y, 0xe4513d)
    playCue('correct', this.soundEnabled)
    haptic(22)
    this.safelySliceTarget(target, slashStart, slashEnd, 0xe4513d)
  }

  private resolveIncorrect(target: Target, slashStart: Point, slashEnd: Point) {
    if (this.finished || this.questionAdvanceQueued) return
    this.hitStopMs = 95
    this.attempted++
    this.combo = 0
    this.lives--
    this.incorrect.push(this.current)
    this.scheduleQuestionAdvance(520, () => this.lives > 0 ? this.nextQuestion() : this.completeRound())
    this.recordOutcome(false)
    this.emitHud()
    this.feedback('incorrect', 'WRONG TARGET')
    this.burst(target.container.x, target.container.y, 0x8c8f8d)
    playCue('incorrect', this.soundEnabled)
    haptic([32, 28, 45])
    this.safelySliceTarget(target, slashStart, slashEnd, 0x626765)
  }

  private resolveMiss() {
    if (this.finished || this.questionAdvanceQueued) return
    const correctTarget = this.targets.find((target) => target.correct && !target.resolved)
    if (!correctTarget) return
    correctTarget.resolved = true
    this.attempted++
    this.combo = 0
    this.lives--
    this.incorrect.push(this.current)
    this.scheduleQuestionAdvance(450, () => this.lives > 0 ? this.nextQuestion() : this.completeRound())
    this.recordOutcome(false)
    this.emitHud()
    this.feedback('missed', 'MISSED')
    playCue('missed', this.soundEnabled)
    haptic([18, 35, 18])
  }

  private destroyTarget(target: Target) {
    this.tweens.add({ targets: target.container, scale: 1.18, alpha: 0, duration: 220, ease: 'Quad.easeOut', onComplete: () => target.container.destroy() })
    this.targets = this.targets.filter((item) => item !== target)
  }

  private safelySliceTarget(target: Target, slashStart: Point, slashEnd: Point, accent: number) {
    try {
      this.sliceTarget(target, slashStart, slashEnd, accent)
    } catch (error) {
      // The score and next-question timer are already committed. Fall back to
      // removing the card if a device cannot render the decorative split.
      console.warn('Falling back from sliced target effect', error)
      if (target.container.active) target.container.destroy()
      this.targets = this.targets.filter((item) => item !== target)
    }
  }

  private sliceTarget(target: Target, slashStart: Point, slashEnd: Point, accent: number) {
    const { container, width, height, fontSize } = target
    const x = container.x; const y = container.y; const rotation = container.rotation
    const worldAngle = Math.atan2(slashEnd.y - slashStart.y, slashEnd.x - slashStart.x)
    const localAngle = worldAngle - rotation
    const tangent = { x: Math.cos(localAngle), y: Math.sin(localAngle) }
    const normal = { x: -tangent.y, y: tangent.x }
    if (this.needsMaskFreeSlice()) {
      this.sliceTargetWithoutMasks(target, normal, worldAngle, accent)
      return
    }
    const halves: { card: Phaser.GameObjects.Container; maskShape: Phaser.GameObjects.Graphics }[] = []
    const size = Math.ceil(Math.hypot(width, height) * 2)

    for (const side of [-1, 1]) {
      const cx = width / 2; const cy = height / 2
      const background = this.add.graphics()
      background.fillStyle(0xffffff, .97)
      background.lineStyle(1.5, 0xc6a15b, .78)
      background.fillRoundedRect(-width / 2, -height / 2, width, height, 20)
      background.strokeRoundedRect(-width / 2, -height / 2, width, height, 20)
      const label = this.add.text(0, 0, target.meaning, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: `${fontSize}px`, color: '#202322' }).setOrigin(.5)
      const card = this.add.container(x, y, [background, label]).setRotation(rotation).setDepth(24)
      const maskShape = this.make.graphics({ x, y }).setRotation(rotation).setVisible(false)
      maskShape.fillStyle(0xffffff)
      maskShape.beginPath()
      maskShape.moveTo(-tangent.x * size, -tangent.y * size)
      maskShape.lineTo(tangent.x * size, tangent.y * size)
      maskShape.lineTo(tangent.x * size + normal.x * size * side, tangent.y * size + normal.y * size * side)
      maskShape.lineTo(-tangent.x * size + normal.x * size * side, -tangent.y * size + normal.y * size * side)
      maskShape.closePath(); maskShape.fillPath()
      card.setMask(maskShape.createGeometryMask())
      halves.push({ card, maskShape })
    }

    container.destroy()
    this.targets = this.targets.filter((item) => item !== target)
    const separation = 24
    halves.forEach(({ card, maskShape }, index) => {
      const direction = index === 0 ? -1 : 1
      this.tweens.add({
        targets: [card, maskShape],
        x: x + normal.x * separation * direction,
        y: y + normal.y * separation * direction + 10,
        rotation: rotation + direction * 0.055,
        alpha: 0,
        duration: 340,
        ease: 'Quad.easeOut',
        onComplete: () => {
          card.clearMask(true)
          card.destroy()
          maskShape.destroy()
        },
      })
    })
    this.brushImpact(x, y, worldAngle, accent)
  }

  private needsMaskFreeSlice() {
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isiPadDesktopMode = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
    return isiOS || isiPadDesktopMode
  }

  /**
   * Mobile Safari can silently drop GeometryMask output on Containers. These
   * are two genuinely separate card fragments, so the effect needs no canvas
   * textures, stencil masks, or browser-specific clipping support.
   */
  private sliceTargetWithoutMasks(target: Target, normal: Point, worldAngle: number, accent: number) {
    const { container, width, height, fontSize } = target
    const x = container.x; const y = container.y; const rotation = container.rotation
    const characters = Array.from(target.meaning)
    const midpoint = Math.max(1, Math.ceil(characters.length / 2))
    const labels = [characters.slice(0, midpoint).join(''), characters.slice(midpoint).join('')]
    const fragments: Phaser.GameObjects.Container[] = []

    for (const side of [-1, 1]) {
      const background = this.add.graphics()
      const edgeTop = -height / 2
      const edgeBottom = height / 2
      background.fillStyle(0xf1d7a4, .99)
      background.lineStyle(2, 0x9a652e, .9)
      background.beginPath()
      if (side < 0) {
        background.moveTo(-width / 2, edgeTop)
        background.lineTo(0, edgeTop)
        background.lineTo(-4, -height * .18)
        background.lineTo(3, height * .06)
        background.lineTo(-2, edgeBottom)
        background.lineTo(-width / 2, edgeBottom)
      } else {
        background.moveTo(0, edgeTop)
        background.lineTo(width / 2, edgeTop)
        background.lineTo(width / 2, edgeBottom)
        background.lineTo(-2, edgeBottom)
        background.lineTo(3, height * .06)
        background.lineTo(-4, -height * .18)
      }
      background.closePath(); background.fillPath(); background.strokePath()
      background.lineStyle(1.2, 0xb98242, .38)
      background.lineBetween(side < 0 ? -width * .43 : width * .08, -height * .2, side < 0 ? -width * .08 : width * .43, -height * .25)
      background.lineBetween(side < 0 ? -width * .4 : width * .1, height * .2, side < 0 ? -width * .1 : width * .4, height * .15)
      background.lineStyle(2, 0x74471f, .7)
      background.lineBetween(side < 0 ? -3 : 3, -height * .44, side < 0 ? 2 : -2, -height * .2)
      background.lineBetween(side < 0 ? 2 : -2, height * .08, side < 0 ? -2 : 2, height * .42)
      const index = side < 0 ? 0 : 1
      const label = this.add.text(side * width * .25, 0, labels[index], {
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: `${Math.max(16, fontSize * .86)}px`, color: '#202322',
      }).setOrigin(.5)
      fragments.push(this.add.container(x, y, [background, label]).setRotation(rotation).setDepth(24))
    }

    container.destroy()
    this.targets = this.targets.filter((item) => item !== target)
    fragments.forEach((fragment, index) => {
      const direction = index === 0 ? -1 : 1
      this.tweens.add({
        targets: fragment,
        x: x + normal.x * 48 * direction,
        y: y + normal.y * 48 * direction + 20,
        rotation: rotation + direction * .13,
        alpha: 0,
        duration: 540,
        ease: 'Quad.easeOut',
        onComplete: () => fragment.destroy(),
      })
    })
    this.woodSplinters(x, y, worldAngle)
    this.brushImpact(x, y, worldAngle, accent)
  }

  private woodSplinters(x: number, y: number, angle: number) {
    for (let index = 0; index < 9; index++) {
      const direction = index % 2 === 0 ? -1 : 1
      const splinter = this.add.rectangle(x, y, Phaser.Math.Between(3, 8), Phaser.Math.Between(1, 3), index % 3 === 0 ? 0x74471f : 0xc28b49, .95)
        .setDepth(54)
        .setRotation(angle + Phaser.Math.FloatBetween(-.65, .65))
      this.tweens.add({
        targets: splinter,
        x: x + direction * Phaser.Math.Between(24, 72),
        y: y + Phaser.Math.Between(-38, 48),
        rotation: splinter.rotation + Phaser.Math.FloatBetween(-1.2, 1.2),
        alpha: 0,
        duration: Phaser.Math.Between(380, 560),
        ease: 'Quad.easeOut',
        onComplete: () => splinter.destroy(),
      })
    }
  }

  private brushImpact(x: number, y: number, angle: number, accent: number) {
    const ink = this.add.graphics().setDepth(53).setPosition(x, y).setRotation(angle)
    ink.lineStyle(16, 0x262321, 0.16); ink.lineBetween(-74, 0, 74, 0)
    ink.lineStyle(9, accent, 0.88); ink.lineBetween(-70, 0, 58, 0)
    ink.lineStyle(4, 0xfff4dc, 0.9); ink.lineBetween(-66, -1, 70, -1)
    for (let i = 0; i < 7; i++) {
      ink.fillStyle(i % 2 ? accent : 0x2c2926, Phaser.Math.FloatBetween(.25, .7))
      ink.fillCircle(Phaser.Math.Between(46, 82), Phaser.Math.Between(-13, 13), Phaser.Math.Between(1, 3))
    }
    this.tweens.add({ targets: ink, alpha: 0, scaleX: 1.08, duration: 280, ease: 'Quad.easeOut', onComplete: () => ink.destroy() })
  }

  private clearTargets() {
    this.targets.forEach((target) => target.container.destroy())
    this.targets = []
  }

  private feedback(type: 'correct' | 'incorrect' | 'missed', message: string) {
    gameEvents.emit('feedback', { type, message })
  }

  private crestForOpponent(): CrestId | null {
    if (this.opponentId === 'iwao-jubei') return 'wind'
    if (this.opponentId === 'lady-shizuru') return 'fire'
    if (this.opponentId === 'genzo-masatsugu') return 'earth'
    if (this.opponentId === 'akane-tomoe') return 'water'
    if (this.opponentId === 'takamine-harunobu') return 'void'
    return null
  }

  private announceMasterTechnique(crest: CrestId) {
    const copy: Record<CrestId, { title: string; message: string }> = {
      wind: { title: '乱風の陣 · CHAOTIC WIND', message: 'Jūbei scatters the next three formations.' },
      fire: { title: '狐火の帳 · FOXFIRE VEIL', message: 'Shizuru veils the next three choices in flame.' },
      earth: { title: '地鳴りの構え · EARTHSHAKING STANCE', message: 'Genzou shakes the next three formations.' },
      water: { title: '水紋の乱 · DISTORTING RIPPLES', message: 'Akane covers the next three choices in rippling water.' },
      void: { title: '空相の試練 · EMPTY FORM', message: 'Remember well. The next three choices vanish after two seconds.' },
    }
    gameEvents.emit('battle', { type: 'ability', ...copy[crest] })
  }

  private createMasterEffect(width: number, height: number) {
    if (!this.currentMasterTechnique || this.questionNumber > 3) return undefined
    if (this.currentMasterTechnique !== 'fire' && this.currentMasterTechnique !== 'water') return undefined
    const effect = this.add.graphics().setDepth(3)
    if (this.currentMasterTechnique === 'fire') {
      effect.fillStyle(0xff6a20, .22)
      for (let x = -width / 2 + 14; x < width / 2; x += 25) {
        effect.fillTriangle(x - 8, height / 2 - 3, x + 8, height / 2 - 3, x, height / 2 - Phaser.Math.Between(25, 47))
      }
      effect.lineStyle(3, 0x7f5cff, .5)
      effect.strokeRoundedRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, 17)
    } else {
      effect.lineStyle(4, 0x56b7d8, .34)
      effect.strokeEllipse(0, -10, width * .82, 24)
      effect.lineStyle(3, 0xb7ebf3, .45)
      effect.strokeEllipse(0, 10, width * .62, 18)
      effect.fillStyle(0x4ba8c7, .09)
      effect.fillRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, 18)
    }
    return effect
  }

  private activateCrest(crest: CrestId) {
    if (this.finished || this.questionAdvanceQueued || this.crestCharges <= 0 || !this.availableCrests.includes(crest) || this.usedCrests.includes(crest)) return
    this.crestCharges--
    this.usedCrests.push(crest)
    const copy: Record<CrestId, string> = {
      wind: 'One false answer is carried away.',
      fire: 'A false answer burns away for two questions.',
      earth: 'The choices stand still for two questions.',
      water: 'The current slows for three questions.',
      void: 'False forms fade from sight.',
    }
    gameEvents.emit('battle', { type: 'ability', title: `${CRESTS[crest].kanji} · ${CRESTS[crest].technique.toUpperCase()}`, message: copy[crest] })
    haptic([12, 22, 16])
    if (crest === 'wind') this.blowAwayWrongTarget()
    if (crest === 'fire') { this.fireTurns = 1; this.burnWrongTarget() }
    if (crest === 'earth') { this.earthTurns = 1; this.currentEarth = true; this.arrangeTargets() }
    if (crest === 'water') { this.waterTurns = 2; this.currentWater = true }
    if (crest === 'void') this.fadeWrongTargets()
    this.emitHud()
  }

  private randomWrongTarget() {
    return Phaser.Utils.Array.GetRandom(this.targets.filter((target) => !target.correct && !target.resolved)) as Target | undefined
  }

  private blowAwayWrongTarget() {
    const target = this.randomWrongTarget()
    if (!target) return
    const direction = target.container.x < this.scale.width / 2 ? -1 : 1
    this.targets = this.targets.filter((item) => item !== target)
    this.tweens.add({ targets: target.container, x: target.container.x + direction * 260, y: target.container.y - 80, rotation: direction * .35, alpha: 0, duration: 430, ease: 'Cubic.easeIn', onComplete: () => target.container.destroy() })
  }

  private burnWrongTarget() {
    const target = this.randomWrongTarget()
    if (!target) return
    this.targets = this.targets.filter((item) => item !== target)
    const flame = this.add.graphics().setDepth(45).setPosition(target.container.x, target.container.y)
    flame.fillStyle(0xf05a32, .85); flame.fillTriangle(-35, 30, -5, -34, 12, 30); flame.fillStyle(0xf6b73c, .9); flame.fillTriangle(-8, 30, 18, -22, 34, 30)
    this.tweens.add({ targets: [target.container, flame], scale: .72, alpha: 0, y: target.container.y - 24, duration: 520, ease: 'Quad.easeIn', onComplete: () => { target.container.destroy(); flame.destroy() } })
  }

  private arrangeTargets() {
    const spacing = Math.min(92, this.scale.height * .16)
    const centerY = this.scale.height * .52
    this.targets.forEach((target, index) => {
      target.vx = 0; target.vy = 0; target.container.setRotation(0)
      this.tweens.add({ targets: target.container, x: this.scale.width / 2, y: centerY + (index - 1) * spacing, duration: 300, ease: 'Quad.easeOut' })
    })
  }

  private fadeWrongTargets() {
    this.targets.filter((target) => !target.correct).forEach((target) => this.tweens.add({ targets: target.container, alpha: .24, duration: 260 }))
  }

  private updateBattlePhase() {
    const ratio = this.resolve / Math.max(1, this.maxResolve)
    const nextPhase: 1 | 2 | 3 = ratio > .66 ? 1 : ratio > .33 ? 2 : 3
    if (nextPhase === this.battlePhase) return
    this.battlePhase = nextPhase
    const phaseCopy = this.opponentId === 'iwao-jubei'
      ? nextPhase === 2
        ? { title: 'JŪBEI · SECOND STANCE', message: 'The old ronin’s smile sharpens. The lesson quickens.' }
        : { title: 'JŪBEI · FINAL STANCE', message: 'No wasted motion now. Keep your mind still.' }
      : this.opponentId === 'akane-tomoe'
        ? nextPhase === 2
          ? { title: 'AKANE · RIPPLE STANCE', message: 'The surface shifts. Read through the uncertainty.' }
          : { title: 'AKANE · DEEP CURRENT', message: 'One final choice. Do not let the current move your heart.' }
        : this.opponentId === 'takamine-harunobu'
          ? nextPhase === 2
            ? { title: 'HARUNOBU · VEILED STANCE', message: 'The obvious opening is a question, not an invitation.' }
            : { title: 'HARUNOBU · EMPTY BLADE', message: 'See the cost. Strike only when the answer is clear.' }
          : this.opponentId === 'masanori'
            ? nextPhase === 2
              ? { title: 'MASANORI · DIVIDE', message: 'He presses the space between Ren and Hana.' }
              : { title: 'MASANORI · BROKEN OATH', message: 'Trust each other. Leave him no doubt to use.' }
            : this.opponentId === 'takamine-nobumasa'
              ? nextPhase === 2
                ? { title: 'NOBUMASA · IRON ORDER', message: 'The false master forces every target faster.' }
                : { title: 'NOBUMASA · LAST DECREE', message: 'Hold every lesson. The truth needs one final opening.' }
        : null
    if (!phaseCopy) return
    gameEvents.emit('battle', { type: 'phase', phase: nextPhase, ...phaseCopy })
  }

  private emitHud() {
    const prompt = this.questionMode === 'meaning-japanese' ? this.current.meaning : this.questionMode === 'reading-meaning' ? this.current.reading : this.current.japanese
    const promptLabel = this.questionMode === 'meaning-japanese' ? 'Slash the Japanese for' : this.questionMode === 'reading-meaning' ? 'Slash the meaning of this reading' : 'Slash the meaning of'
    gameEvents.emit('hud', { score: this.score, lives: this.lives, combo: this.combo, secondsLeft: this.secondsLeft, current: this.current, prompt, promptLabel, promptReading: this.questionMode === 'japanese-meaning' ? this.current.reading : undefined, mode: this.questionMode, focus: this.lives, maxFocus: this.maxFocus, resolve: this.resolve, maxResolve: this.maxResolve, battlePhase: this.battlePhase, crestCharges: this.crestCharges, availableCrests: this.availableCrests, usedCrests: this.usedCrests })
  }

  private completeRound() {
    if (this.finished) return
    this.clearQuestionAdvanceTimer()
    this.finished = true
    this.clearTargets()
    gameEvents.emit('complete', { score: this.score, correct: this.correct, attempted: this.attempted, bestCombo: this.bestCombo, incorrect: this.incorrect, outcomes: this.outcomes, mode: this.runMode })
  }

  private makeDeck() {
    const adaptive = adaptiveDeck(this.wordPool, this.learningProfile)
    const weak = adaptive.filter((word) => (this.learningProfile.mastery[word.japanese]?.level ?? 0) < 2)
    return shuffle([...adaptive, ...weak.slice(0, Math.min(4, weak.length))])
  }

  private recordOutcome(correct: boolean) {
    const outcome = { word: this.current, correct, mode: this.questionMode }
    this.outcomes.push(outcome)
    gameEvents.emit('outcome', outcome)
  }

  private drawTrail() {
    this.trailGraphic.clear()
    if (this.trail.length < 2) return
    for (let index = 1; index < this.trail.length; index++) {
      const a = this.trail[index - 1]; const b = this.trail[index]
      const progress = index / (this.trail.length - 1)
      const width = 3 + progress * 11
      this.trailGraphic.lineStyle(width + 7, 0x24211f, .08 + progress * .1); this.trailGraphic.lineBetween(a.x, a.y, b.x, b.y)
      this.trailGraphic.lineStyle(width, 0xe4513d, .3 + progress * .55); this.trailGraphic.lineBetween(a.x, a.y, b.x, b.y)
      this.trailGraphic.lineStyle(Math.max(1.5, width * .2), 0xfff5dd, .72); this.trailGraphic.lineBetween(a.x, a.y - 1, b.x, b.y - 1)
      if (index % 3 === 0) {
        this.trailGraphic.lineStyle(1, 0x2d2925, .3)
        this.trailGraphic.lineBetween(a.x, a.y + width * .42, b.x, b.y + width * .3)
      }
    }
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

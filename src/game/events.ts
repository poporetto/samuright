import type { Feedback, HudState, RoundSummary, WordOutcome } from './types'

type Events = {
  hud: HudState
  feedback: Feedback
  complete: RoundSummary
  outcome: WordOutcome
  mascot: { state: 'idle' | 'track' | 'slash'; dx?: number; dy?: number }
  battle: { type: 'phase' | 'ability'; phase?: 1 | 2 | 3; title: string; message: string }
}

type Listener<K extends keyof Events> = (value: Events[K]) => void
const listeners = new Map<keyof Events, Set<(value: never) => void>>()

export const gameEvents = {
  on<K extends keyof Events>(name: K, listener: Listener<K>) {
    const set = listeners.get(name) ?? new Set()
    set.add(listener as (value: never) => void)
    listeners.set(name, set)
    return () => set.delete(listener as (value: never) => void)
  },
  emit<K extends keyof Events>(name: K, value: Events[K]) {
    listeners.get(name)?.forEach((listener) => {
      try {
        listener(value as never)
      } catch (error) {
        // React overlays are presentation only. Never allow one failed listener
        // to interrupt Phaser scoring or question progression.
        console.error(`Game UI listener failed for ${name}`, error)
      }
    })
  },
}

import type { Feedback, HudState, RoundSummary } from './types'

type Events = {
  hud: HudState
  feedback: Feedback
  complete: RoundSummary
  mascot: { state: 'idle' | 'track' | 'slash'; direction?: number }
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
    listeners.get(name)?.forEach((listener) => listener(value as never))
  },
}

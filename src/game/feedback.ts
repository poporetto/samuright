type Cue = 'slash' | 'correct' | 'incorrect' | 'missed'

let context: AudioContext | null = null

function audioContext() {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null
  context ??= new AudioCtx()
  if (context.state === 'suspended') void context.resume()
  return context
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, volume: number, type: OscillatorType = 'sine', endFrequency?: number) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration)
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration)
}

function noise(ctx: AudioContext, start: number, duration: number, volume: number) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const source = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  source.buffer = buffer
  filter.type = 'highpass'; filter.frequency.value = 850
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  source.connect(filter).connect(gain).connect(ctx.destination)
  source.start(start); source.stop(start + duration)
}

export function playCue(cue: Cue, enabled: boolean) {
  if (!enabled) return
  const ctx = audioContext()
  if (!ctx) return
  const now = ctx.currentTime
  if (cue === 'slash') {
    noise(ctx, now, 0.11, 0.09)
    tone(ctx, 1150, now, 0.09, 0.035, 'sawtooth', 260)
  } else if (cue === 'correct') {
    tone(ctx, 520, now, 0.09, 0.055, 'sine')
    tone(ctx, 780, now + 0.07, 0.13, 0.05, 'sine')
  } else if (cue === 'incorrect') {
    tone(ctx, 210, now, 0.15, 0.055, 'square', 125)
  } else {
    tone(ctx, 240, now, 0.11, 0.045, 'triangle', 160)
    tone(ctx, 150, now + 0.08, 0.16, 0.04, 'triangle')
  }
}

export function haptic(pattern: number | number[]) {
  if ('vibrate' in navigator) navigator.vibrate(pattern)
}

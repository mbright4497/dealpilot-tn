import type { AssistantStyle } from '@/lib/assistant-personality'

let currentAudio: HTMLAudioElement | null = null
let speakingState = false

export async function speakElevenLabs(
  text: string,
  style: AssistantStyle,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null
    }
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, style }),
    })
    if (!res.ok) throw new Error('TTS request failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentAudio = audio
    audio.onplay = () => { speakingState = true; if (onStart) onStart() }
    audio.onended = () => { speakingState = false; currentAudio = null; URL.revokeObjectURL(url); if (onEnd) onEnd() }
    audio.onerror = () => { speakingState = false; currentAudio = null; if (onEnd) onEnd() }
    await audio.play()
  } catch (e) {
    console.error('ElevenLabs TTS error, falling back to browser:', e)
    speakBrowser(text, style, onStart, onEnd)
  }
}

function speakBrowser(text: string, style: AssistantStyle, onStart?: () => void, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const utter = new SpeechSynthesisUtterance(text)
  utter.rate = 1.0
  utter.pitch = 1.0
  utter.onstart = () => { speakingState = true; if (onStart) onStart() }
  utter.onend = () => { speakingState = false; if (onEnd) onEnd() }
  window.speechSynthesis.speak(utter)
}

export function speak(text: string, style: AssistantStyle, onStart?: () => void, onEnd?: () => void) {
  speakElevenLabs(text, style, onStart, onEnd)
}

export function stopSpeaking(): void {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; speakingState = false }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}

export function isSpeaking(): boolean { return speakingState }

export function previewVoice(style: AssistantStyle): void {
  const samples: Record<AssistantStyle, string> = {
    'joyful': "Hey there! Let's get things rolling!",
    'straight': "Good morning. Here is a quick sample.",
    'calm': "Good morning. Take a deep breath, we have got this.",
    'executive': "Morning. Here is a concise briefing sample.",
    'friendly-tn': "Hey Matt! Ready when you are, partner.",
  }
  speak(samples[style] || samples['friendly-tn'], style)
}

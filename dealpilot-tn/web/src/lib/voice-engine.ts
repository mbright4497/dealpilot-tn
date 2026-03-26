import type { AssistantStyle } from '@/lib/assistant-personality'

let currentAudio: HTMLAudioElement | null = null
let speakingState = false

export async function speakAPI(
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
    // Stream via browser by pointing audio.src at GET endpoint so playback starts immediately
    const res = await fetch('/api/reva/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) throw new Error('reva speak request failed')
    const blob = await res.blob()
    const audio = new Audio(URL.createObjectURL(blob))
    currentAudio = audio
    audio.onplay = () => { speakingState = true; if (onStart) onStart() }
    audio.onended = () => { speakingState = false; currentAudio = null; if (onEnd) onEnd() }
    audio.onerror = () => { speakingState = false; currentAudio = null; if (onEnd) onEnd() }
    await audio.play()
  } catch (e) {
    console.error('TTS API error:', e)
    speakingState = false
    if (onEnd) onEnd()
  }
}

function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve([])
    const synth = window.speechSynthesis
    let voices = synth.getVoices()
    if (voices.length > 0) return resolve(voices)
    const handler = () => {
      voices = synth.getVoices()
      synth.removeEventListener('voiceschanged', handler)
      resolve(voices)
    }
    synth.addEventListener('voiceschanged', handler)
    // fallback: resolve after short timeout
    setTimeout(() => { voices = synth.getVoices(); synth.removeEventListener('voiceschanged', handler); resolve(voices) }, 2000)
  })
}

/* speakBrowser removed to disable browser TTS fallback. */

export function speak(text: string, style: AssistantStyle, onStart?: () => void, onEnd?: () => void) {
  // Try server-side TTS (OpenAI) first, fallback to browser TTS
  speakAPI(text, style, onStart, onEnd)
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
    'friendly-tn': "Hey there! Ready when you are, partner.",
  }
  speak(samples[style] || samples['friendly-tn'], style)
}

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
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
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
    console.error('TTS API error, falling back to browser:', e)
    speakBrowser(text, style, onStart, onEnd)
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

function speakBrowser(text: string, style: AssistantStyle, onStart?: () => void, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const utter = new SpeechSynthesisUtterance(text)
  const voiceConfig: Record<string, {rate:number,pitch:number}> = {
    'joyful': {rate:1.15, pitch:1.2},
    'straight': {rate:1.0, pitch:0.9},
    'calm': {rate:0.85, pitch:0.95},
    'executive': {rate:0.95, pitch:0.85},
    'friendly-tn': {rate:1.05, pitch:1.1},
  }
  const cfg = (voiceConfig as any)[style] || voiceConfig['friendly-tn']
  utter.rate = cfg.rate
  // we'll set pitch to 1.1 for a consistent female sound

  utter.onstart = () => { speakingState = true; if (onStart) onStart() }
  utter.onend = () => { speakingState = false; if (onEnd) onEnd() }

  waitForVoices().then(voices => {
    try{
      if (voices.length > 0) {
        const preferredNames = ['Samantha','Karen','Moira','Tessa','Victoria','Google US English Female']
        let femaleVoice = voices.find(v => {
          const n = (v.name||'').toLowerCase()
          return preferredNames.some(p => n.includes(p.toLowerCase())) || n.includes('female')
        })
        if(!femaleVoice){
          // fallback: first en voice not in common male names
          const maleNames = ['alex','daniel','fred','thomas']
          femaleVoice = voices.find(v => {
            const n = (v.name||'').toLowerCase()
            const lang = (v.lang||'').toLowerCase()
            return lang.includes('en') && !maleNames.some(m=>n.includes(m))
          })
        }
        if(femaleVoice) {
          utter.voice = femaleVoice
        }
        // enforce higher pitch for feminine sound
        utter.pitch = 1.1
      } else {
        utter.pitch = 1.1
      }
    }catch(e){ utter.pitch = 1.1 }
    window.speechSynthesis.speak(utter)
  }).catch(()=>{ utter.pitch = 1.1; window.speechSynthesis.speak(utter) })
}

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

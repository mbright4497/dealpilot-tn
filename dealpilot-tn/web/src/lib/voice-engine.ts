import type { AssistantStyle } from '@/lib/assistant-personality'

export type VoicePreference = { voiceName?: string; rate: number; pitch: number }

export const VOICE_MAP: Record<AssistantStyle, VoicePreference> = {
  'joyful': { rate: 1.1, pitch: 1.15 },
  'straight': { rate: 1.0, pitch: 1.0 },
  'calm': { rate: 0.9, pitch: 0.95 },
  'executive': { rate: 0.95, pitch: 0.9 },
  'friendly-tn': { rate: 1.0, pitch: 1.05 },
}

function safeGetVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices()
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  const voices = safeGetVoices()
  return voices.filter(v => /en(-|_)?us/i.test(v.lang) || /en/i.test(v.lang))
}

function isFemaleVoice(v: SpeechSynthesisVoice){
  const name = (v.name || '').toLowerCase()
  return /(female|zira|susan|kathy|victoria|alloy|samantha|amber|woman|gina|lucy|emma)/i.test(name)
}
function isMaleVoice(v: SpeechSynthesisVoice){
  const name = (v.name || '').toLowerCase()
  return /(male|david|mark|matthew|john|alex|juan|tom|daniel|mike|michael|paul)/i.test(name)
}

export function findBestVoice(style: AssistantStyle): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices()
  if(voices.length===0) return null
  // preferences
  if(style === 'joyful' || style === 'friendly-tn'){
    const female = voices.find(isFemaleVoice)
    if(female) return female
  }
  if(style === 'executive' || style === 'straight'){
    const male = voices.find(isMaleVoice)
    if(male) return male
  }
  // calm or fallback
  return voices[0] || null
}

export function speak(text: string, style: AssistantStyle, onStart?: ()=>void, onEnd?: ()=>void): SpeechSynthesisUtterance | null{
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const pref = VOICE_MAP[style] || { rate: 1.0, pitch: 1.0 }
  const utter = new SpeechSynthesisUtterance(text)
  const voice = findBestVoice(style)
  if(voice) utter.voice = voice
  utter.rate = pref.rate
  utter.pitch = pref.pitch
  utter.onstart = ()=>{ if(onStart) onStart() }
  utter.onend = ()=>{ if(onEnd) onEnd() }
  window.speechSynthesis.speak(utter)
  return utter
}

export function stopSpeaking(): void{
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
}

export function isSpeaking(): boolean{
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  return window.speechSynthesis.speaking
}

export function previewVoice(style: AssistantStyle): void{
  const samples: Record<AssistantStyle,string> = {
    'joyful': "Hey there! Let's get things rolling!",
    'straight': "Good morning. Here's a quick sample.",
    'calm': "Good morning. Take a deep breath — we've got this.",
    'executive': "Morning. Here's a concise briefing sample.",
    'friendly-tn': "Mornin'! Ready when you are.",
  }
  const text = samples[style] || samples['friendly-tn']
  speak(text, style)
}

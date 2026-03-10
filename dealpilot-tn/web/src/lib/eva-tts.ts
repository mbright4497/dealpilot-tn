export function stripMarkup(text:string){
  if(!text) return ''
  // remove HTML tags
  const noHtml = text.replace(/<[^>]*>/g,'')
  // remove **bold** markers
  return noHtml.replace(/\*\*(.*?)\*\*/g,'$1')
}

let currentUtterance: SpeechSynthesisUtterance | null = null

function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve)=>{
    try{
      const synth = window.speechSynthesis
      let voices = synth.getVoices() || []
      if(voices.length>0) return resolve(voices)
      const handler = ()=>{
        voices = synth.getVoices() || []
        if(voices.length>0){ synth.removeEventListener('voiceschanged', handler as any); return resolve(voices) }
      }
      synth.addEventListener('voiceschanged', handler as any)
      // fallback timeout
      setTimeout(()=>{ const vs = synth.getVoices() || []; synth.removeEventListener('voiceschanged', handler as any); resolve(vs) }, 2000)
    }catch(e){ resolve([]) }
  })
}

export async function speakText(text:string, onStart?:()=>void, onEnd?:()=>void){
  try{
    if(!('speechSynthesis' in window)) return null
    stopSpeaking()
    const clean = stripMarkup(text)
    const u = new SpeechSynthesisUtterance(clean)
    u.rate = 0.95
    u.pitch = 1.05
    const voices = await getVoicesAsync()
    let voice: SpeechSynthesisVoice | null = null
    const prefer = [
      'Samantha',
      'Karen',
      'Moira',
      'Tessa',
      'Google US English',
      'Google UK English Female',
      'Microsoft Zira',
      'Microsoft Jenny',
      'Microsoft Aria',
    ]
    for(const p of prefer){ const found = voices.find(v=> v.name && v.name.includes(p)); if(found){ voice = found; break } }
    if(!voice){
      voice = voices.find(v=> v.name && /female/i.test(v.name)) || voices.find(v=> v.name && /woman|girl/i.test(v.name)) || null
    }
    if(!voice){
      const english = voices.find(v=> v.lang && v.lang.startsWith('en') && !['Alex','Daniel','Fred','Thomas','Google UK English Male','Microsoft David','Microsoft Mark'].includes(v.name || ''))
      if(english) voice = english
    }
    if(!voice) voice = voices.find(v=> v.lang && v.lang.startsWith('en')) || voices[0] || null
    console.log('Eva TTS voice selected:', voice?.name)
    if(voice) u.voice = voice
    u.onstart = ()=>{ currentUtterance = u; try{ onStart && onStart() }catch(e){} }
    u.onend = ()=>{ currentUtterance = null; try{ onEnd && onEnd() }catch(e){} }
    window.speechSynthesis.speak(u)
    return u
  }catch(e){ console.error('speakText error', e); return null }
}

export function stopSpeaking(){ try{ if('speechSynthesis' in window){ window.speechSynthesis.cancel(); currentUtterance = null } }catch(e){ console.error('stopSpeaking', e) } }

export function isSpeaking(){ try{ return ('speechSynthesis' in window) && window.speechSynthesis.speaking }catch(e){ return false } }

export function stripMarkup(text:string){
  if(!text) return ''
  // remove HTML tags
  const noHtml = text.replace(/<[^>]*>/g,'')
  // remove **bold** markers
  return noHtml.replace(/\*\*(.*?)\*\*/g,'$1')
}

let currentUtterance: SpeechSynthesisUtterance | null = null

export function speakText(text:string, onStart?:()=>void, onEnd?:()=>void){
  try{
    if(!('speechSynthesis' in window)) return null
    stopSpeaking()
    const clean = stripMarkup(text)
    const u = new SpeechSynthesisUtterance(clean)
    u.rate = 0.95
    u.pitch = 1.05
    // choose a female voice if possible
    const voices = window.speechSynthesis.getVoices() || []
    let voice = null
    // prefer common female voices
    const prefer = ['Samantha','Microsoft Zira','Google US English','Google UK English Female']
    for(const p of prefer){ const found = voices.find(v=> v.name && v.name.includes(p)); if(found){ voice = found; break } }
    if(!voice){ voice = voices.find(v=> /female/i.test(v.name || v.lang)) || voices[0] || null }
    if(voice) u.voice = voice
    u.onstart = ()=>{ currentUtterance = u; try{ onStart && onStart() }catch(e){} }
    u.onend = ()=>{ currentUtterance = null; try{ onEnd && onEnd() }catch(e){} }
    window.speechSynthesis.speak(u)
    return u
  }catch(e){ console.error('speakText error', e); return null }
}

export function stopSpeaking(){ try{ if('speechSynthesis' in window){ window.speechSynthesis.cancel(); currentUtterance = null } }catch(e){ console.error('stopSpeaking', e) } }

export function isSpeaking(){ try{ return ('speechSynthesis' in window) && window.speechSynthesis.speaking }catch(e){ return false } }

'use client'
import React, { useEffect, useRef, useState } from 'react'

export type EvaState = 'idle' | 'greeting' | 'thinking' | 'speaking' | 'goodbye'

export default function EvaVideoBubble({ state = 'idle', size = 200 }:{ state?: EvaState, size?: number }){
  const idleRef = useRef<HTMLVideoElement|null>(null)
  const greetRef = useRef<HTMLVideoElement|null>(null)
  const thinkingRef = useRef<HTMLVideoElement|null>(null)
  const goodbyeRef = useRef<HTMLVideoElement|null>(null)
  // start in greeting on mount if provided state is 'idle' by default
  const [active, setActive] = useState<EvaState>(state === 'idle' ? 'greeting' : state)
  const [visible, setVisible] = useState(true)
  const [audioUnlocked, setAudioUnlocked] = useState(false) // user clicked to allow audio

  // preload videos and ensure playsInline; start all muted so autoplay isn't blocked
  useEffect(()=>{
    const vids = [idleRef.current, greetRef.current, thinkingRef.current, goodbyeRef.current]
    vids.forEach(v=>{
      if(v){
        v.preload = 'auto'
        v.playsInline = true
        v.muted = true // start muted so autoplay works
      }
    })
    // idle and thinking remain muted; greeting/goodbye will be unmuted when user allows audio
  },[])

  // handle state transitions from prop
  useEffect(()=>{
    let t: any
    if(state === 'greeting'){
      setActive('greeting')
      // fallback timeout in case onEnded isn't fired
      t = setTimeout(()=> setActive('idle'), 12000)
    } else if(state === 'goodbye'){
      setActive('goodbye')
    } else {
      setActive(state)
    }
    return ()=>{ if(t) clearTimeout(t) }
  },[state])

  // when active changes, play the active video and pause others; keep greeting muted until audioUnlocked
  useEffect(()=>{
    const vids: {key: EvaState, el: HTMLVideoElement|null}[] = [
      { key: 'idle', el: idleRef.current },
      { key: 'greeting', el: greetRef.current },
      { key: 'thinking', el: thinkingRef.current },
      { key: 'goodbye', el: goodbyeRef.current }
    ]
    vids.forEach(v=>{
      try{
        if(!v.el) return
        if(v.key === active){
          // ensure mute setting per clip
          if(v.key === 'idle' || v.key === 'thinking') v.el.muted = true
          else v.el.muted = !audioUnlocked // greeting/goodbye muted until user unlocks audio
          v.el.playsInline = true
          const p = v.el.play()
          if(p && typeof p.then === 'function') p.catch(()=>{})
        } else {
          v.el.pause()
          v.el.currentTime = 0
        }
      }catch(e){/* ignore */}
    })
  },[active, audioUnlocked])

  // click handler to enable audio and play greeting with sound
  function enableAudioAndPlayGreeting(){
    setAudioUnlocked(true)
    const g = greetRef.current
    if(!g) return
    try{
      g.muted = false
      g.currentTime = 0
      const p = g.play()
      if(p && typeof p.then === 'function') p.catch(()=>{})
      setActive('greeting')
    }catch(e){}
  }

  // crossfade styles
  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    position: 'relative',
    flex: '0 0 auto'
  }
  const videoStyle: React.CSSProperties = {
    position: 'absolute',
    top:0, left:0, width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 400ms ease'
  }
  const glow = (active==='speaking' || active==='thinking') ? { boxShadow: '0 0 18px 4px rgba(249,115,22,0.45)', border: '2px solid rgba(249,115,22,0.6)' } : { border: '2px solid rgba(255,255,255,0.03)' }

  // overlay style (premium semi-transparent)
  const overlayStyle: React.CSSProperties = {
    position: 'absolute', inset: 0, display: audioUnlocked ? 'none' : (active==='greeting' ? 'flex' : 'none'), alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.45))', color: 'white', flexDirection: 'column', gap:8
  }
  const playButtonStyle: React.CSSProperties = {
    width: 56, height:56, borderRadius:28, background: 'rgba(249,115,22,1)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow: '0 8px 24px rgba(249,115,22,0.2)', cursor:'pointer', animation: 'pulse 1500ms infinite'
  }

  return (
    <div style={{display:'flex',alignItems:'center',gap:12}}>
      <div style={{...containerStyle, ...glow}}>
        <video ref={idleRef} src="/eva-clips/eva-idle.mp4" loop playsInline muted style={{...videoStyle, opacity: active==='idle' || active==='speaking' ? 1 : 0}} />
        <video ref={greetRef} src="/eva-clips/eva-greeting.mp4" playsInline style={{...videoStyle, opacity: active==='greeting' ? 1 : 0}} onEnded={()=>setActive('idle')} autoPlay />
        <video ref={thinkingRef} src="/eva-clips/eva-thinking.mp4" loop playsInline muted style={{...videoStyle, opacity: active==='thinking' ? 1 : 0}} />
        <video ref={goodbyeRef} src="/eva-clips/eva-goodbye.mp4" playsInline style={{...videoStyle, opacity: active==='goodbye' ? 1 : 0}} onEnded={()=>setVisible(false)} />

        {/* Play overlay shown when greeting is active but audio not unlocked */}
        <div style={overlayStyle} onClick={enableAudioAndPlayGreeting}>
          <div style={playButtonStyle} aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M5 3v18l15-9z" /></svg>
          </div>
          <div style={{fontSize:12, color:'rgba(255,255,255,0.95)', fontWeight:600}}>Click to hear Eva</div>
        </div>

        <style>{`@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.06); } 100% { transform: scale(1); } }`}</style>
      </div>
    </div>
  )
}

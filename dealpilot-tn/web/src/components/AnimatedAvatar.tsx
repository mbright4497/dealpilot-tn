'use client'
import React, { useEffect, useRef, useState } from 'react'

export type EvaState = 'idle' | 'greeting' | 'speaking' | 'goodbye'

export default function EvaVideoBubble({ state = 'idle', size = 200 }:{ state?: EvaState, size?: number }){
  const videoRef = useRef<HTMLVideoElement|null>(null)
  // start in greeting on mount if provided state is 'idle' by default
  const [active, setActive] = useState<EvaState>(state === 'idle' ? 'greeting' : state)
  const [audioUnlocked, setAudioUnlocked] = useState(false) // user clicked to allow audio

  // preload video and ensure playsInline; start muted so autoplay isn't blocked
  useEffect(()=>{
    const v = videoRef.current
    if(v){
      v.preload = 'auto'
      v.playsInline = true
      v.muted = true // start muted so autoplay works (visual motion)
      const p = v.play()
      if(p && typeof p.then === 'function') p.catch(()=>{})
    }
  },[])

  // handle state transitions from prop
  useEffect(()=>{
    let t: any
    if(state === 'greeting'){
      setActive('greeting')
      t = setTimeout(()=> setActive('idle'), 12000)
    } else if(state === 'goodbye'){
      setActive('goodbye')
    } else {
      setActive(state)
    }
    return ()=>{ if(t) clearTimeout(t) }
  },[state])

  // when active changes, play or pause video accordingly
  useEffect(()=>{
    const v = videoRef.current
    if(!v) return
    try{
      if(active === 'greeting'){
        v.muted = !audioUnlocked
        v.currentTime = 0
        const p = v.play()
        if(p && typeof p.then === 'function') p.catch(()=>{})
      } else if(active === 'idle' || active === 'speaking'){
        // keep visual looping muted to show motion
        v.loop = true
        v.muted = true
        const p = v.play()
        if(p && typeof p.then === 'function') p.catch(()=>{})
      } else if(active === 'goodbye'){
        v.muted = !audioUnlocked
        v.currentTime = 0
        v.loop = false
        const p = v.play()
        if(p && typeof p.then === 'function') p.catch(()=>{})
      }
    }catch(e){}
  },[active, audioUnlocked])

  // click handler to enable audio and play greeting with sound
  function enableAudioAndPlayGreeting(){
    setAudioUnlocked(true)
    const v = videoRef.current
    if(!v) return
    try{
      v.muted = false
      v.currentTime = 0
      const p = v.play()
      if(p && typeof p.then === 'function') p.catch(()=>{})
      setActive('greeting')
    }catch(e){}
  }

  // styles
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
  const glow = (active==='speaking') ? { boxShadow: '0 0 18px 4px rgba(249,115,22,0.45)', border: '2px solid rgba(249,115,22,0.6)' } : { border: '2px solid rgba(255,255,255,0.03)' }

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
        <video ref={videoRef} src="/eva-clips/eva-welcome.mp4" playsInline style={{...videoStyle, opacity: 1}} onEnded={()=>setActive('idle')} />

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

'use client'
import React, { useEffect, useRef, useState } from 'react'

export type EvaState = 'idle' | 'greeting' | 'thinking' | 'speaking' | 'goodbye'

export default function EvaVideoBubble({ state = 'idle', size = 200 }:{ state?: EvaState, size?: number }){
  const idleRef = useRef<HTMLVideoElement|null>(null)
  const greetRef = useRef<HTMLVideoElement|null>(null)
  const thinkingRef = useRef<HTMLVideoElement|null>(null)
  const goodbyeRef = useRef<HTMLVideoElement|null>(null)
  const [active, setActive] = useState<EvaState>(state)
  const [visible, setVisible] = useState(true)

  // preload videos and ensure muted/playsInline
  useEffect(()=>{
    const vids = [idleRef.current, greetRef.current, thinkingRef.current, goodbyeRef.current]
    vids.forEach(v=>{
      if(v){
        v.preload = 'auto'
        v.muted = true
        v.playsInline = true
      }
    })
  },[])

  // handle state transitions
  useEffect(()=>{
    let t: any
    if(state === 'greeting'){
      setActive('greeting')
      // play greeting once then return to idle
      t = setTimeout(()=> setActive('idle'), 12000)
    } else if(state === 'goodbye'){
      setActive('goodbye')
    } else {
      setActive(state)
    }
    return ()=>{ if(t) clearTimeout(t) }
  },[state])

  // when active changes, play the active video and pause others
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
          // attempt to play; ignore promise rejection
          v.el.muted = true
          v.el.playsInline = true
          const p = v.el.play()
          if(p && typeof p.then === 'function') p.catch(()=>{})
        } else {
          v.el.pause()
          v.el.currentTime = 0
        }
      }catch(e){/* ignore */}
    })
  },[active])

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

  return (
    <div style={{display:'flex',alignItems:'center',gap:12}}>
      <div style={{...containerStyle, ...glow}}>
        <video ref={idleRef} src="/eva-clips/eva-idle.mp4" loop muted playsInline autoPlay style={{...videoStyle, opacity: active==='idle' || active==='speaking' ? 1 : 0}} />
        <video ref={greetRef} src="/eva-clips/eva-greeting.mp4" muted playsInline autoPlay style={{...videoStyle, opacity: active==='greeting' ? 1 : 0}} onEnded={()=>setActive('idle')} />
        <video ref={thinkingRef} src="/eva-clips/eva-thinking.mp4" loop muted playsInline autoPlay style={{...videoStyle, opacity: active==='thinking' ? 1 : 0}} />
        <video ref={goodbyeRef} src="/eva-clips/eva-goodbye.mp4" muted playsInline autoPlay style={{...videoStyle, opacity: active==='goodbye' ? 1 : 0}} onEnded={()=>setVisible(false)} />
      </div>
    </div>
  )
}

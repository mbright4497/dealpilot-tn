'use client'
import React, { useEffect, useRef, useState } from 'react'
import StreamingAvatar, { AvatarQuality, StreamingEvents, TaskType, TaskMode } from '@heygen/streaming-avatar'

export default function HeyGenAvatar({ textToSpeak, size = 200, onSpeakStart, onSpeakEnd }:{ textToSpeak?:string, size?:number, onSpeakStart?:()=>void, onSpeakEnd?:()=>void }){
  const videoRef = useRef<HTMLVideoElement|null>(null)
  const avatarRef = useRef<any>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string| null>(null)
  const [ready, setReady] = useState(false)

  useEffect(()=>{
    return ()=>{
      if(avatarRef.current && avatarRef.current.stop) avatarRef.current.stop()
    }
  },[])

  useEffect(()=>{
    if(!textToSpeak || !ready || !avatarRef.current) return
    try{
      avatarRef.current.speak({ text: textToSpeak, taskType: TaskType.REPEAT, taskMode: TaskMode.SYNC })
    }catch(e:any){ console.warn('heygen speak error',e) }
  },[textToSpeak, ready])

  async function start(){
    setConnecting(true); setError(null)
    try{
      const tRes = await fetch('/api/heygen-token', { method: 'POST' })
      const tj = await tRes.json()
      if(!tj.token) throw new Error(tj.error||'no token')
      const avatar = new StreamingAvatar({ token: tj.token })
      avatarRef.current = avatar
      avatar.addEventListener(StreamingEvents.STREAM_READY, (ev:any)=>{
        try{ const stream = ev.detail.stream; if(videoRef.current) videoRef.current.srcObject = stream; setReady(true) }catch(e){console.warn(e)}
      })
      avatar.addEventListener(StreamingEvents.AVATAR_START_TALKING, ()=>{ if(onSpeakStart) onSpeakStart() })
      avatar.addEventListener(StreamingEvents.AVATAR_STOP_TALKING, ()=>{ if(onSpeakEnd) onSpeakEnd() })
      avatar.addEventListener(StreamingEvents.STREAM_DISCONNECTED, ()=>{ setReady(false) })
      await avatar.createStartAvatar({ quality: AvatarQuality.Medium, avatarName: 'default' })
      setConnecting(false)
    }catch(e:any){ setError(e.message||String(e)); setConnecting(false) }
  }

  return (
    <div className="flex flex-col items-center justify-center">
      {!ready && (
        <button onClick={start} className="rounded-full bg-gray-800 border-2 border-orange-500 text-white px-4 py-3 flex items-center gap-2">
          {connecting? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.25"/><path d="M22 12A10 10 0 0012 2" stroke="white" strokeWidth="3"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3v18l15-9L5 3z"/></svg>}
          <span>Start Avatar</span>
        </button>
      )}
      {error && <div className="text-sm text-red-400 mt-2">{error}</div>}
      <div style={{ width: size, height: size, marginTop: 8 }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', borderRadius: '12px', background:'#111827' }} />
      </div>
    </div>
  )
}

'use client'
import React, { useEffect, useRef, useState } from 'react'
import StreamingAvatar, { AvatarQuality, StreamingEvents, TaskType, TaskMode } from '@heygen/streaming-avatar'

interface HeyGenAvatarProps {
  textToSpeak?: string
  size?: number
  onSpeakStart?: () => void
  onSpeakEnd?: () => void
  onReady?: () => void
  onError?: (err: string) => void
  autoStart?: boolean
}

export default function HeyGenAvatar({ textToSpeak, size = 300, onSpeakStart, onSpeakEnd, onReady, onError, autoStart = true }: HeyGenAvatarProps){
  const videoRef = useRef<HTMLVideoElement|null>(null)
  const avatarRef = useRef<any>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string| null>(null)
  const [ready, setReady] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const lastSpokenRef = useRef<string>('')

  useEffect(()=>{
    return ()=>{
      if(avatarRef.current && avatarRef.current.stopAvatar) {
        try{ avatarRef.current.stopAvatar() }catch(e){}
      } else if(avatarRef.current && avatarRef.current.stop){
        try{ avatarRef.current.stop() }catch(e){}
      }
    }
  },[])

  useEffect(()=>{
    if(autoStart && !ready && !connecting) start()
  },[autoStart])

  useEffect(()=>{
    if(!textToSpeak || !ready || !avatarRef.current) return
    if(textToSpeak === lastSpokenRef.current) return
    lastSpokenRef.current = textToSpeak
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

      avatar.on(StreamingEvents.STREAM_READY, (ev:any)=>{
        try{ const stream = ev.detail.stream; if(videoRef.current) videoRef.current.srcObject = stream; setReady(true); setConnecting(false); if(onReady) onReady() }catch(e){console.warn(e)}
      })
      avatar.on(StreamingEvents.AVATAR_START_TALKING, ()=>{ setSpeaking(true); if(onSpeakStart) onSpeakStart() })
      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, ()=>{ setSpeaking(false); if(onSpeakEnd) onSpeakEnd() })
      avatar.on(StreamingEvents.STREAM_DISCONNECTED, ()=>{ setReady(false); setSpeaking(false) })

      // Try preferred public avatar IDs if a simple name fails
      const preferredAvatars = [
        'Monica_public_3_20240108',
        'Anna_public_3_20240108',
        'Kayla_public_2_20240108',
        'Angela_public_3_20240108',
      ]
      let started = false
      try {
        // First try a short name (legacy) which may fail on some accounts
        await avatar.createStartAvatar({ quality: AvatarQuality.Medium, avatarName: 'default' })
        started = true
      } catch (err) {
        // Try full avatar IDs from preferred list
        for (const aid of preferredAvatars) {
          try {
            await avatar.createStartAvatar({ quality: AvatarQuality.Medium, avatarName: aid })
            started = true
            break
          } catch (err2) {
            // continue
            console.warn('avatar start failed for', aid, err2)
          }
        }
      }

      if (!started) throw new Error('Failed to start any preferred HeyGen avatar')

      setConnecting(false)
    }catch(e:any){ const msg = e.message||String(e); setError(msg); setConnecting(false); if(onError) onError(msg) }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative overflow-hidden rounded-xl bg-gray-900 border-2 border-orange-500/50" style={{ width: size, height: size * 0.56 }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

        {connecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <div className="text-center">
              <svg className="animate-spin mx-auto mb-2" width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.25" /><path d="M22 12A10 10 0 0012 2" stroke="orange" strokeWidth="3" /></svg>
              <p className="text-gray-300 text-sm">Connecting to Eva...</p>
            </div>
          </div>
        )}

        {!ready && !connecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60">
            <button onClick={start} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3v18l15-9L5 3z" /></svg>
              Start Eva Video
            </button>
          </div>
        )}

        {speaking && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-300">Speaking</span>
          </div>
        )}

        <div className="absolute top-2 left-2 bg-black/60 rounded-full px-2 py-1">
          <span className="text-xs text-orange-400 font-semibold">Eva Live</span>
        </div>
      </div>
      {error && <div className="text-sm text-red-400 mt-2 text-center">{error}</div>}
    </div>
  )
}

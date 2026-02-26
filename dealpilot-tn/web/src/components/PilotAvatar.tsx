'use client'
import React, { useEffect, useState } from 'react'

export default function PilotAvatar({ size = 64 }:{ size?: number }){
  const [imgExists, setImgExists] = useState(false)
  useEffect(()=>{
    const img = new Image()
    img.src = '/avatar-pilot.png'
    img.onload = ()=>setImgExists(true)
    img.onerror = ()=>setImgExists(false)
  },[])

  const style:React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    border: '2px solid rgba(249,115,22,1)',
    boxShadow: '0 6px 18px rgba(249,115,22,0.18)',
    display: 'inline-block',
    overflow: 'hidden',
    background: 'linear-gradient(135deg,#1f2937,#111827)'
  }

  if(imgExists){
    return <img src="/avatar-pilot.png" alt="Pilot Avatar" style={style} />
  }
  return (
    <div style={style} className="flex items-center justify-center text-white font-bold">
      <span style={{fontSize: Math.max(12, Math.floor(size/3))}}>DP</span>
    </div>
  )
}

"use client"
import React from 'react'

export default function ComplianceScore({percent}:{percent:number}){
  const color = percent<50? 'bg-red-600' : percent<80? 'bg-yellow-500 text-black' : 'bg-green-600'
  const stroke = 36
  const radius = 36
  const circumference = 2*Math.PI*radius
  const offset = circumference - (percent/100)*circumference
  return (
    <div className="flex items-center gap-4">
      <svg width={100} height={100} viewBox="0 0 100 100">
        <g transform="translate(50,50)">
          <circle r={radius} fill="transparent" stroke="#102234" strokeWidth={12} />
          <circle r={radius} fill="transparent" stroke="#17374f" strokeWidth={12} strokeDasharray={`${circumference}`} strokeDashoffset={0} />
          <circle r={radius} fill="transparent" stroke="currentColor" strokeWidth={12} strokeDasharray={`${circumference}`} strokeDashoffset={offset} style={{color: percent<50? '#dc2626': percent<80? '#f59e0b':'#16a34a', transition:'stroke-dashoffset 0.5s'}} transform="rotate(-90)" />
        </g>
      </svg>
      <div>
        <div className="text-sm text-gray-300">Compliance</div>
        <div className="text-2xl font-bold">{percent}%</div>
      </div>
    </div>
  )
}

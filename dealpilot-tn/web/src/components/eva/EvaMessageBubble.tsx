"use client"
import React from 'react'

export default function EvaMessageBubble({role,content,renderPayload}:{role:'user'|'eva',content:string,renderPayload?:any}){
  if(role==='user'){
    return (<div className="self-end text-right"><div className="inline-block px-4 py-2 rounded-2xl rounded-br-md bg-orange-500 text-white max-w-[80%]">{content}</div></div>)
  }
  return (<div className="self-start"><div className="inline-block px-4 py-2 rounded-2xl rounded-bl-md bg-[#0f1c2e] border border-[#1e3a5f] text-gray-200 max-w-[80%]">{content}</div></div>)
}

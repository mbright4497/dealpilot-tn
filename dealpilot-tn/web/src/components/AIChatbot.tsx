'use client'
import React, {useState, useEffect} from 'react'

const QUICK_PROMPTS = [
    'What deadlines are coming up?',
    'Run a compliance check',
    'Help me fill out an RF401',
    'Summarize this deal',
]

export default function AIChatbot({onClose}: any){
    const [messages,setMessages]=useState<any[]>([{role:'system',content:"Hi! I'm your DealPilot TN assistant \u2013 your personal Tennessee Transaction Coordinator. I can help you fill out TREC forms, calculate contract deadlines, track your transactions, and ensure compliance with Tennessee real estate law. What would you like to work on?"}])
    const [input,setInput]=useState('')

    function send(text?: string){
        const msg = text || input
        if(!msg) return
        setMessages(m=>[...m,{role:'user',content:msg}])
        setInput('')
        setTimeout(()=>{
            setMessages(m=>[...m,{role:'assistant',content:'(mock) I can calculate deadlines, fill RF401, or check compliance. What do you need?'}])
        },500)
    }

    function newChat(){
        setMessages([{role:'system',content:"Hi! I'm your DealPilot TN assistant \u2013 your personal Tennessee Transaction Coordinator. I can help you fill out TREC forms, calculate contract deadlines, track your transactions, and ensure compliance with Tennessee real estate law. What would you like to work on?"}])
        setInput('')
    }

    return (
        <div className="fixed bottom-0 right-0 w-full md:w-96 bg-white shadow-lg border-t md:rounded-t-lg text-gray-900">
            <div className="p-2 flex justify-between items-center bg-gray-100">
                <div className="font-bold text-gray-900">DealPilot TN Assistant</div>
                <div className="flex gap-2">
                    <button onClick={newChat} className="text-sm px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">New Chat</button>
                    <button onClick={()=>onClose()} className="text-sm px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600">Close</button>
                </div>
            </div>
            <div className="p-3 h-64 overflow-auto">
                {messages.map((m,i)=>(<div key={i} className={m.role==='assistant' || m.role==='system'? 'text-left mb-2':'text-right mb-2'}><div className={m.role==='assistant' || m.role==='system'? 'inline-block bg-blue-50 text-gray-800 p-2 rounded-lg max-w-xs':'inline-block bg-orange-50 text-gray-800 p-2 rounded-lg max-w-xs'}>{m.content}</div></div>))}
            </div>
            {messages.length <= 1 && (
                <div className="px-3 pb-2 flex flex-wrap gap-1">
                    {QUICK_PROMPTS.map((q,i)=>(
                        <button key={i} onClick={()=>send(q)} className="text-xs px-2 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full hover:bg-orange-100 transition">{q}</button>
                    ))}
                </div>
            )}
            <div className="p-2 flex gap-2">
                <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} className="border border-gray-300 p-2 flex-1 rounded text-gray-900 placeholder-gray-400" placeholder="Type a message..." />
                <button onClick={()=>send()} className="bg-orange-500 text-white p-2 rounded hover:bg-orange-600">Send</button>
            </div>
        </div>
    )
}

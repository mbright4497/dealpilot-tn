"use client"
import React, { createContext, useCallback, useContext, useState } from 'react'

type PageContext = { route: string; dealId?: string }
type Message = { id: string; role: 'user'|'eva'; content: string; payload?: any }

type EvaContext = {
  isOpen: boolean
  conversationId: string | null
  pageContext: PageContext | null
  messages: Message[]
  openEva: (ctx?: PageContext)=>void
  closeEva: ()=>void
  toggleEva: ()=>void
  setPageContext: (ctx: PageContext)=>void
  addMessage: (m: Message)=>void
}

const EvaCtx = createContext<EvaContext | null>(null)

export const useEva = ()=>{
  const ctx = useContext(EvaCtx)
  if(!ctx) throw new Error('useEva must be used within EvaProvider')
  return ctx
}

export const EvaProvider = ({children}:{children:React.ReactNode})=>{
  const [isOpen, setIsOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string|null>(null)
  const [pageContext, setPageContextState] = useState<PageContext|null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  const openEva = useCallback((ctx?:PageContext)=>{ if(ctx) setPageContextState(ctx); setIsOpen(true) },[])
  const closeEva = useCallback(()=>setIsOpen(false),[])
  const toggleEva = useCallback(()=>setIsOpen(v=>!v),[])
  const setPageContext = useCallback((ctx:PageContext)=>setPageContextState(ctx),[])
  const addMessage = useCallback((m:Message)=> setMessages(prev=>[...prev,m]),[])

  // listen for window events to set context (deal page mounts dispatch)
  React.useEffect(()=>{
    const handler = (e: any) => {
      try{
        const detail = e.detail
        if(detail && detail.route){
          setPageContextState(detail)
        }
      }catch(_){ }
    }
    if(typeof window !== 'undefined') window.addEventListener('eva:setContext', handler as EventListener)
    return ()=>{ if(typeof window !== 'undefined') window.removeEventListener('eva:setContext', handler as EventListener) }
  },[])

  return (
    <EvaCtx.Provider value={{isOpen,conversationId,pageContext,messages,openEva,closeEva,toggleEva,setPageContext,addMessage}}>
      {children}
    </EvaCtx.Provider>
  )
}

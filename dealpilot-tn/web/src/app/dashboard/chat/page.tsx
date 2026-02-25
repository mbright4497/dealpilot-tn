'use client'
import AIChatbot from '@/components/AIChatbot'

export default function ChatPage() {
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
        <div>
          <h1 style={{fontSize:'1.5rem',fontWeight:700,color:'var(--foreground)',margin:0}}>AI Contract Assistant</h1>
          <p style={{fontSize:'0.875rem',color:'var(--muted)',marginTop:'0.25rem'}}>Chat with DealPilot AI to fill out TN real estate forms</p>
        </div>
      </div>
      <AIChatbot />
    </div>
  )
}

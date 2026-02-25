'use client'
import AIChatbot from '@/components/AIChatbot'

export default function ChatPage() {
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
        <div>
          <h1 style={{fontSize:'1.5rem',fontWeight:700,color:'var(--foreground)',margin:0}}>Your TC Assistant</h1>
          <p style={{fontSize:'0.875rem',color:'var(--muted)',marginTop:'0.25rem'}}>Personal transaction coordinator for Tennessee real estate \u2014 forms, deadlines, checklists & compliance</p>
        </div>
      </div>
      <AIChatbot />
    </div>
  )
}

"use client"
import React from 'react'
import { FORM_LIST, getSchema } from '@/lib/formSchemas'
import type { FormSchema } from '@/lib/formSchemas'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

export default function AIChatbot() {
  const [messages, setMessages] = React.useState<Message[]>([
    { id: '0', role: 'assistant', content: 'Hey! I\'m DealPilot AI, your Tennessee real estate contract assistant. I can help you fill out RF401, RF403, RF404, RF421, RF651, and RF625 forms. Which form do you need help with, or just describe your deal and I\'ll guide you.' }
  ])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [selectedForm, setSelectedForm] = React.useState<string>('')
  const [filledFields, setFilledFields] = React.useState<Record<string, unknown>>({})
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const schema: FormSchema | undefined = selectedForm ? getSchema(selectedForm) : undefined

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
          formId: selectedForm,
          filledFields,
        })
      })
      const data = await res.json()

      // Handle AI response
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'No response'
      }
      setMessages(prev => [...prev, aiMsg])

      // Auto-detect form from response
      if (data.formSuggestion && !selectedForm) {
        setSelectedForm(data.formSuggestion)
      }

      // Merge extracted fields
      if (data.extractedFields) {
        setFilledFields(prev => ({ ...prev, ...data.extractedFields }))
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'system', content: 'Connection error. Please try again.' }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function selectForm(formId: string) {
    setSelectedForm(formId)
    setFilledFields({})
    const schema = getSchema(formId)
    if (schema) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Great, let\'s work on the **${schema.name}**. ${schema.description}. I\'ll walk you through the required fields. Let\'s start - what are the buyer name(s)?`
      }])
    }
  }

  function clearChat() {
    setMessages([{ id: '0', role: 'assistant', content: 'Chat cleared. Which TN form do you need help with?' }])
    setSelectedForm('')
    setFilledFields({})
  }

  const filledCount = Object.keys(filledFields).length
  const requiredCount = schema?.fields.filter(f => f.required).length || 0
  const filledRequiredCount = schema?.fields.filter(f => f.required && filledFields[f.key]).length || 0

  return (
    <div style={{display:'flex',gap:'1.5rem',height:'calc(100vh - 6rem)'}}>
      {/* Chat Panel */}
      <div style={{flex:2,display:'flex',flexDirection:'column',background:'var(--card)',borderRadius:12,border:'1px solid var(--border)',overflow:'hidden'}}>
        {/* Header */}
        <div style={{padding:'1rem 1.5rem',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
            <span style={{fontSize:'1.5rem'}}>&#x1F916;</span>
            <div>
              <div style={{fontWeight:700,fontSize:'1rem',color:'var(--foreground)'}}>DealPilot AI</div>
              <div style={{fontSize:'0.75rem',color:'var(--muted)'}}>TN Contract Assistant</div>
            </div>
          </div>
          <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
            {selectedForm && <span style={{background:'var(--accent)',color:'#fff',padding:'0.25rem 0.75rem',borderRadius:20,fontSize:'0.75rem',fontWeight:600}}>{selectedForm.toUpperCase()}</span>}
            <button onClick={clearChat} style={{background:'transparent',border:'1px solid var(--border)',borderRadius:8,padding:'0.375rem 0.75rem',fontSize:'0.75rem',color:'var(--muted)',cursor:'pointer'}}>Clear</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:'auto',padding:'1rem 1.5rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
          {messages.map(m => (
            <div key={m.id} style={{display:'flex',justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'}}>
              <div style={{
                maxWidth:'80%',
                padding:'0.75rem 1rem',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: m.role === 'user' ? 'var(--accent)' : m.role === 'system' ? '#4a3520' : 'var(--sidebar-hover)',
                color: m.role === 'user' ? '#fff' : 'var(--foreground)',
                fontSize:'0.875rem',
                lineHeight:1.5,
                whiteSpace:'pre-wrap'
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{display:'flex',justifyContent:'flex-start'}}>
              <div style={{padding:'0.75rem 1rem',borderRadius:'16px 16px 16px 4px',background:'var(--sidebar-hover)',color:'var(--muted)',fontSize:'0.875rem'}}>
                <span className="dp-typing">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Form Selector (when no form selected) */}
        {!selectedForm && (
          <div style={{padding:'0.75rem 1.5rem',borderTop:'1px solid var(--border)',display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
            {FORM_LIST.map(f => (
              <button key={f.id} onClick={() => selectForm(f.id)} style={{
                background:'var(--sidebar-hover)',border:'1px solid var(--border)',borderRadius:8,
                padding:'0.375rem 0.75rem',fontSize:'0.75rem',color:'var(--foreground)',cursor:'pointer',
                transition:'all 0.15s'
              }}>
                {f.id.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{padding:'1rem 1.5rem',borderTop:'1px solid var(--border)',display:'flex',gap:'0.75rem'}}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedForm ? `Fill out ${selectedForm.toUpperCase()} details...` : 'Ask about TN contracts or pick a form above...'}
            style={{
              flex:1,padding:'0.75rem 1rem',borderRadius:12,border:'1px solid var(--border)',
              background:'var(--sidebar-hover)',color:'var(--foreground)',fontSize:'0.875rem',
              outline:'none'
            }}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()} style={{
            padding:'0.75rem 1.5rem',borderRadius:12,border:'none',
            background: loading || !input.trim() ? 'var(--border)' : 'var(--accent)',
            color:'#fff',fontWeight:600,fontSize:'0.875rem',cursor: loading ? 'wait' : 'pointer'
          }}>
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Right Panel - Form Preview */}
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:'1rem'}}>
        {/* Form Progress */}
        <div style={{background:'var(--card)',borderRadius:12,border:'1px solid var(--border)',padding:'1.25rem'}}>
          <div style={{fontWeight:700,fontSize:'0.875rem',marginBottom:'0.75rem',color:'var(--foreground)'}}>
            {schema ? schema.name : 'Select a Form'}
          </div>
          {schema ? (
            <>
              <div style={{fontSize:'0.75rem',color:'var(--muted)',marginBottom:'0.5rem'}}>
                {filledRequiredCount}/{requiredCount} required fields &middot; {filledCount} total filled
              </div>
              <div style={{height:6,background:'var(--border)',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',background:'var(--accent)',borderRadius:3,width:`${requiredCount > 0 ? (filledRequiredCount/requiredCount)*100 : 0}%`,transition:'width 0.3s ease'}} />
              </div>
            </>
          ) : (
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>Choose a form from the chat or the buttons below to get started.</div>
          )}
        </div>

        {/* Filled Fields */}
        <div style={{background:'var(--card)',borderRadius:12,border:'1px solid var(--border)',padding:'1.25rem',flex:1,overflowY:'auto'}}>
          <div style={{fontWeight:700,fontSize:'0.875rem',marginBottom:'0.75rem',color:'var(--foreground)'}}>Extracted Fields</div>
          {filledCount > 0 ? (
            <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
              {Object.entries(filledFields).map(([key, val]) => (
                <div key={key} style={{display:'flex',justifyContent:'space-between',padding:'0.5rem 0',borderBottom:'1px solid var(--border)',fontSize:'0.8rem'}}>
                  <span style={{color:'var(--muted)'}}>{key.replace(/_/g,' ')}</span>
                  <span style={{color:'var(--foreground)',fontWeight:500}}>{String(val)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>No fields extracted yet. Start chatting to fill out your form.</div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{background:'var(--card)',borderRadius:12,border:'1px solid var(--border)',padding:'1rem',display:'flex',flexDirection:'column',gap:'0.5rem'}}>
          <div style={{fontWeight:600,fontSize:'0.8rem',color:'var(--muted)',marginBottom:'0.25rem'}}>Quick Forms</div>
          {FORM_LIST.map(f => (
            <button key={f.id} onClick={() => selectForm(f.id)} style={{
              textAlign:'left',padding:'0.5rem 0.75rem',borderRadius:8,
              border: selectedForm === f.id ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: selectedForm === f.id ? 'var(--sidebar-hover)' : 'transparent',
              color:'var(--foreground)',fontSize:'0.75rem',cursor:'pointer',transition:'all 0.15s'
            }}>
              <strong>{f.id.toUpperCase()}</strong> - {f.name.split(' - ')[1] || f.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

"use client"
import React from 'react'
import { FORM_LIST, getSchema } from '@/lib/formSchemas'
import type { FormSchema } from '@/lib/formSchemas'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

function useVoiceInput() {
  const [isListening, setIsListening] = React.useState(false)
  const [transcript, setTranscript] = React.useState('')
  const recognitionRef = React.useRef<any>(null)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SR) {
        const r = new SR()
        r.continuous = true
        r.interimResults = true
        r.lang = 'en-US'
        r.onresult = (e: any) => {
          let f = ''
          for (let i = 0; i < e.results.length; i++) f += e.results[i][0].transcript
          setTranscript(f)
        }
        r.onend = () => setIsListening(false)
        r.onerror = () => setIsListening(false)
        recognitionRef.current = r
      }
    }
  }, [])
  return {
    isListening, transcript,
    startListening: () => { if (recognitionRef.current) { setTranscript(''); recognitionRef.current.start(); setIsListening(true) } },
    stopListening: () => { if (recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false) } },
    supported: typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  }
}

export default function AIChatbot() {
  const [messages, setMessages] = React.useState<Message[]>([
    { id: '0', role: 'assistant', content: "Hey! I'm your DealPilot TC \u2014 your personal Tennessee transaction coordinator. I know every TREC form, TN deadline, and compliance rule so you don't have to.\n\nI can help you:\n\u2022 Fill out RF401, RF403, RF404, RF421, RF651, RF625\n\u2022 Calculate deal timelines and deadlines\n\u2022 Run through your TC checklist\n\u2022 Answer TN-specific real estate questions\n\nWhat are we working on?" }
  ])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [selectedForm, setSelectedForm] = React.useState<string>('')
  const [filledFields, setFilledFields] = React.useState<Record<string, unknown>>({})
  const [pdfLoading, setPdfLoading] = React.useState(false)
  const [quickActions, setQuickActions] = React.useState<string[]>(['Fill out RF401', 'New construction (RF403)', 'Counter offer (RF651)'])
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const voice = useVoiceInput()
  const schema: FormSchema | undefined = selectedForm ? getSchema(selectedForm) : undefined

  React.useEffect(() => { if (voice.transcript) setInput(voice.transcript) }, [voice.transcript])
  React.useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage(text?: string) {
    const msg = text || input.trim()
    if (!msg || loading) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg }
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
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply || 'No response' }
      setMessages(prev => [...prev, aiMsg])
      if (data.formSuggestion && !selectedForm) setSelectedForm(data.formSuggestion)
      if (data.extractedFields) setFilledFields(prev => ({ ...prev, ...data.extractedFields }))
      if (data.quickActions?.length) setQuickActions(data.quickActions)
    } catch {
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'system', content: 'Connection error. Please try again.' }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function selectForm(formId: string) {
    if (!formId) return
    setSelectedForm(formId)
    setFilledFields({})
    const s = getSchema(formId)
    if (s) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: `Let's knock out the **${s.name}**. ${s.description}\n\nI'll walk you through each section. Let's start with Section 1 \u2014 who are the buyer(s) and seller(s)?`
      }])
      setQuickActions(['Show all sections', 'Skip to financing', 'I have a deal sheet'])
    }
  }

  function clearChat() {
    setMessages([{ id: '0', role: 'assistant', content: 'Fresh start. What form or deal are we tackling?' }])
    setSelectedForm('')
    setFilledFields({})
    setQuickActions(['Fill out RF401', 'New construction (RF403)', 'Counter offer (RF651)'])
  }

  async function downloadPDF() {
    if (!schema || Object.keys(filledFields).length === 0) return
    setPdfLoading(true)
    try {
      const res = await fetch('/api/ai/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: selectedForm, fields: filledFields })
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedForm.toUpperCase()}_DealPilot_${new Date().toISOString().split('T')[0]}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) { console.error('PDF generation failed', err) }
    setPdfLoading(false)
  }

  const filledCount = Object.keys(filledFields).length
  const requiredCount = schema?.fields.filter(f => f.required).length || 0
  const filledRequiredCount = schema?.fields.filter(f => f.required && filledFields[f.key]).length || 0
  const progress = requiredCount > 0 ? Math.round((filledRequiredCount / requiredCount) * 100) : 0
  const sections = schema ? Array.from(new Set(schema.fields.map(f => f.section || 'General'))) : []

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div className="flex items-center gap-3">
          <select value={selectedForm} onChange={e => selectForm(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="">Select TN Form...</option>
            <option value="rf401">RF401 - Purchase & Sale Agreement</option>
            <option value="rf403">RF403 - New Construction</option>
            <option value="rf404">RF404 - Lot/Land Agreement</option>
            <option value="rf421">RF421 - Residential Lease</option>
            <option value="rf651">RF651 - Counter Offer</option>
            <option value="rf625">RF625 - VA/FHA Amendatory</option>
          </select>
          {selectedForm && progress > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all" style={{width: `${progress}%`}} />
              </div>
              <span className="text-xs text-gray-500 font-medium">{progress}%</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedForm && filledCount > 0 && (
            <button onClick={downloadPDF} disabled={pdfLoading} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
              {pdfLoading ? 'Generating...' : '\u2B07 Download PDF'}
            </button>
          )}
          <button onClick={clearChat} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">Clear</button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user' ? 'bg-blue-600 text-white' :
                msg.role === 'system' ? 'bg-red-50 text-red-700 border border-red-200' :
                'bg-gray-50 text-gray-800 border border-gray-100'
              }`}>
                <div style={{whiteSpace: 'pre-wrap'}}>{msg.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-400">
                <span className="inline-flex gap-1"><span className="animate-bounce">\u2022</span><span className="animate-bounce" style={{animationDelay:'0.1s'}}>\u2022</span><span className="animate-bounce" style={{animationDelay:'0.2s'}}>\u2022</span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Sidebar */}
        {selectedForm && schema && filledCount > 0 && (
          <div className="w-72 border-l overflow-y-auto p-3 bg-gray-50 hidden lg:block">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Form Progress</h3>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{filledRequiredCount}/{requiredCount}</span>
            </div>
            {sections.map(section => {
              const sf = schema.fields.filter(f => (f.section || 'General') === section)
              const filled = sf.filter(f => filledFields[f.key])
              if (filled.length === 0) return null
              return (
                <div key={section} className="mb-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{section}</h4>
                  {filled.map(f => (
                    <div key={f.key} className="flex items-start gap-1 text-xs mb-1">
                      <span className="text-green-500 mt-0.5">\u2713</span>
                      <div><span className="text-gray-500">{f.label}:</span> <span className="font-medium">{String(filledFields[f.key])}</span></div>
                    </div>
                  ))}
                </div>
              )
            })}
            {progress === 100 && (
              <div className="mt-3 p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-medium">
                \u2705 All required fields complete! Ready to download.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="px-3 pt-2 flex gap-2 flex-wrap">
          {quickActions.map((action, i) => (
            <button key={i} onClick={() => sendMessage(action)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 border border-blue-200 transition-colors font-medium">
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t p-3 bg-white">
        <div className="flex items-center gap-2">
          {voice.supported && (
            <button onClick={() => voice.isListening ? voice.stopListening() : voice.startListening()}
              className={`p-2 rounded-full transition-colors ${voice.isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              title={voice.isListening ? 'Stop' : 'Voice input'}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={voice.isListening ? 'Listening... speak now' : 'Type your message or use voice...'}
            className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading} />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium">
            Send
          </button>
        </div>
        {voice.isListening && <p className="text-xs text-red-500 mt-1 animate-pulse">\u{1F3A4} Listening...</p>}
      </div>
    </div>
  )
}

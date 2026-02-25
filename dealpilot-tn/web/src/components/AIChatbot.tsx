"use client"
import React from 'react'
import { FORM_LIST, getSchema } from '@/lib/formSchemas'
import type { FormSchema } from '@/lib/formSchemas'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Voice recognition hook using Web Speech API
function useVoiceInput() {
  const [isListening, setIsListening] = React.useState(false)
  const [transcript, setTranscript] = React.useState('')
  const recognitionRef = React.useRef<any>(null)

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        recognition.onresult = (event: any) => {
          let final = ''
          for (let i = 0; i < event.results.length; i++) {
            final += event.results[i][0].transcript
          }
          setTranscript(final)
        }
        recognition.onend = () => setIsListening(false)
        recognition.onerror = () => setIsListening(false)
        recognitionRef.current = recognition
      }
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('')
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  return { isListening, transcript, startListening, stopListening, supported: typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) }
}

export default function AIChatbot() {
  const [messages, setMessages] = React.useState<Message[]>([
    { id: '0', role: 'assistant', content: 'Hey! I\'m DealPilot AI, your Tennessee real estate contract assistant. I can help you fill out RF401, RF403, RF404, RF421, RF651, and RF625 forms. Which form do you need help with, or just describe your deal and I\'ll guide you.' }
  ])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [selectedForm, setSelectedForm] = React.useState<string>('')
  const [filledFields, setFilledFields] = React.useState<Record<string, unknown>>({})
  const [pdfLoading, setPdfLoading] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const voice = useVoiceInput()

  const schema: FormSchema | undefined = selectedForm ? getSchema(selectedForm) : undefined

  // Sync voice transcript to input
  React.useEffect(() => {
    if (voice.transcript) setInput(voice.transcript)
  }, [voice.transcript])

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
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply || 'No response' }
      setMessages(prev => [...prev, aiMsg])
      if (data.formSuggestion && !selectedForm) setSelectedForm(data.formSuggestion)
      if (data.extractedFields) setFilledFields(prev => ({ ...prev, ...data.extractedFields }))
    } catch (err) {
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'system', content: 'Connection error. Please try again.' }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function selectForm(formId: string) {
    setSelectedForm(formId)
    setFilledFields({})
    const s = getSchema(formId)
    if (s) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: `Great, let's work on the **${s.name}**. ${s.description}. I'll walk you through each section. Let's start with Section 1 - who are the buyer(s)?`
      }])
    }
  }

  function clearChat() {
    setMessages([{ id: '0', role: 'assistant', content: 'Chat cleared. Which TN form do you need help with?' }])
    setSelectedForm('')
    setFilledFields({})
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

  function toggleVoice() {
    if (voice.isListening) {
      voice.stopListening()
    } else {
      voice.startListening()
    }
  }

  const filledCount = Object.keys(filledFields).length
  const requiredCount = schema?.fields.filter(f => f.required).length || 0
  const filledRequiredCount = schema?.fields.filter(f => f.required && filledFields[f.key]).length || 0
  const allRequiredFilled = requiredCount > 0 && filledRequiredCount === requiredCount

  // Voice effect: auto-fill input when voice transcript changes
  React.useEffect(() => {
    if (voice.transcript) {
      setInput(voice.transcript)
    }
  }, [voice.transcript])

  // Auto-scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Group fields by section
  const sections = schema ? Array.from(new Set(schema.fields.map(f => f.section || 'General'))) : []

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)]">
      {/* Header with form selector and actions */}
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <select
            value={selectedForm}
            onChange={e => selectForm(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">Select TN Form...</option>
            <option value="rf401">RF401 - Purchase & Sale Agreement</option>
            <option value="rf403">RF403 - Counter Offer</option>
            <option value="rf404">RF404 - Amendment</option>
          </select>
          {selectedForm && (
            <span className="text-xs text-gray-500">
              {filledCount} fields filled | {filledRequiredCount}/{requiredCount} required
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedForm && (
            <button
              onClick={downloadPDF}
              disabled={pdfLoading || filledCount === 0}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfLoading ? 'Generating...' : 'Download PDF'}
            </button>
          )}
          <button onClick={clearChat} className="text-xs text-gray-400 hover:text-red-500">Clear</button>
        </div>
      </div>

      {/* Main content: messages + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : msg.role === 'system'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-500 animate-pulse">
                DealPilot is thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Sidebar: filled fields preview */}
        {selectedForm && schema && filledCount > 0 && (
          <div className="w-72 border-l overflow-y-auto p-3 bg-gray-50 hidden md:block">
            <h3 className="font-semibold text-sm mb-2">Filled Fields</h3>
            {sections.map(section => {
              const sectionFields = schema.fields.filter(f => (f.section || 'General') === section)
              const filledInSection = sectionFields.filter(f => filledFields[f.key])
              if (filledInSection.length === 0) return null
              return (
                <div key={section} className="mb-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">{section}</h4>
                  {filledInSection.map(f => (
                    <div key={f.key} className="text-xs mb-1">
                      <span className="text-gray-500">{f.label}:</span>{' '}
                      <span className="font-medium">{filledFields[f.key]}</span>
                    </div>
                  ))}
                </div>
              )
            })}
            {allRequiredFilled && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                All required fields complete! Ready to download PDF.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area with voice button */}
      <div className="border-t p-3 bg-white">
        <div className="flex items-center gap-2">
          {voice.supported && (
            <button
              onClick={toggleVoice}
              className={`p-2 rounded-full transition-colors ${
                voice.isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title={voice.isListening ? 'Stop listening' : 'Start voice input'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={voice.isListening ? 'Listening... speak now' : 'Type your message or use voice...'}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        {voice.isListening && (
          <p className="text-xs text-red-500 mt-1 animate-pulse">Microphone active - speak to fill form fields</p>
        )}
      </div>
    </div>
  )
}

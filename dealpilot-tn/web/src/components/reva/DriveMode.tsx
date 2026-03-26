'use client'

import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onTransactionCreated?: (transaction: any) => void
}

export default function DriveMode({ open, onClose, onTransactionCreated }: Props) {
  const [threadId, setThreadId] = useState<string | null>(null)
  const [currentPrompt, setCurrentPrompt] = useState('Tell me the property address (street number and name).')
  const [answer, setAnswer] = useState('')
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  async function finishLater() {
    try {
      if (threadId) {
        await fetch('/api/reva/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: "I'll finish later. Please save my progress for this intake.",
            threadId,
            context: 'drive_mode',
          }),
        })
      }
    } finally {
      onClose()
    }
  }

  function startVoiceInput() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return
    const recog = new SpeechRecognition()
    recog.lang = 'en-US'
    recog.interimResults = false
    recog.maxAlternatives = 1
    setListening(true)
    recog.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || ''
      if (transcript) setAnswer((prev) => `${prev} ${transcript}`.trim())
    }
    recog.onend = () => setListening(false)
    recog.onerror = () => setListening(false)
    recog.start()
  }


  if (!open) return null

  async function submitAnswer() {
    if (!answer.trim()) return
    setBusy(true)
    const res = await fetch('/api/reva/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: answer,
        threadId,
        context: 'drive_mode',
      }),
    })
    const json = await res.json()
    if (json.threadId) setThreadId(json.threadId)
    if (json.reply) setCurrentPrompt(json.reply)
    if (json.transaction && onTransactionCreated) onTransactionCreated(json.transaction)
    setAnswer('')
    setStep((prev) => Math.min(6, prev + 1))
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div className="w-full max-w-2xl rounded-2xl bg-gray-950 p-6">
        <div className="mb-4 flex items-center gap-3">
          <img src="/avatar-pilot.png" alt="Reva" className="h-14 w-14 rounded-full" />
          <div>
            <div className="text-lg font-semibold text-white">Reva Drive Mode</div>
            <div className="text-sm text-gray-400">Step {step} of 6</div>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-gray-900 p-4 text-white">{currentPrompt}</div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer..."
          className="h-32 w-full rounded-xl bg-gray-900 p-3 text-white outline-none ring-1 ring-gray-700"
        />
        <div className="mt-3 h-2 rounded-full bg-gray-800">
          <div className="h-2 rounded-full bg-orange-500" style={{ width: `${(step / 6) * 100}%` }} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-white"
            onClick={finishLater}
          >
            I'll finish later
          </button>
          <div className="flex gap-2">
            <button className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-white" title="Voice input" onClick={startVoiceInput}>
              {listening ? 'Listening...' : 'Voice'}
            </button>
            <button
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              onClick={submitAnswer}
              disabled={busy}
            >
              {busy ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

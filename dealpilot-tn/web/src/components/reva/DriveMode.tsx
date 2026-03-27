'use client'

import { useEffect, useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onTransactionCreated?: (transaction: any) => void
}

function parseRelativeDate(input: string): string {
  const today = new Date()
  const lower = input.toLowerCase().trim()

  // "X days from today" or "in X days"
  const daysMatch = lower.match(/(\d+)\s*days?/)
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10)
    const result = new Date(today)
    result.setDate(result.getDate() + days)
    return result.toISOString().split('T')[0]
  }

  // "X weeks from today" or "in X weeks"
  const weeksMatch = lower.match(/(\d+)\s*weeks?/)
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1], 10)
    const result = new Date(today)
    result.setDate(result.getDate() + weeks * 7)
    return result.toISOString().split('T')[0]
  }

  // "next month"
  if (lower.includes('next month')) {
    const result = new Date(today)
    result.setMonth(result.getMonth() + 1)
    return result.toISOString().split('T')[0]
  }

  // "end of month"
  if (lower.includes('end of month')) {
    const result = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return result.toISOString().split('T')[0]
  }

  // "not yet" or "no" or "tbd"
  if (
    lower.includes('not yet') ||
    lower === 'no' ||
    lower === 'tbd' ||
    lower.includes('dont have') ||
    lower.includes("don't have")
  ) {
    return 'null'
  }

  // Already an ISO date or month/day/year format
  return input
}

export default function DriveMode({ open, onClose, onTransactionCreated }: Props) {
  const [threadId, setThreadId] = useState<string | null>(null)
  const [currentPrompt, setCurrentPrompt] = useState('Starting Drive Mode...')
  const [answer, setAnswer] = useState('')
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)

  useEffect(() => {
    if (!open) return

    let isActive = true
    const startFreshIntake = async () => {
      setThreadId(null)
      setStep(0)
      setAnswer('')
      setCurrentPrompt('Starting Drive Mode...')
      setBusy(true)
      try {
        const res = await fetch('/api/reva/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message:
              "You are now in Drive Mode. Start a new transaction intake. Ask ONLY this first question and nothing else:\n'What is the property street address?'",
            threadId: null,
          }),
        })
        const json = await res.json()
        if (!isActive) return
        if (json.threadId) setThreadId(json.threadId)
        if (json.reply) setCurrentPrompt(json.reply)
      } finally {
        if (isActive) setBusy(false)
      }
    }

    void startFreshIntake()
    return () => {
      isActive = false
    }
  }, [open])
  async function finishLater() {
    try {
      if (threadId) {
        await fetch('/api/reva/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: "I'll finish later. Please save my progress for this intake.",
            threadId,
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

  const nextTriggerByStep: Record<number, string> = {
    0: "Got it. Now ask ONLY:\n'What city is the property in?'",
    1: "Got it. Now ask ONLY:\n'What is the zip code?'",
    2: "Got it. Now ask ONLY:\n'Is this a buyer or seller transaction?'",
    3: "Got it. Now ask ONLY:\n'What is the client name or names?'",
    4:
      "Got it. Now ask ONLY:\n'Do you have a closing date? If yes what is it? If no just say not yet.'",
    5:
      'Got it. Now create the transaction and output ONLY the REVA_ACTION block for create_transaction with the collected intake data.',
  }

  async function submitAnswer() {
    if (!answer.trim()) return
    setBusy(true)
    const answerText = answer.trim()
    let message = answerText
    if (step === 5) {
      const processedAnswer = parseRelativeDate(answerText)
      message = `The closing date is: ${processedAnswer}. Now create the transaction.`
    } else {
      const nextTrigger = nextTriggerByStep[step] || ''
      message = nextTrigger ? `${answerText}\n\n${nextTrigger}` : answerText
    }
    const res = await fetch('/api/reva/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        threadId,
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
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/avatar-pilot.png" alt="Reva" className="h-14 w-14 rounded-full" />
            <div>
              <div className="text-lg font-semibold text-white">Reva Drive Mode</div>
              <div className="text-sm text-gray-400">Step {Math.min(6, step + 1)} of 6</div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Drive Mode"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-400 transition hover:bg-gray-900 hover:text-gray-200"
          >
            X
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-gray-900 p-4 text-white">{currentPrompt}</div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer..."
          className="h-32 w-full rounded-xl bg-gray-900 p-3 text-white outline-none ring-1 ring-gray-700"
        />
        <div className="mt-3 h-2 rounded-full bg-gray-800">
          <div
            className="h-2 rounded-full bg-orange-500"
            style={{ width: `${(Math.min(6, step + 1) / 6) * 100}%` }}
          />
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

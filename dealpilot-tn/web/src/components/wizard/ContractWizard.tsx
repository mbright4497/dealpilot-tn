'use client'

import { useState, useRef, useEffect } from 'react'
import { speak, stopSpeaking } from '@/lib/voice-engine'

// ─── Question definitions ───────────────────────────────────────────────────

type FieldType = 'text' | 'number' | 'select' | 'yesno' | 'currency' | 'date'

interface WizardQuestion {
  id: string
  section: string
  label: string
  veraExplains: string
  type: FieldType
  options?: string[]
  defaultValue?: string
  prefillKey?: string
  required?: boolean
  skipIf?: (answers: Record<string, string>) => boolean
}

const QUESTIONS: WizardQuestion[] = [
  // ─── Section 1: Property ───
  {
    id: 'property_address',
    section: 'Section 1 — Property',
    label: 'What is the full property address?',
    veraExplains: 'This must match the legal description exactly. Use the address as it appears on county records.',
    type: 'text',
    prefillKey: 'address',
    required: true,
  },
  {
    id: 'property_city',
    section: 'Section 1 — Property',
    label: 'What city is the property in?',
    veraExplains: 'Johnson City, Kingsport, and Bristol are the three main Tri-Cities areas. Make sure this matches the legal address.',
    type: 'text',
    prefillKey: 'property_city',
    required: true,
  },
  {
    id: 'property_zip',
    section: 'Section 1 — Property',
    label: 'What is the zip code?',
    veraExplains: 'The zip code must match the property location exactly.',
    type: 'text',
    prefillKey: 'property_zip',
    required: true,
  },
  {
    id: 'property_county',
    section: 'Section 1 — Property',
    label: 'What county is the property in?',
    veraExplains: 'In the Tri-Cities area this is typically Washington, Sullivan, or Carter County. This determines which Register of Deeds office handles the deed.',
    type: 'select',
    options: ['Washington', 'Sullivan', 'Carter', 'Unicoi', 'Johnson', 'Hawkins', 'Other'],
    prefillKey: 'county',
    required: true,
  },
  {
    id: 'buyer_1_name',
    section: 'Section 1 — Parties',
    label: 'What is the buyer\'s full legal name?',
    veraExplains: 'This MUST be the buyer\'s full legal name exactly as it will appear on the deed. No nicknames — check their ID.',
    type: 'text',
    prefillKey: 'client',
    required: true,
  },
  {
    id: 'seller_1_name',
    section: 'Section 1 — Parties',
    label: 'What is the seller\'s full legal name?',
    veraExplains: 'This must match the name on the current deed exactly. Your title company can verify this. If it doesn\'t match, the title company will flag it.',
    type: 'text',
    prefillKey: 'seller_name',
    required: true,
  },
  {
    id: 'items_remaining',
    section: 'Section 1 — Personal Property',
    label: 'What items STAY with the property at no cost to buyer? (Section B)',
    veraExplains: 'Section A items like built-in appliances already convey automatically — don\'t re-list those. Section B is for extras like a freestanding fridge, non-built-in appliances, or a riding mower. Leave blank if nothing extra stays.',
    type: 'text',
  },
  {
    id: 'items_not_remaining',
    section: 'Section 1 — Personal Property',
    label: 'What items do NOT stay with the property? (Section C)',
    veraExplains: 'List anything the seller is taking that a buyer might assume stays — like a mounted TV, a specific light fixture, or a garage shelving unit. Cross-check with the seller\'s disclosure (RF201).',
    type: 'text',
  },

  // ─── Section 2: Financing ───
  {
    id: 'purchase_price',
    section: 'Section 2 — Purchase Price',
    label: 'What is the purchase price?',
    veraExplains: 'Enter the full agreed purchase price. This number drives everything — LTV calculation, earnest money percentage, seller concession limits.',
    type: 'currency',
    prefillKey: 'purchase_price',
    required: true,
  },
  {
    id: 'loan_type',
    section: 'Section 2 — Financing',
    label: 'What type of loan is the buyer using?',
    veraExplains: 'This determines which addenda are required. FHA requires the FHA Addendum. VA requires the VA Addendum. Both MUST be listed in Section 20. Cash means financing contingency is waived.',
    type: 'select',
    options: ['Conventional', 'FHA', 'VA', 'USDA', 'Cash', 'Other'],
    prefillKey: 'loan_type',
    required: true,
  },
  {
    id: 'loan_percentage',
    section: 'Section 2 — Financing',
    label: 'What is the LTV percentage? (% of purchase price being financed)',
    veraExplains: 'LTV is the percentage of the purchase price being FINANCED — not the down payment. FHA at 3.5% down = 96.5% LTV. VA zero down = 100% LTV. Conventional varies. Ask your lender if unsure.',
    type: 'number',
    prefillKey: 'loan_percentage',
    skipIf: (a) => a.loan_type === 'Cash',
    required: true,
  },
  {
    id: 'appraisal_contingent',
    section: 'Section 2C — Appraisal',
    label: 'Is this contract contingent on appraisal?',
    veraExplains: 'You MUST select one option — leaving both unchecked means the appraisal section is not part of the agreement. Contingent means the buyer can terminate if appraisal comes in low. Not contingent means the buyer proceeds regardless.',
    type: 'yesno',
    prefillKey: 'appraisal_contingent',
    required: true,
    skipIf: (a) => a.loan_type === 'Cash',
  },

  // ─── Section 3: Earnest Money ───
  {
    id: 'earnest_money',
    section: 'Section 3 — Earnest Money',
    label: 'How much earnest money will the buyer deposit?',
    veraExplains: 'Tri-Cities standard is typically 1% of purchase price, but it\'s negotiable. First-time buyers sometimes deposit as little as $500. The higher the earnest money, the stronger the offer looks to the seller.',
    type: 'currency',
    prefillKey: 'earnest_money',
    required: true,
  },
  {
    id: 'earnest_money_days',
    section: 'Section 3 — Earnest Money',
    label: 'How many days after BAD is earnest money due?',
    veraExplains: 'Tennessee standard is 3 days after the Binding Agreement Date. If the buyer misses this deadline and the check bounces, they have only 1 day to cure with immediately available funds before being in default.',
    type: 'number',
    defaultValue: '3',
    prefillKey: 'earnest_money_days',
    required: true,
  },
  {
    id: 'earnest_money_holder',
    section: 'Section 3 — Earnest Money',
    label: 'Who holds the earnest money? (Holder name)',
    veraExplains: 'Typically the title company or closing attorney. In the Tri-Cities area this is often Reliable Title, Security Title, or similar. The Holder cannot disburse funds without all parties agreeing, a court order, or proper interpretation of the contract.',
    type: 'text',
    prefillKey: 'earnest_money_holder',
    required: true,
  },

  // ─── Section 4: Closing ───
  {
    id: 'closing_date',
    section: 'Section 4 — Closing',
    label: 'What is the closing date?',
    veraExplains: 'The closing date expires at 11:59 PM local time on this date. This is one of the four FIRM deadlines that does NOT roll to the next business day if it falls on a weekend or holiday. Any extension must be in writing.',
    type: 'date',
    prefillKey: 'closing_date',
    required: true,
  },
  {
    id: 'closing_agency_buyer',
    section: 'Section 4 — Closing',
    label: 'What is the buyer\'s closing agency?',
    veraExplains: 'This is the title company or attorney handling closing for the buyer. Include the name and address. In Johnson City, Reliable Title at 508 Princeton Road is commonly used.',
    type: 'text',
    prefillKey: 'closing_agency_buyer',
    required: true,
  },
  {
    id: 'closing_agency_seller',
    section: 'Section 4 — Closing',
    label: 'What is the seller\'s closing agency?',
    veraExplains: 'Often the same as the buyer\'s closing agency in a typical transaction. If different, both must be listed.',
    type: 'text',
    prefillKey: 'closing_agency_seller',
  },

  // ─── Section 7: Lead Paint ───
  {
    id: 'lead_based_paint',
    section: 'Section 7 — Lead-Based Paint',
    label: 'Was the home built before 1978?',
    veraExplains: 'If yes, the Lead-Based Paint Disclosure (RF209) is REQUIRED by federal law. It must be attached and listed in Section 20. This is not optional — failure to attach it on a pre-1978 property is a compliance violation.',
    type: 'yesno',
    prefillKey: 'lead_based_paint',
    required: true,
  },

  // ─── Section 8: Inspections ───
  {
    id: 'inspection_period_days',
    section: 'Section 8 — Inspections',
    label: 'How many days for the inspection period?',
    veraExplains: 'Tri-Cities standard is 15 days. A blank inspection period = zero days = the buyer has NO inspection rights. Never leave this blank. The inspection period starts the day after BAD and the buyer must submit their repair request before it expires.',
    type: 'number',
    defaultValue: '15',
    prefillKey: 'inspection_period_days',
    required: true,
  },
  {
    id: 'resolution_period_days',
    section: 'Section 8 — Inspections',
    label: 'How many days for the resolution period?',
    veraExplains: 'The resolution period starts when the SELLER receives the buyer\'s repair request list. Standard is 3 days. This is when both parties negotiate repairs. If no agreement is reached by the end of the resolution period, the contract terminates automatically and earnest money is returned.',
    type: 'number',
    defaultValue: '3',
    prefillKey: 'resolution_period_days',
    required: true,
  },

  // ─── Section 5: Deed ───
  {
    id: 'deed_names',
    section: 'Section 5 — Title',
    label: 'Whose name(s) go on the deed?',
    veraExplains: 'This is how the buyer will hold title. It\'s the buyer\'s responsibility to consult the closing agency or attorney before closing on how they want to hold title. Common options: sole ownership, joint tenancy with right of survivorship, tenants in common. Ask your closing attorney.',
    type: 'text',
    prefillKey: 'deed_names',
    required: true,
  },

  // ─── Section 20: Exhibits ───
  {
    id: 'exhibits_addenda',
    section: 'Section 20 — Exhibits & Addenda',
    label: 'What addenda are attached to this contract?',
    veraExplains: 'Everything attached MUST be listed here or it is not part of the agreement. FHA loan = FHA Addendum required. VA loan = VA Addendum required. Pre-1978 home = RF209. Temporary occupancy = RF635. Mediation = RF629. Additional contract language = RF707.',
    type: 'text',
    required: true,
  },

  // ─── Section 21: Stipulations ───
  {
    id: 'special_stipulations',
    section: 'Section 21 — Special Stipulations',
    label: 'Are there any special stipulations?',
    veraExplains: 'Special stipulations override ALL preceding sections if there\'s a conflict — they are the most powerful part of the contract. NEVER use TBD, N/A, "actual cost", "negotiable" or "etc." — these are unenforceable. Use RF707 for pre-approved clause language. Always be specific and measurable.',
    type: 'text',
    prefillKey: 'special_stipulations',
  },

  // ─── Section 22: Offer Expiration ───
  {
    id: 'offer_exp_time',
    section: 'Section 22 — Time Limit of Offer',
    label: 'What time does this offer expire? (e.g. 5:00 PM)',
    veraExplains: 'The offer expiration time CANNOT be blank — a blank means no deadline which removes all urgency. The offer can be withdrawn any time before acceptance with Notice. Seller can accept, counter, or reject.',
    type: 'text',
    required: true,
  },
  {
    id: 'offer_exp_date',
    section: 'Section 22 — Time Limit of Offer',
    label: 'What date does this offer expire?',
    veraExplains: 'This is one of the four FIRM deadlines — it does not roll to the next business day. Make sure the seller has enough time to respond but not so much that urgency is lost.',
    type: 'date',
    required: true,
  },
]

// ─── Section list for progress nav ──────────────────────────────────────────

const SECTIONS = [
  'Section 1 — Property',
  'Section 1 — Parties',
  'Section 1 — Personal Property',
  'Section 2 — Purchase Price',
  'Section 2 — Financing',
  'Section 2C — Appraisal',
  'Section 3 — Earnest Money',
  'Section 4 — Closing',
  'Section 7 — Lead-Based Paint',
  'Section 8 — Inspections',
  'Section 5 — Title',
  'Section 20 — Exhibits & Addenda',
  'Section 21 — Special Stipulations',
  'Section 22 — Time Limit of Offer',
]

// ─── Chat message type ───────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  transactionId: number
  transaction: Record<string, any>
  onClose?: () => void
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ContractWizard({ transactionId, transaction, onClose }: Props) {
  // Pre-fill answers from transaction
  const buildPrefilled = () => {
    const prefilled: Record<string, string> = {}
    for (const q of QUESTIONS) {
      if (q.prefillKey && transaction[q.prefillKey] != null) {
        prefilled[q.id] = String(transaction[q.prefillKey])
      }
      if (q.defaultValue && !prefilled[q.id]) {
        prefilled[q.id] = q.defaultValue
      }
    }
    return prefilled
  }

  const [answers, setAnswers] = useState<Record<string, string>>(buildPrefilled)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `I'm Vera. I'll guide you through writing the RF401 contract for ${transaction.address || 'this property'} — one question at a time, in plain English. I'll explain what each section means, why it matters, and flag anything that needs your attention. Ask me anything along the way.`,
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Filter questions based on skip logic
  const activeQuestions = QUESTIONS.filter(q => !q.skipIf || !q.skipIf(answers))
  const currentQ = activeQuestions[currentIdx]
  const currentAnswer = currentQ ? (answers[currentQ.id] ?? '') : ''
  const progress = activeQuestions.length > 0 ? ((currentIdx) / activeQuestions.length) * 100 : 0

  // Unique sections for progress nav
  const completedSections = new Set(
    activeQuestions.slice(0, currentIdx).map(q => q.section)
  )

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Auto-speak Vera's explanation when question changes
  useEffect(() => {
    if (!currentQ) return
    // Don't auto-speak — let user click speaker button
  }, [currentIdx])

  function handleAnswer(val: string) {
    if (!currentQ) return
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }))
  }

  function handleNext() {
    if (!currentQ) return
    if (currentQ.required && !currentAnswer.trim()) {
      setError(`${currentQ.label} is required.`)
      return
    }
    setError(null)
    if (currentIdx < activeQuestions.length - 1) {
      setCurrentIdx(i => i + 1)
    }
  }

  function handleBack() {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1)
      setError(null)
    }
  }

  function handleSkip() {
    setError(null)
    if (currentIdx < activeQuestions.length - 1) {
      setCurrentIdx(i => i + 1)
    }
  }

  async function handleSaveAndGenerate() {
    setGenerating(true)
    setError(null)
    try {
      // Save all answers to transaction
      const saveRes = await fetch(`/api/wizard/${transactionId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to save answers')
      }

      // Generate PDF
      const pdfRes = await fetch(`/api/rf401/${transactionId}/generate`)
      if (!pdfRes.ok) throw new Error('Failed to generate PDF')

      const pdfBlob = await pdfRes.blob()
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `RF401-${transaction.address || transactionId}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      setDone(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  async function sendChat(text: string) {
    if (!text.trim() || chatLoading) return
    setChatMessages(prev => [...prev, { role: 'user', content: text }])
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/reva/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[CONTRACT WIZARD — ${currentQ?.section || 'Review'}] Agent is on question: "${currentQ?.label || 'Review'}". Agent asks: ${text}`,
          dealId: transactionId,
          threadId,
          context: 'contract_wizard',
        }),
      })
      const data = await res.json()
      if (data.threadId) setThreadId(data.threadId)
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  function speakExplanation() {
    if (!currentQ) return
    if (speaking) { stopSpeaking(); setSpeaking(false); return }
    speak(currentQ.veraExplains, 'friendly_tn', () => setSpeaking(true), () => setSpeaking(false))
  }

  // ─── Done screen ───────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-semibold text-white">Contract Complete!</h2>
        <p className="text-gray-400 text-sm max-w-sm">Your RF401 has been generated and downloaded. It will also appear in the Documents tab for broker review.</p>
        <button
          onClick={() => { setDone(false); setCurrentIdx(0) }}
          className="px-4 py-2 bg-orange-500 text-black rounded-lg text-sm font-semibold"
        >
          Start Over
        </button>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex fixed inset-0 overflow-hidden rounded-xl border border-gray-800">
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-gray-400 text-lg leading-none hover:border-gray-600 hover:text-white"
          aria-label="Close"
        >
          ×
        </button>
      ) : null}

      {/* LEFT — Section progress nav */}
      <div className="w-48 flex-shrink-0 border-r border-gray-800 overflow-y-auto bg-gray-950">
        <div className="p-3">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3">Progress</p>
          <div className="space-y-1">
            {SECTIONS.map(section => {
              const isCompleted = completedSections.has(section)
              const isCurrent = currentQ?.section === section
              return (
                <div
                  key={section}
                  className={`px-2 py-1.5 rounded text-xs font-medium flex items-center gap-2 ${
                    isCurrent ? 'bg-orange-500/20 text-orange-300' :
                    isCompleted ? 'text-green-400' : 'text-gray-600'
                  }`}
                >
                  <span className="flex-shrink-0">
                    {isCompleted ? '✓' : isCurrent ? '→' : '○'}
                  </span>
                  <span className="leading-tight">{section.replace('Section ', '§')}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* CENTER — Question card */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Progress bar */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              Question {currentIdx + 1} of {activeQuestions.length}
            </span>
            <span className="text-xs text-orange-400 font-medium">
              {currentQ?.section}
            </span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full">
            <div
              className="h-full bg-orange-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {currentQ ? (
            <div className="max-w-lg">
              <div className="flex items-start gap-2 mb-2">
                <h2 className="text-white text-lg font-semibold leading-snug">
                  {currentQ.label}
                </h2>
                {currentQ.required && (
                  <span className="text-orange-400 text-sm mt-1 flex-shrink-0">*</span>
                )}
              </div>

              {/* Vera's explanation */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-5 flex items-start gap-2">
                <img src="/avatar-pilot.png" alt="Vera" className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
                <p className="text-gray-300 text-sm leading-relaxed">{currentQ.veraExplains}</p>
                <button
                  onClick={speakExplanation}
                  className="flex-shrink-0 text-gray-500 hover:text-orange-400 transition-colors"
                  title="Hear Vera explain this"
                >
                  {speaking ? '🔇' : '🔊'}
                </button>
              </div>

              {/* Input */}
              {currentQ.type === 'yesno' && (
                <div className="flex gap-3">
                  {['Yes', 'No'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt === 'Yes' ? 'true' : 'false')}
                      className={`px-6 py-3 rounded-xl text-sm font-semibold border transition-all ${
                        currentAnswer === (opt === 'Yes' ? 'true' : 'false')
                          ? 'bg-orange-500 border-orange-500 text-black'
                          : 'border-gray-700 text-gray-300 hover:border-orange-500/50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {currentQ.type === 'select' && currentQ.options && (
                <div className="flex flex-wrap gap-2">
                  {currentQ.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        currentAnswer === opt
                          ? 'bg-orange-500 border-orange-500 text-black'
                          : 'border-gray-700 text-gray-300 hover:border-orange-500/50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {(currentQ.type === 'text' || currentQ.type === 'number' || currentQ.type === 'currency') && (
                <input
                  type={currentQ.type === 'number' || currentQ.type === 'currency' ? 'text' : 'text'}
                  value={currentAnswer}
                  onChange={e => handleAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNext()}
                  placeholder={
                    currentQ.type === 'currency' ? '$0.00' :
                    currentQ.type === 'number' ? '0' : ''
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-orange-500/50 placeholder-gray-600"
                />
              )}

              {currentQ.type === 'date' && (
                <input
                  type="date"
                  value={currentAnswer}
                  onChange={e => handleAnswer(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                />
              )}

              {error && (
                <p className="mt-3 text-red-400 text-sm">{error}</p>
              )}

              {/* Navigation */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleBack}
                  disabled={currentIdx === 0}
                  className="px-4 py-2 border border-gray-700 text-gray-400 rounded-xl text-sm disabled:opacity-30 hover:border-gray-500 transition-colors"
                >
                  ← Back
                </button>
                {!currentQ.required && (
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-gray-500 text-sm hover:text-gray-300 transition-colors"
                  >
                    Skip
                  </button>
                )}
                {currentIdx < activeQuestions.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-black rounded-xl text-sm font-semibold transition-colors"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handleSaveAndGenerate}
                    disabled={generating}
                    className="px-6 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black rounded-xl text-sm font-semibold transition-colors"
                  >
                    {generating ? 'Generating...' : '✓ Generate RF401'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-gray-400">All questions answered.</p>
              <button
                onClick={handleSaveAndGenerate}
                disabled={generating}
                className="px-8 py-3 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black rounded-xl text-base font-semibold transition-colors"
              >
                {generating ? 'Generating RF401...' : '✓ Generate RF401'}
              </button>
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Vera chat */}
      <div className="w-72 flex-shrink-0 border-l border-gray-800 flex flex-col bg-gray-950">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2 flex-shrink-0">
          <img src="/avatar-pilot.png" alt="Vera" className="w-6 h-6 rounded-full" />
          <span className="text-sm font-semibold text-white">Ask Vera</span>
          <div className="w-2 h-2 rounded-full bg-green-400 ml-auto" />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-orange-500/20 text-orange-100 border border-orange-500/20'
                  : 'bg-gray-800 text-gray-100'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-xl px-3 py-2 flex gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        <div className="px-3 py-3 border-t border-gray-800 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendChat(chatInput)}
            placeholder="Ask about this section..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
          />
          <button
            onClick={() => sendChat(chatInput)}
            disabled={chatLoading || !chatInput.trim()}
            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-black px-3 py-2 rounded-lg text-xs font-semibold"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  )
}

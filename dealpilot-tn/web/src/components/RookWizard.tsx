'use client'
import React, { useEffect, useMemo, useState } from 'react'
import {
  buildDefaultWizardData,
  getSectionDefinitions,
  markSectionUnknown,
  sectionOrder,
  sectionPaths,
  sectionProgress,
  SectionName,
  UNKNOWN_MARKER,
} from '@/lib/rookwizard'

const SECTION_LABELS: Record<SectionName, string> = {
  section_1: 'Purchase & Sale Details',
  section_2: 'Purchase Price & Payment',
  section_2d: 'Closing Expenses & Title',
  section_3_6: 'Timing, Possession & Conditions',
}

type SectionValues = Record<SectionName, Record<string, any>>

type Props = {
  transactionId: string
  onClose: () => void
}

export default function RookWizard({ transactionId, onClose }: Props) {
  const [sectionValues, setSectionValues] = useState<SectionValues>({
    section_1: {},
    section_2: {},
    section_2d: {},
    section_3_6: {},
  })
  const [currentSection, setCurrentSection] = useState<SectionName>('section_1')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(1)
  const [status, setStatus] = useState('initialized')
  const [error, setError] = useState<string | null>(null)
  const [completeSummary, setCompleteSummary] = useState<{ missing_fields: string[]; next_actions: string } | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  // Deal selector states
  const [showDealSelector, setShowDealSelector] = useState(false)
  const [availableDeals, setAvailableDeals] = useState<any[]>([])
  const [selectedDeal, setSelectedDeal] = useState<any|null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/rookwizard/${transactionId}/start`, { method: 'POST' })
        const payload = await res.json()
        if (!res.ok) {
          throw new Error(payload?.error || 'Failed to load wizard')
        }
        if (cancelled) return
        setStep(payload.step)
        setStatus(payload.status)
        setSectionValues({
          section_1: payload.wizard_data.section_1 || buildDefaultWizardData().section_1,
          section_2: payload.wizard_data.section_2 || buildDefaultWizardData().section_2,
          section_2d: payload.wizard_data.section_2d || buildDefaultWizardData().section_2d,
          section_3_6: payload.wizard_data.section_3_6 || buildDefaultWizardData().section_3_6,
        })
      } catch (err: any) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [transactionId])

  const definitions = getSectionDefinitions(currentSection)

  const displayValue = (key: string, type: string) => {
    const section = sectionValues[currentSection] || {}
    const value = section[key]
    if (type === 'array') {
      if (Array.isArray(value)) {
        if (value.length === 0) return ''
        if (value.every((item) => item === UNKNOWN_MARKER)) return ''
        return value.filter((item) => item !== UNKNOWN_MARKER).join(', ')
      }
      return typeof value === 'string' ? value : ''
    }
    if (type === 'number') {
      if (value === null || value === undefined) return ''
      if (typeof value === 'string' && value.trim() === UNKNOWN_MARKER) return ''
      return String(value)
    }
    if (type === 'date') {
      if (!value || value === UNKNOWN_MARKER) return ''
      return String(value)
    }
    if (typeof value === 'string' && value === UNKNOWN_MARKER) return ''
    return value ?? ''
  }

  const handleInput = (key: string, val: string, type: string) => {
    setSectionValues((prev) => ({
      ...prev,
      [currentSection]: {
        ...prev[currentSection],
        [key]: val,
      },
    }))
  }

  const nextSection = useMemo(() => {
    const idx = sectionOrder.indexOf(currentSection)
    return sectionOrder[idx + 1] ?? null
  }, [currentSection])

  const handleSaveSection = async (sectionKey: SectionName, override?: Record<string, any>) => {
    setSaving(true)
    setError(null)
    try {
      const payload = override ?? sectionValues[sectionKey] ?? {}
      const res = await fetch(`/api/rookwizard/${transactionId}/${sectionPaths[sectionKey]}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body?.error || 'Save failed')
      }
      setStep(body.step)
      setStatus(body.status)
      if (body.wizard_data) {
        setSectionValues({
          section_1: body.wizard_data.section_1,
          section_2: body.wizard_data.section_2,
          section_2d: body.wizard_data.section_2d,
          section_3_6: body.wizard_data.section_3_6,
        })
      }
      if (sectionKey === currentSection && nextSection) {
        setCurrentSection(nextSection)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleMarkUnknown = async () => {
    const unknownPayload = markSectionUnknown(currentSection)
    setSectionValues((prev) => ({ ...prev, [currentSection]: unknownPayload }))
    await handleSaveSection(currentSection, unknownPayload)
  }

  const handleComplete = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/rookwizard/${transactionId}/complete`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body?.error || 'Completion failed')
      }
      setCompleteSummary(body.summary)
      setIsComplete(body.status === 'complete')
      setStatus(body.status)
      setStep(5)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const allowComplete = status === sectionProgress.section_3_6.status

  // Deal selector handlers
  async function openDealSelector(){
    setShowDealSelector(true)
    try{
      const r = await fetch('/api/transactions')
      if(!r.ok) return
      const j = await r.json()
      setAvailableDeals(Array.isArray(j) ? j : (j.result || []))
    }catch(e){ console.error('failed to load deals', e) }
  }

  function connectDealAndPopulate(deal:any){
    // store selection for this wizard
    try{ localStorage.setItem('rookwizard_selected_deal', JSON.stringify(deal)) }catch(e){}
    setSelectedDeal(deal)
    // prefill section_1 fields (property address, buyer names)
    const override:any = {}
    if(deal.address) override.property_address = deal.address
    if(deal.buyer_names) override.buyer_names = Array.isArray(deal.buyer_names) ? deal.buyer_names : String(deal.buyer_names).split(',').map((s:string)=>s.trim())
    setSectionValues(prev => ({ ...prev, section_1: { ...(prev.section_1 || {}), ...override } }))
    // save this section immediately
    handleSaveSection('section_1', { ...(sectionValues.section_1 || {}), ...override })
    setShowDealSelector(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#030712] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">RookWizard ({transactionId})</h2>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Step {step} · {status}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={openDealSelector} className="text-sm px-3 py-1 bg-gray-800 text-gray-200 rounded hover:bg-gray-700">Select a Deal</button>
            <button onClick={onClose} className="text-sm font-medium text-gray-300 hover:text-white">Close</button>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {sectionOrder.map((section) => (
              <button
                key={section}
                onClick={() => setCurrentSection(section)}
                className={`rounded-2xl border px-3 py-2 text-left text-xs uppercase tracking-wide transition ${
                  section === currentSection ? 'border-orange-400 bg-orange-500/10 text-white' : 'border-white/10 text-gray-400 hover:border-white/30'
                }`}
              >
                <div className="text-[0.65rem] text-gray-300">Step {sectionOrder.indexOf(section) + 1}</div>
                <div className="text-[0.75rem] text-white">{SECTION_LABELS[section]}</div>
              </button>
            ))}
          </div>

          {showDealSelector && (
            <div className="mb-4 p-4 rounded bg-[#07101a] border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-300">Select a deal to connect to RookWizard</div>
                <button onClick={()=>setShowDealSelector(false)} className="text-xs text-gray-400">Close</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-auto">
                {availableDeals.length===0 && <div className="text-sm text-gray-500">No active deals found</div>}
                {availableDeals.map((d:any)=> (
                  <div key={d.id} className="p-2 rounded hover:bg-gray-800 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{d.address}</div>
                      <div className="text-xs text-gray-400">{d.client} • {d.status}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>connectDealAndPopulate(d)} className="px-3 py-1 bg-emerald-500 text-black rounded">Select</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-[#0c1726] p-6 text-sm text-gray-300">Loading wizard data...</div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#0c1726] p-6 shadow-inner">
              {error && <div className="mb-3 rounded border border-red-600/50 bg-red-900/40 p-3 text-sm text-red-200">{error}</div>}
              <div className="space-y-4">
                {definitions.map((field) => (
                  <div key={field.key} className="grid w-full gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">{field.label}</label>
                    {field.type === 'enum' ? (
                      <select
                        className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-white focus:border-orange-400"
                        value={displayValue(field.key, field.type)}
                        onChange={(event) => handleInput(field.key, event.target.value, field.type)}
                      >
                        <option value="">Select an option</option>
                        {field.enumOptions?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-white focus:border-orange-400"
                        placeholder={field.type === 'array' ? 'Comma-separated values' : ''}
                        value={displayValue(field.key, field.type)}
                        onChange={(event) => handleInput(field.key, event.target.value, field.type)}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleSaveSection(currentSection)}
                  disabled={saving}
                  className="rounded-full border border-orange-400 bg-orange-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save & Continue'}
                </button>
                <button onClick={handleMarkUnknown} disabled={saving} className="rounded-full border border-white/20 px-5 py-2 text-sm text-white hover:border-white/50 disabled:opacity-60">Mark as Unknown</button>
                <button onClick={handleComplete} disabled={!allowComplete || saving} className="rounded-full border border-cyan-400 px-5 py-2 text-sm text-cyan-200 hover:border-cyan-200 disabled:opacity-50">{saving && allowComplete ? 'Completing…' : 'Finalize & Export'}</button>
              </div>
              {completeSummary && (
                <div className="mt-6 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-gray-200">
                  <div className="font-semibold text-white">Summary</div>
                  <div className="text-gray-300">{completeSummary.next_actions}</div>
                  {completeSummary.missing_fields.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-orange-200">
                      {completeSummary.missing_fields.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-3 text-xs text-emerald-200">No missing fields. Ready for export.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

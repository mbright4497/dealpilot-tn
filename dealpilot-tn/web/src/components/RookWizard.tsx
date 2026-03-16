import React, { useEffect, useMemo, useState } from 'react'
import ClosingPilotLogo from '@/components/ClosingPilotLogo'
import DealPickerModal, { DealSummary } from '@/components/DealPickerModal'
import {
  buildDefaultWizardData,
  sectionPaths,
  sectionProgress,
  SectionName,
  UNKNOWN_MARKER,
} from '@/lib/rookwizard'

const STEP_CONFIG = [
  { id: 1, title: 'Connect Deal', description: 'Match this RF401 experience with an active transaction.' },
  { id: 2, title: 'Verify Parties', description: 'Confirm the buyer and seller legal names before proceeding.' },
  { id: 3, title: 'Fill RF401', description: 'Enter price, closing schedule, earnest money, and stipulations.' },
  { id: 4, title: 'Review & Generate', description: 'Validate everything and export your compliance document.' },
] as const

type WizardStep = (typeof STEP_CONFIG)[number]['id']
type SummaryPayload = { missing_fields: string[]; next_actions: string }
type Props = { transactionId: string; onClose: () => void }
type SectionValues = Record<SectionName, Record<string, any>>

const DEFAULT_VALUES = buildDefaultWizardData()

export default function RookWizard({ transactionId, onClose }: Props) {
  const [sectionValues, setSectionValues] = useState<SectionValues>(DEFAULT_VALUES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(1)
  const [status, setStatus] = useState('initialized')
  const [error, setError] = useState<string | null>(null)
  const [completeSummary, setCompleteSummary] = useState<SummaryPayload | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<DealSummary | null>(null)
  const [contractPreview, setContractPreview] = useState<any | null>(null)
  const [contractWarnings, setContractWarnings] = useState<string[]>([])
  const [showDealPicker, setShowDealPicker] = useState(false)
  const [activeStep, setActiveStep] = useState<WizardStep>(1)

  const displayFieldValue = (section: SectionName, key: string, type: 'text' | 'number' | 'date') => {
    const sectionData = sectionValues[section] || {}
    const value = sectionData[key]
    if (type === 'number') {
      if (value === null || value === undefined || value === UNKNOWN_MARKER) return ''
      return String(value)
    }
    if (type === 'date') {
      if (!value || value === UNKNOWN_MARKER) return ''
      return String(value)
    }
    if (typeof value === 'string' && value.trim() === UNKNOWN_MARKER) return ''
    return value ?? ''
  }

  const handleFieldChange = (section: SectionName, key: string, value: string) => {
    setSectionValues((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }))
  }

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
      setStep((prev) => body?.step || prev)
      setStatus((prev) => body?.status || prev)
      if (body?.wizard_data) {
        setSectionValues({
          section_1: body.wizard_data.section_1,
          section_2: body.wizard_data.section_2,
          section_2d: body.wizard_data.section_2d,
          section_3_6: body.wizard_data.section_3_6,
        })
      }
      return true
    } catch (err: any) {
      setError(err.message || 'Save failed')
      return false
    } finally {
      setSaving(false)
    }
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
      setStatus(body.status)
      setStep(5)
    } catch (err: any) {
      setError(err.message || 'Completion failed')
    } finally {
      setSaving(false)
    }
  }

  const partyComplete = useMemo(() => {
    const { buyer_name, seller_name } = sectionValues.section_1 || {}
    const clean = (value: any) => typeof value === 'string' && value.trim().length > 0 && value !== UNKNOWN_MARKER
    return Boolean(clean(buyer_name) && clean(seller_name))
  }, [sectionValues.section_1])

  const rf401Ready = useMemo(() => {
    const price = sectionValues.section_2.purchase_price_numeric
    const closingDate = sectionValues.section_3_6.closing_date
    const earnestAmount = sectionValues.section_3_6.earnest_money_amount
    const earnestDue = sectionValues.section_3_6.earnest_money_due_date
    const priceValid = typeof price === 'number' && !Number.isNaN(price) && price > 0
    const earnestValid = typeof earnestAmount === 'number' && !Number.isNaN(earnestAmount) && earnestAmount > 0
    return Boolean(priceValid && closingDate && earnestValid && earnestDue)
  }, [sectionValues.section_2, sectionValues.section_3_6])

  const allowComplete = status === sectionProgress.section_3_6.status
  const progressPercent = useMemo(() => ((activeStep - 1) / (STEP_CONFIG.length - 1)) * 100, [activeStep])

  const connectDealAndPopulate = async (deal: DealSummary) => {
    setSelectedDeal(deal)
    setShowDealPicker(false)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('rookwizard_selected_deal', JSON.stringify(deal))
      }
    } catch (_e) {
      // ignore
    }
    const currentSection = sectionValues.section_1 || {}
    const override: Record<string, any> = {}
    if (deal.address) override.property_address = deal.address
    if (deal.client && !override.buyer_name) override.buyer_name = deal.client
    if (deal.buyer_names) {
      const names = Array.isArray(deal.buyer_names)
        ? deal.buyer_names
        : String(deal.buyer_names).split(',').map((name) => name.trim()).filter(Boolean)
      if (names.length) {
        override.buyer_name = names.join(', ')
      }
    }
    const merged = { ...currentSection, ...override }
    setSectionValues((prev) => ({ ...prev, section_1: merged }))
    const saved = await handleSaveSection('section_1', merged)
    if (saved) {
      setActiveStep(2)
    }
  }

  const handleNextStep = async () => {
    if (activeStep === 1) {
      setActiveStep(2)
      return
    }
    if (activeStep === 2) {
      const saved = await handleSaveSection('section_1')
      if (saved) {
        setActiveStep(3)
      }
      return
    }
    if (activeStep === 3) {
      const priceSaved = await handleSaveSection('section_2')
      if (!priceSaved) return
      const earnestSaved = await handleSaveSection('section_3_6')
      if (earnestSaved) {
        setActiveStep(4)
      }
    }
  }

  const handleBack = () => {
    if (activeStep > 1) {
      setActiveStep((prev) => (prev - 1) as WizardStep)
    }
  }

  useEffect(() => {
    let cancelled = false
    const loadWizard = async () => {
      setLoading(true)
      setError(null)
      setCompleteSummary(null)
      setContractPreview(null)
      setContractWarnings([])
      setSelectedDeal(null)
      setActiveStep(1)
      try {
        const res = await fetch(`/api/rookwizard/${transactionId}/start`, { method: 'POST' })
        const payload = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(payload?.error || 'Failed to load wizard data')
        }
        if (cancelled) return
        setStep(payload?.step || 1)
        setStatus(payload?.status || 'initialized')
        const wizardData = payload?.wizard_data || buildDefaultWizardData()
        setSectionValues({
          section_1: wizardData.section_1 || DEFAULT_VALUES.section_1,
          section_2: wizardData.section_2 || DEFAULT_VALUES.section_2,
          section_2d: wizardData.section_2d || DEFAULT_VALUES.section_2d,
          section_3_6: wizardData.section_3_6 || DEFAULT_VALUES.section_3_6,
        })


        // NOTE: /api/deal-state/* is a lifecycle/state API and does not include address/client.
        // We'll rely on /api/transactions/${transactionId} below to populate selectedDeal.

        try {
          const txRes = await fetch(`/api/transactions/${transactionId}`)
          if (txRes.ok) {
            const tx = await txRes.json()
            if (cancelled) return
            // Build selectedDeal from transaction record (transactions API contains address/client)
            const mapped = {
              id: tx.id ?? Number(transactionId),
              address: tx.address || tx.property_address || tx.propertyAddress || '',
              client: tx.client || tx.client_name || tx.clientName || '',
              status: tx.status || tx.current_state || tx.state_label || '',
              closing_date: tx.closing_date || tx.closing || tx.closingDate || null,
            }
            setSelectedDeal(mapped)

            const overrides: Record<string, any> = {}
            if (tx.property_address) overrides.property_address = tx.property_address
            if (tx.buyer_name || tx.buyer_names) overrides.buyer_name = tx.buyer_name || tx.buyer_names || tx.client
            if (tx.seller_name) overrides.seller_name = tx.seller_name
            if (tx.client && !overrides.buyer_name) overrides.buyer_name = tx.client
            if (Object.keys(overrides).length > 0) {
              setSectionValues((prev) => ({ ...prev, section_1: { ...prev.section_1, ...overrides } }))
            }
          }
        } catch (_e) {
          // ignore
        }

        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(`dp-contract-${transactionId}`)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (!cancelled) {
                setContractPreview(parsed)
                const warnings: string[] = []
                const insp = parsed?.inspection_period_days || parsed?.inspection_period || parsed?.fields?.inspectionPeriod
                const inspDays = insp ? Number(insp) : null
                if (inspDays === null || Number.isNaN(inspDays)) {
                  warnings.push('Inspection period missing or not found (TN default 10 days)')
                } else if (inspDays < 10) {
                  warnings.push(`Inspection period is ${inspDays} day(s) — below TN recommended minimum (10 days)`)
                }
                const financing = parsed?.financing || parsed?.loan_type || parsed?.fields?.financing
                if (!financing) warnings.push('Financing contingency not found — confirm financing terms')
                setContractWarnings(warnings)
              }
            }
          } catch (_e) {
            // ignore
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Unable to load wizard')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadWizard()
    return () => {
      cancelled = true
    }
  }, [transactionId])

  const connectDealPanel = (
    <div className="space-y-4">
      <p className="text-sm text-gray-300">A connected deal keeps your RF401 aligned with the correct transaction record.</p>
      <div className="rounded-2xl border border-white/10 bg-[#041022] p-4">
        {selectedDeal ? (
          <div className="space-y-1">
            <div className="text-xs text-gray-400">Connected deal</div>
            <div className="text-lg font-semibold text-white">{selectedDeal.address || `Deal ${selectedDeal.id}`}</div>
            <div className="text-xs text-gray-400">{selectedDeal.client || 'Unknown client'} · {selectedDeal.status || 'Status unknown'}</div>
          </div>
        ) : (
          <div className="text-sm text-gray-400">No deal connected yet. Please select one to continue.</div>
        )}
      </div>
      <button
        onClick={() => setShowDealPicker(true)}
        className="rounded-full border border-orange-500 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-orange-200 transition hover:bg-orange-500/10"
      >
        {selectedDeal ? 'Change Deal' : 'Select a Deal'}
      </button>
      {contractPreview && (
        <div className="rounded-2xl border border-white/10 bg-[#051428] p-4 text-sm text-gray-300">
          <div className="text-xs uppercase tracking-[0.3em] text-gray-400">Latest contract preview</div>
          <div className="mt-2 grid gap-2 text-sm">
            <div>Address: <span className="font-semibold text-white">{contractPreview.fields?.propertyAddress || '—'}</span></div>
            <div>Buyer(s): <span className="font-semibold text-white">{Array.isArray(contractPreview.fields?.buyerNames) ? contractPreview.fields?.buyerNames.join(', ') : contractPreview.fields?.buyerNames || '—'}</span></div>
            <div>Seller(s): <span className="font-semibold text-white">{contractPreview.fields?.sellerNames || '—'}</span></div>
          </div>
        </div>
      )}
    </div>
  )

  const partiesPanel = (
    <div className="space-y-4">
      <p className="text-sm text-gray-300">Update the legal names so RF401 references match the contract.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-xs uppercase tracking-[0.3em] text-gray-400">
          Buyer legal name
          <input
            type="text"
            value={displayFieldValue('section_1', 'buyer_name', 'text')}
            onChange={(event) => handleFieldChange('section_1', 'buyer_name', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-white focus:border-orange-400"
            placeholder="Buyer legal name"
          />
        </label>
        <label className="space-y-1 text-xs uppercase tracking-[0.3em] text-gray-400">
          Seller legal name
          <input
            type="text"
            value={displayFieldValue('section_1', 'seller_name', 'text')}
            onChange={(event) => handleFieldChange('section_1', 'seller_name', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-white focus:border-orange-400"
            placeholder="Seller legal name"
          />
        </label>
      </div>
      {!partyComplete && <div className="text-sm text-amber-300">Buyer and seller names must be provided before continuing.</div>}
    </div>
  )

  const rf401Panel = (
    <div className="space-y-4">
      <p className="text-sm text-gray-300">Capture the critical RF401 data points listed below.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-xs uppercase tracking-[0.3em] text-gray-400">
          Purchase price
          <input
            type="number"
            value={displayFieldValue('section_2', 'purchase_price_numeric', 'number')}
            onChange={(event) => handleFieldChange('section_2', 'purchase_price_numeric', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-white focus:border-orange-400"
            placeholder="Numeric value"
          />
        </label>
        <label className="space-y-1 text-xs uppercase tracking-[0.3em] text-gray-400">
          Closing date
          <input
            type="date"
            value={displayFieldValue('section_3_6', 'closing_date', 'date')}
            onChange={(event) => handleFieldChange('section_3_6', 'closing_date', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-white focus:border-orange-400"
          />
        </label>
        <label className="space-y-1 text-xs uppercase tracking-[0.3em] text-gray-400">
          Earnest money amount
          <input
            type="number"
            value={displayFieldValue('section_3_6', 'earnest_money_amount', 'number')}
            onChange={(event) => handleFieldChange('section_3_6', 'earnest_money_amount', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-white focus:border-orange-400"
            placeholder="Numeric value"
          />
        </label>
        <label className="space-y-1 text-xs uppercase tracking-[0.3em] text-gray-400">
          Earnest money due date
          <input
            type="date"
            value={displayFieldValue('section_3_6', 'earnest_money_due_date', 'date')}
            onChange={(event) => handleFieldChange('section_3_6', 'earnest_money_due_date', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-white focus:border-orange-400"
          />
        </label>
      </div>
      <label className="space-y-1 text-xs uppercase tracking-[0.3em] text-gray-400">
        Special stipulations
        <textarea
          value={displayFieldValue('section_3_6', 'special_assessments', 'text')}
          onChange={(event) => handleFieldChange('section_3_6', 'special_assessments', event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-white focus:border-orange-400"
          rows={3}
          placeholder="Capture any unique stipulations or adjustments."
        />
      </label>
      {!rf401Ready && (
        <div className="text-sm text-amber-300">Price, closing date, and earnest fields are required before review.</div>
      )}
    </div>
  )

  const reviewPanel = (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-[#041022] p-4">
        <div className="text-xs uppercase tracking-[0.3em] text-gray-400">RF401 summary</div>
        <div className="flex flex-col gap-2 text-sm text-gray-200">
          <div>Connected deal: {selectedDeal ? selectedDeal.address : `Transaction ${transactionId}`}</div>
          <div>Buyer: {displayFieldValue('section_1', 'buyer_name', 'text') || '—'}</div>
          <div>Seller: {displayFieldValue('section_1', 'seller_name', 'text') || '—'}</div>
        </div>
      </div>
      {contractWarnings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-100">
          <div className="text-xs uppercase tracking-[0.3em] text-amber-200">Contract flags</div>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {contractWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      {completeSummary && (
        <div className="rounded-2xl border border-cyan-400/40 bg-cyan-500/5 p-4 text-sm text-cyan-100">
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-200">Completion notes</div>
          <p className="mt-2 text-white">{completeSummary.next_actions}</p>
          {completeSummary.missing_fields.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-cyan-200">
              {completeSummary.missing_fields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-emerald-200">Ready for export with no gaps.</p>
          )}
          <div className="mt-4">
            <a
              href={`/api/rookwizard/${transactionId}/export`}
              className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black"
            >
              Download RF401 Export
            </a>
          </div>
        </div>
      )}
    </div>
  )

  const nextStepLabel = STEP_CONFIG[activeStep]?.title ?? ''

  const renderStepContent = () => {
    if (loading) {
      return (
        <div className="rounded-2xl border border-white/10 bg-[#051126] p-6 text-sm text-gray-300">Loading wizard data…</div>
      )
    }
    switch (activeStep) {
      case 1:
        return connectDealPanel
      case 2:
        return partiesPanel
      case 3:
        return rf401Panel
      case 4:
        return reviewPanel
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#030712] shadow-2xl">
        <div>
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div className="flex items-center gap-4">
              <ClosingPilotLogo size="sm" />
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">ClosingPilot TN</p>
                <h2 className="text-xl font-semibold text-white">RF401 Buyer Wizard</h2>
                <p className="text-sm text-gray-400">Step {step} · {status}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 hover:text-white">Close</button>
          </div>
          <div className="px-6 py-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-indigo-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-[0.65rem] uppercase tracking-[0.4em] text-gray-400">
              {STEP_CONFIG.map((stepDef) => (
                <span key={stepDef.id} className={stepDef.id === activeStep ? 'text-white font-semibold' : ''}>{stepDef.title}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-6">
          {error && (
            <div className="mb-4 rounded-2xl border border-red-600/50 bg-red-900/40 p-3 text-sm text-red-200">{error}</div>
          )}
          {renderStepContent()}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleBack}
              disabled={activeStep === 1 || saving}
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/70 hover:border-white/40 disabled:opacity-50"
            >
              Back
            </button>
            {activeStep < STEP_CONFIG.length ? (
              <button
                onClick={handleNextStep}
                disabled={
                  saving ||
                  (activeStep === 1 && !selectedDeal) ||
                  (activeStep === 2 && !partyComplete) ||
                  (activeStep === 3 && !rf401Ready)
                }
                className="rounded-full border border-orange-400 bg-orange-500 px-6 py-2 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:opacity-60"
              >
                {saving ? 'Saving…' : `Next: ${nextStepLabel}`}
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!allowComplete || saving}
                className="rounded-full border border-cyan-400 bg-cyan-400 px-6 py-2 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-50"
              >
                {saving ? 'Finalizing…' : 'Finalize & Export'}
              </button>
            )}
          </div>
        </div>
      </div>
      <DealPickerModal
        open={showDealPicker}
        selectedDealId={selectedDeal?.id ?? null}
        onClose={() => setShowDealPicker(false)}
        onSelect={connectDealAndPopulate}
      />
    </div>


  )
}

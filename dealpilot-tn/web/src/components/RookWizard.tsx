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

const DEFICIENCY_OPTIONS = [
  { key: 'hvac', label: 'HVAC' },
  { key: 'plumbing', label: 'Plumbing' },
  { key: 'electrical', label: 'Electrical' },
  { key: 'roof', label: 'Roof' },
  { key: 'foundation', label: 'Foundation' },
  { key: 'appliances', label: 'Appliances' },
  { key: 'other', label: 'Other (describe)' },
] as const

type DeficiencyKey = (typeof DEFICIENCY_OPTIONS)[number]['key']
interface DeficiencyState {
  checked: boolean
  notes: string
}
type Rf401Status = 'Satisfactory' | 'Unsatisfactory' | 'Satisfactory with exceptions'
const OVERALL_STATUSES: Rf401Status[] = ['Satisfactory', 'Unsatisfactory', 'Satisfactory with exceptions']

interface Rf401DraftState {
  propertyAddress: string
  inspectionDate: string
  deficiencies: Record<DeficiencyKey, DeficiencyState>
  overallStatus: Rf401Status
}

function buildEmptyDeficiencies(): Record<DeficiencyKey, DeficiencyState> {
  return DEFICIENCY_OPTIONS.reduce((acc, option) => {
    acc[option.key] = { checked: false, notes: '' }
    return acc
  }, {} as Record<DeficiencyKey, DeficiencyState>)
}

function buildDefaultRf401Draft(address?: string): Rf401DraftState {
  return {
    propertyAddress: address || '',
    inspectionDate: '',
    deficiencies: buildEmptyDeficiencies(),
    overallStatus: 'Satisfactory',
  }
}

function mergeDeficiencies(source?: Record<string, any>): Record<DeficiencyKey, DeficiencyState> {
  const base = buildEmptyDeficiencies()
  if (!source) return base
  return DEFICIENCY_OPTIONS.reduce((acc, option) => {
    const origin = source[option.key]
    acc[option.key] = {
      checked: Boolean(origin?.checked),
      notes: typeof origin?.notes === 'string' ? origin.notes : '',
    }
    return acc
  }, {} as Record<DeficiencyKey, DeficiencyState>)
}

function evaluateRf401MissingFields(data: Rf401DraftState): string[] {
  const missing: string[] = []
  if (!data.propertyAddress.trim()) missing.push('Property address')
  if (!data.inspectionDate) missing.push('Inspection date')
  if (!data.overallStatus) missing.push('Overall status')
  Object.entries(data.deficiencies).forEach(([key, state]) => {
    if (state.checked && state.notes.trim().length === 0) {
      const option = DEFICIENCY_OPTIONS.find((opt) => opt.key === key)
      missing.push(`${option?.label || key} notes`)
    }
  })
  return missing
}

type DealContactRow = {
  id: string
  deal_id: number
  role: string
  contact_id: string
  contacts?: {
    id?: string
    name?: string
    email?: string
    phone?: string
  }
}



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
  const [dealContacts, setDealContacts] = useState<DealContactRow[]>([])
  const [dealDetailsLoading, setDealDetailsLoading] = useState(false)
  const [confirmingParties, setConfirmingParties] = useState(false)
  const [rf401Draft, setRf401Draft] = useState<Rf401DraftState>(() => buildDefaultRf401Draft())
  const [draftSaving, setDraftSaving] = useState(false)
  const [draftMessage, setDraftMessage] = useState<string | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [exportMessage, setExportMessage] = useState<string | null>(null)

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

  const persistRf401Data = async (mode: 'draft' | 'submitted') => {
    if (!transactionId) {
      setError('Transaction ID is required to save RF401 data.')
      return false
    }
    if (mode === 'draft') {
      setDraftSaving(true)
    } else {
      setFinalizing(true)
    }
    setError(null)
    try {
      const res = await fetch(`/api/rf401/${transactionId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: rf401Draft, mode }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error || 'Unable to persist RF401 data')
      }
      if (mode === 'draft') {
        const now = new Date().toLocaleTimeString()
        setDraftMessage(`Draft saved at ${now}`)
      } else {
        const missing = evaluateRf401MissingFields(rf401Draft)
        setCompleteSummary({
          missing_fields: missing,
          next_actions: missing.length ? 'Resolve highlighted fields before exporting.' : 'RF401 data saved to the deal.',
        })
        setStatus(sectionProgress.section_3_6.status)
      }
      return true
    } catch (err: any) {
      setError(err.message || 'Unable to save RF401 data')
      return false
    } finally {
      if (mode === 'draft') setDraftSaving(false)
      else setFinalizing(false)
    }
  }

  const handleSaveRf401Draft = async () => persistRf401Data('draft')

  const handleSaveToDeal = async () => {
    const missing = evaluateRf401MissingFields(rf401Draft)
    if (missing.length) {
      setError('Please resolve missing RF401 fields before saving to the deal.')
      return false
    }
    const saved = await persistRf401Data('submitted')
    if (saved) {
      setExportMessage('RF401 draft promoted to the deal. PDF export is a future feature.')
    }
    return saved
  }

  const handleRequestExport = () => {
    setExportMessage('PDF export is a placeholder; integration coming soon.')
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
    return Boolean(rf401Draft.propertyAddress.trim() && rf401Draft.inspectionDate && rf401Draft.overallStatus)
  }, [rf401Draft])

  const allowComplete = status === sectionProgress.section_3_6.status
  const progressPercent = useMemo(() => ((activeStep - 1) / (STEP_CONFIG.length - 1)) * 100, [activeStep])

  const loadDealContacts = async (dealId: number): Promise<DealContactRow[]> => {
    const res = await fetch(`/api/communications/contacts?deal_id=${dealId}`)
    if (!res.ok) {
      throw new Error('Unable to load deal parties')
    }
    const payload = await res.json().catch(() => ({}))
    return Array.isArray(payload?.contacts) ? payload.contacts : []
  }

  const connectDealAndPopulate = async (deal: DealSummary) => {
    setSelectedDeal(deal)
    setShowDealPicker(false)
    setDealDetailsLoading(true)
    setError(null)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('rookwizard_selected_deal', JSON.stringify(deal))
      }
    } catch (_e) {
      // ignore
    }
    try {
      const [txRes, contacts] = await Promise.all([
        fetch(`/api/transactions/${deal.id}`),
        loadDealContacts(deal.id),
      ])
      const txPayload = await txRes.json().catch(() => null)
      if (!txRes.ok && txPayload?.error) {
        throw new Error(txPayload.error)
      }
      setDealContacts(contacts)
      const mergedDeal: DealSummary = {
        ...deal,
        address: txPayload?.address || deal.address,
        status: txPayload?.status || deal.status,
        closing_date: txPayload?.closing_date || deal.closing_date,
        client: txPayload?.client || deal.client,
      }
      setSelectedDeal(mergedDeal)
      const currentSection = sectionValues.section_1 || {}
      const override: Record<string, any> = {
        property_address: mergedDeal.address || deal.address || currentSection.property_address,
      }
      if (txPayload?.buyer_name) {
        override.buyer_name = txPayload.buyer_name
      } else if (!override.buyer_name && mergedDeal.client) {
        override.buyer_name = mergedDeal.client
      }
      if (txPayload?.seller_name) {
        override.seller_name = txPayload.seller_name
      }
      const buyerContact = contacts.find((contact) => (String(contact.role||'').toLowerCase().includes('buyer')) && contact.contacts?.name)
      const sellerContact = contacts.find((contact) => (String(contact.role||'').toLowerCase().includes('seller')) && contact.contacts?.name)
      if (buyerContact?.contacts?.name) {
        override.buyer_name = buyerContact.contacts.name
      }
      if (sellerContact?.contacts?.name) {
        override.seller_name = sellerContact.contacts.name
      }
      // Agent email fallback: prefer transaction payload agent fields, else pick agent contact email
      const agentEmail = txPayload?.agent || txPayload?.agent_email || contacts.find((c)=> String(c.role||'').toLowerCase().includes('agent') && c.contacts?.email)?.contacts?.email
      if(agentEmail) override.agent_email = agentEmail
      const merged = { ...currentSection, ...override }
      setSectionValues((prev) => ({ ...prev, section_1: merged }))
      const saved = await handleSaveSection('section_1', merged)
      if (saved) {
        setActiveStep(2)
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load deal information')
    } finally {
      setDealDetailsLoading(false)
    }
  }

  const handleNextStep = async () => {
    if (activeStep === 1) {
      setActiveStep(2)
      return
    }
    if (activeStep === 2) {
      await handleConfirmParties()
      return
    }
    if (activeStep === 3) {
      const saved = await handleSaveRf401Draft()
      if (saved) {
        setActiveStep(4)
      }
      return
    }
  }


  const handleConfirmParties = async () => {
    if (!partyComplete) return
    setConfirmingParties(true)
    const saved = await handleSaveSection('section_1')
    if (saved) setActiveStep(3)
    setConfirmingParties(false)
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
      setDealContacts([])
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
            const loadedContacts = await loadDealContacts(mapped.id)
            setDealContacts(loadedContacts)

            const overrides: Record<string, any> = {}
            if (tx.property_address) overrides.property_address = tx.property_address
            if (tx.buyer_name || tx.buyer_names) overrides.buyer_name = tx.buyer_name || tx.buyer_names || tx.client
            if (tx.seller_name) overrides.seller_name = tx.seller_name
            const buyerContact = loadedContacts.find((contact) => contact.role === 'buyer' && contact.contacts?.name)
            const sellerContact = loadedContacts.find((contact) => contact.role === 'seller' && contact.contacts?.name)
            if (buyerContact?.contacts?.name) overrides.buyer_name = buyerContact.contacts.name
            if (sellerContact?.contacts?.name) overrides.seller_name = sellerContact.contacts.name
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

  useEffect(() => {
    let cancelled = false
    const loadRf401Draft = async () => {
      if (!transactionId) return
      try {
        const res = await fetch(`/api/rf401/${transactionId}/draft`)
        if (!res.ok) return
        const payload = await res.json().catch(() => null)
        if (cancelled) return
        const stored = payload?.data?.value
        if (stored) {
          setRf401Draft((prev) => ({
            propertyAddress: stored.propertyAddress || prev.propertyAddress,
            inspectionDate: stored.inspectionDate || prev.inspectionDate,
            overallStatus: OVERALL_STATUSES.includes(stored.overallStatus) ? stored.overallStatus : prev.overallStatus,
            deficiencies: mergeDeficiencies(stored.deficiencies),
          }))
        }
      } catch (_err) {
        // ignore for now
      }
    }
    loadRf401Draft()
    return () => { cancelled = true }
  }, [transactionId])

  useEffect(() => {
    if (selectedDeal?.address) {
      setRf401Draft((prev) => (prev.propertyAddress ? prev : { ...prev, propertyAddress: selectedDeal.address }))
    }
  }, [selectedDeal?.address])

  const connectDealPanel = (
    <div className="space-y-4">
      <p className="text-sm text-gray-300">A connected deal keeps your RF401 aligned with the correct transaction record.</p>
      <div className="rounded-2xl border border-white/10 bg-[#041022] p-4">
        {selectedDeal ? (
          <div className="space-y-1">
            <div className="text-xs text-gray-400">Connected deal</div>
            <div className="text-lg font-semibold text-white">{selectedDeal.address || `Deal ${selectedDeal.id}`}</div>
            <div className="text-xs text-gray-400">{selectedDeal.client || 'Unknown client'} · {selectedDeal.status || 'Status unknown'}</div>
            {selectedDeal.closing_date && (
              <div className="text-xs text-gray-400">Closing: {new Date(selectedDeal.closing_date).toLocaleDateString()}</div>
            )}
            <div className="text-xs text-gray-400">Linked contacts: {dealContacts.length}</div>
          </div>
        ) : (
          <div className="text-sm text-gray-400">No deal connected yet. Please select one to continue.</div>
        )}
      </div>
      {dealDetailsLoading && (
        <div className="rounded-2xl border border-white/10 bg-[#031322] px-4 py-2 text-xs text-gray-400">Loading deal details…</div>
      )}
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

  const agentContacts = dealContacts.filter((contact) => {
    const role = String(contact.role||'').toLowerCase()
    return role.includes('agent') || role.includes('coordinator') || role.includes('transaction')
  })

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
      <div className="rounded-2xl border border-white/10 bg-[#041022] p-4 text-sm text-gray-300">
        <div className="text-xs uppercase tracking-[0.3em] text-gray-400">Agent & coordinator contacts</div>
        {agentContacts.length > 0 ? (
          <div className="mt-3 space-y-3">
            {agentContacts.map((contact) => (
              <div key={contact.id} className="rounded-xl border border-white/10 bg-[#050d1a] p-3">
                <div className="text-sm font-semibold text-white">{contact.contacts?.name || 'Unnamed contact'}</div>
                <div className="text-[0.65rem] uppercase tracking-[0.3em] text-gray-400">{contact.role}</div>
                {contact.contacts?.phone && <div className="text-xs text-gray-400">Phone: {contact.contacts.phone}</div>}
                {contact.contacts?.email && <div className="text-xs text-gray-400">Email: {contact.contacts.email}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-xs text-gray-400">No agent or coordinator contacts linked yet.</div>
        )}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleConfirmParties}
          disabled={!partyComplete || confirmingParties}
          className="rounded-full border border-orange-400 bg-orange-500 px-6 py-2 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:opacity-50"
        >
          {confirmingParties ? 'Confirming…' : 'Confirm Parties'}
        </button>
      </div>
    </div>
  )

  const flaggedDeficiencies = useMemo(
    () => DEFICIENCY_OPTIONS.filter((option) => rf401Draft.deficiencies[option.key].checked),
    [rf401Draft]
  )
  const missingFields = useMemo(() => evaluateRf401MissingFields(rf401Draft), [rf401Draft])
  const completeness = useMemo(() => {
    const baseFields = 3
    const totalRequired = baseFields + flaggedDeficiencies.length
    if (totalRequired === 0) return 100
    const filled = Math.max(totalRequired - missingFields.length, 0)
    return Math.round((filled / totalRequired) * 100)
  }, [flaggedDeficiencies.length, missingFields.length])

  const rf401Panel = (
    <div className="space-y-4">
      <p className="text-sm text-gray-300">Capture the Tennessee RF401 inspection details for this deal.</p>
      <label className="space-y-1 text-xs uppercase tracking-[0.3em] text-gray-400">
        Property address
        <input
          type="text"
          value={rf401Draft.propertyAddress}
          onChange={(event) => setRf401Draft((prev) => ({ ...prev, propertyAddress: event.target.value }))}
          className="w-full rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-white focus:border-orange-400"
          placeholder="Property address"
        />
      </label>
      <label className="space-y-1 text-xs uppercase tracking-[0.3em] text-gray-400">
        Inspection date
        <input
          type="date"
          value={rf401Draft.inspectionDate}
          onChange={(event) => setRf401Draft((prev) => ({ ...prev, inspectionDate: event.target.value }))}
          className="w-full rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-white focus:border-orange-400"
        />
      </label>
      <div className="space-y-3">
        {DEFICIENCY_OPTIONS.map((option) => {
          const state = rf401Draft.deficiencies[option.key]
          return (
            <div key={option.key} className="rounded-2xl border border-white/10 bg-[#050c14] p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-white">
                <input
                  type="checkbox"
                  checked={state.checked}
                  onChange={(event) =>
                    setRf401Draft((prev) => ({
                      ...prev,
                      deficiencies: {
                        ...prev.deficiencies,
                        [option.key]: { ...prev.deficiencies[option.key], checked: event.target.checked },
                      },
                    }))
                  }
                  className="h-4 w-4 rounded border-white/20 bg-transparent text-orange-500 focus:ring-0"
                />
                {option.label}
              </label>
              {state.checked && (
                <textarea
                  value={state.notes}
                  onChange={(event) =>
                    setRf401Draft((prev) => ({
                      ...prev,
                      deficiencies: {
                        ...prev.deficiencies,
                        [option.key]: { ...prev.deficiencies[option.key], notes: event.target.value },
                      },
                    }))
                  }
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-white focus:border-orange-400"
                  rows={2}
                  placeholder={`Notes for ${option.label}`}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.3em] text-gray-400">Overall status</div>
        <div className="flex flex-wrap gap-3">
          {OVERALL_STATUSES.map((statusOption) => (
            <label
              key={statusOption}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${rf401Draft.overallStatus === statusOption ? 'border-cyan-400 text-cyan-200' : 'border-white/10 text-white/70'}`}
            >
              <input
                type="radio"
                name="rf401-status"
                value={statusOption}
                checked={rf401Draft.overallStatus === statusOption}
                onChange={() => setRf401Draft((prev) => ({ ...prev, overallStatus: statusOption }))}
                className="hidden"
              />
              {statusOption}
            </label>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleSaveRf401Draft}
          disabled={draftSaving}
          className="rounded-full border border-cyan-400 bg-cyan-400 px-6 py-2 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:opacity-50"
        >
          {draftSaving ? 'Saving draft…' : 'Save draft'}
        </button>
        {draftMessage && <span className="text-xs text-cyan-200">{draftMessage}</span>}
      </div>
    </div>
  )

  const reviewPanel = (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-[#041022] p-4">
        <div className="text-xs uppercase tracking-[0.3em] text-gray-400">RF401 summary</div>
        <div className="flex flex-col gap-2 text-sm text-gray-200">
          <div>Connected deal: {selectedDeal ? selectedDeal.address : `Transaction ${transactionId}`}</div>
          <div>Property address: {rf401Draft.propertyAddress || '—'}</div>
          <div>Inspection date: {rf401Draft.inspectionDate ? new Date(rf401Draft.inspectionDate).toLocaleDateString() : '—'}</div>
          <div>Overall status: {rf401Draft.overallStatus}</div>
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
      <div className="rounded-2xl border border-white/10 bg-[#031022] p-4">
        <div className="text-xs uppercase tracking-[0.3em] text-gray-400">Completeness</div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-white">{completeness}%</div>
          <div className="w-2/3">
            <div className="h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-cyan-400" style={{ width: `${completeness}%` }} />
            </div>
          </div>
        </div>
        {missingFields.length > 0 ? (
          <div className="mt-3 text-xs text-red-300">
            Missing: {missingFields.join(', ')}
          </div>
        ) : (
          <div className="mt-3 text-xs text-emerald-200">All required fields completed.</div>
        )}
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#031022] p-4">
        <div className="text-xs uppercase tracking-[0.3em] text-gray-400">Deficiencies flagged</div>
        <div className="mt-2 space-y-2 text-sm text-gray-200">
          {flaggedDeficiencies.length > 0 ? (
            flaggedDeficiencies.map((def) => (
              <div key={def.key} className="rounded-xl border border-white/10 bg-[#050d1a] p-3">
                <div className="text-sm font-semibold text-white">{def.label}</div>
                <p className="text-xs text-gray-400">{rf401Draft.deficiencies[def.key].notes || 'Notes are pending.'}</p>
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-400">No deficiencies flagged.</div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleRequestExport}
          className="rounded-full border border-white/10 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black"
        >
          Export PDF
        </button>
        <button
          onClick={handleSaveToDeal}
          disabled={finalizing || missingFields.length > 0}
          className="rounded-full border border-cyan-400 bg-cyan-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black disabled:opacity-60"
        >
          {finalizing ? 'Saving to deal…' : 'Save to Deal'}
        </button>
        {exportMessage && <span className="text-xs text-cyan-200">{exportMessage}</span>}
      </div>
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
                  (activeStep === 1 && (!selectedDeal || dealDetailsLoading)) ||
                  (activeStep === 2 && (!partyComplete || confirmingParties)) ||
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

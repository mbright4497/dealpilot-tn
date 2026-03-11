export const UNKNOWN_MARKER = 'unknown in current RF401 reference'

export type SectionName = 'section_1' | 'section_2' | 'section_2d' | 'section_3_6'

type FieldType = 'text' | 'number' | 'date' | 'enum' | 'array'

export interface FieldDefinition<T extends FieldType = FieldType> {
  key: string
  label: string
  type: T
  enumOptions?: string[]
}

const sectionFields: Record<SectionName, FieldDefinition[]> = {
  section_1: [
    { key: 'buyer_name', label: 'Buyer legal name', type: 'text' },
    { key: 'seller_name', label: 'Seller legal name', type: 'text' },
    { key: 'property_address', label: 'Property address', type: 'text' },
    { key: 'county', label: 'County', type: 'text' },
    { key: 'deed_instrument_reference', label: 'Deed/instrument reference', type: 'text' },
    { key: 'included_items', label: 'Included items', type: 'array' },
    { key: 'remaining_items', label: 'Remaining items', type: 'array' },
    { key: 'excluded_items', label: 'Excluded items', type: 'array' },
    { key: 'leased_items', label: 'Leased items', type: 'array' },
    { key: 'fuel_adjustment', label: 'Fuel adjustment reference', type: 'text' },
  ],
  section_2: [
    { key: 'purchase_price_numeric', label: 'Purchase price (numeric)', type: 'number' },
    { key: 'purchase_price_written', label: 'Purchase price (written)', type: 'text' },
    { key: 'loan_to_value_percent', label: 'Loan-to-value (%)', type: 'number' },
    { key: 'financing_type', label: 'Financing type', type: 'enum', enumOptions: ['Conventional', 'FHA', 'VA', 'USDA', 'Other'] },
    { key: 'financial_contingency', label: 'Financial contingency', type: 'text' },
    { key: 'appraisal_contingency', label: 'Appraisal contingency', type: 'text' },
  ],
  section_2d: [
    { key: 'seller_expenses', label: 'Seller expenses', type: 'text' },
    { key: 'buyer_expenses', label: 'Buyer expenses', type: 'text' },
    { key: 'title_expense_allocation', label: 'Title expense allocation', type: 'text' },
    { key: 'buyer_closing_agency_name', label: 'Buyer closing agency name', type: 'text' },
    { key: 'buyer_closing_agency_contact', label: 'Buyer closing agency contact', type: 'text' },
    { key: 'buyer_closing_agency_email', label: 'Buyer closing agency email', type: 'text' },
    { key: 'buyer_closing_agency_phone', label: 'Buyer closing agency phone', type: 'text' },
    { key: 'buyer_deed_names', label: 'Buyer deed names', type: 'array' },
  ],
  section_3_6: [
    { key: 'earnest_money_holder', label: 'Earnest money holder', type: 'text' },
    { key: 'earnest_money_amount', label: 'Earnest money amount', type: 'number' },
    { key: 'earnest_money_due_date', label: 'Earnest money due date', type: 'date' },
    { key: 'closing_date', label: 'Closing date', type: 'date' },
    { key: 'possession_terms', label: 'Possession terms', type: 'text' },
    { key: 'inspection_period_end', label: 'Inspection period end', type: 'date' },
    { key: 'repair_period_end', label: 'Repair period end', type: 'date' },
    { key: 'financing_deadline', label: 'Financing deadline', type: 'date' },
    { key: 'appraisal_deadline', label: 'Appraisal deadline', type: 'date' },
    { key: 'greenbelt_intent', label: 'Greenbelt intent', type: 'text' },
    { key: 'special_assessments', label: 'Special assessments', type: 'text' },
    { key: 'warranties_transfer', label: 'Warranty transfers', type: 'text' },
    { key: 'hoa_fees', label: 'HOA fees', type: 'text' },
    { key: 'public_water_notes', label: 'Public water notes', type: 'text' },
    { key: 'public_sewer_notes', label: 'Public sewer notes', type: 'text' },
  ],
}

export const sectionOrder: SectionName[] = ['section_1', 'section_2', 'section_2d', 'section_3_6']

export type WizardSectionPayload = Record<string, any>

export interface Section1Data {
  buyer_name: string
  seller_name: string
  property_address: string
  county: string
  deed_instrument_reference: string
  included_items: string[]
  remaining_items: string[]
  excluded_items: string[]
  leased_items: string[]
  fuel_adjustment: string
}

export interface Section2Data {
  purchase_price_numeric: number | null
  purchase_price_written: string
  loan_to_value_percent: number | null
  financing_type: string
  financial_contingency: string
  appraisal_contingency: string
}

export interface Section2dData {
  seller_expenses: string
  buyer_expenses: string
  title_expense_allocation: string
  buyer_closing_agency_name: string
  buyer_closing_agency_contact: string
  buyer_closing_agency_email: string
  buyer_closing_agency_phone: string
  buyer_deed_names: string[]
}

export interface Section3to6Data {
  earnest_money_holder: string
  earnest_money_amount: number | null
  earnest_money_due_date: string | null
  closing_date: string | null
  possession_terms: string
  inspection_period_end: string | null
  repair_period_end: string | null
  financing_deadline: string | null
  appraisal_deadline: string | null
  greenbelt_intent: string
  special_assessments: string
  warranties_transfer: string
  hoa_fees: string
  public_water_notes: string
  public_sewer_notes: string
}

export interface RookWizardData {
  section_1: Section1Data
  section_2: Section2Data
  section_2d: Section2dData
  section_3_6: Section3to6Data
  wizard_status: string
  wizard_step: number
}

export interface RookWizardRow extends RookWizardData {
  transaction_id: string
  created_at?: string
  updated_at?: string
  completed_at?: string
}

function defaultString(): string {
  return UNKNOWN_MARKER
}

function defaultArray(): string[] {
  return [UNKNOWN_MARKER]
}

function defaultSection1(): Section1Data {
  return {
    buyer_name: defaultString(),
    seller_name: defaultString(),
    property_address: defaultString(),
    county: defaultString(),
    deed_instrument_reference: defaultString(),
    included_items: defaultArray(),
    remaining_items: defaultArray(),
    excluded_items: defaultArray(),
    leased_items: defaultArray(),
    fuel_adjustment: defaultString(),
  }
}

function defaultSection2(): Section2Data {
  return {
    purchase_price_numeric: null,
    purchase_price_written: defaultString(),
    loan_to_value_percent: null,
    financing_type: defaultString(),
    financial_contingency: defaultString(),
    appraisal_contingency: defaultString(),
  }
}

function defaultSection2d(): Section2dData {
  return {
    seller_expenses: defaultString(),
    buyer_expenses: defaultString(),
    title_expense_allocation: defaultString(),
    buyer_closing_agency_name: defaultString(),
    buyer_closing_agency_contact: defaultString(),
    buyer_closing_agency_email: defaultString(),
    buyer_closing_agency_phone: defaultString(),
    buyer_deed_names: defaultArray(),
  }
}

function defaultSection3(): Section3to6Data {
  return {
    earnest_money_holder: defaultString(),
    earnest_money_amount: null,
    earnest_money_due_date: null,
    closing_date: null,
    possession_terms: defaultString(),
    inspection_period_end: null,
    repair_period_end: null,
    financing_deadline: null,
    appraisal_deadline: null,
    greenbelt_intent: defaultString(),
    special_assessments: defaultString(),
    warranties_transfer: defaultString(),
    hoa_fees: defaultString(),
    public_water_notes: defaultString(),
    public_sewer_notes: defaultString(),
  }
}

export function buildDefaultWizardData(): RookWizardData {
  return {
    section_1: defaultSection1(),
    section_2: defaultSection2(),
    section_2d: defaultSection2d(),
    section_3_6: defaultSection3(),
    wizard_status: 'initialized',
    wizard_step: 1,
  }
}

export function mergeWizardRow(row: Partial<RookWizardRow>): RookWizardData {
  const defaults = buildDefaultWizardData()
  const result: RookWizardData = {
    section_1: { ...defaults.section_1 },
    section_2: { ...defaults.section_2 },
    section_2d: { ...defaults.section_2d },
    section_3_6: { ...defaults.section_3_6 },
    wizard_status: row.wizard_status || defaults.wizard_status,
    wizard_step: row.wizard_step ?? defaults.wizard_step,
  }

  Object.values(sectionFields).flat().forEach((field) => {
    const sectionKey = Object.keys(sectionFields).find((sectionKey) => sectionFields[sectionKey as SectionName].some((f) => f.key === field.key)) as SectionName | undefined
    if (!sectionKey) return
    const section = result[sectionKey] as any
    const rawValue = (row as any)[field.key]

    if (rawValue === undefined || rawValue === null) return

    if (field.type === 'array') {
      section[field.key] = Array.isArray(rawValue) ? rawValue : [String(rawValue)]
    } else {
      section[field.key] = rawValue as any
    }
  })

  return result
}

function isUnknownString(value: unknown): boolean {
  return typeof value === 'string' && value.trim() === UNKNOWN_MARKER
}

function isArrayUnknown(value: unknown): boolean {
  if (!Array.isArray(value)) return true
  if (value.length === 0) return true
  return value.every((item) => isUnknownString(item))
}

function isValueMissing(value: unknown, definition: FieldDefinition): boolean {
  if (definition.type === 'array') {
    return isArrayUnknown(value)
  }
  if (value === null || value === undefined) return true
  if (definition.type === 'number') {
    return Number.isNaN(Number(value))
  }
  if (typeof value === 'string' && value.trim().length === 0) return true
  return isUnknownString(value)
}

export function missingFields(data: RookWizardData): string[] {
  const out: string[] = []
  sectionOrder.forEach((section) => {
    sectionFields[section].forEach((field) => {
      const value = (data as any)[section][field.key]
      if (isValueMissing(value, field)) {
        out.push(`${section}.${field.key}`)
      }
    })
  })
  return out
}

export function sanitizeSectionPayload(sectionKey: SectionName, payload: Record<string, any>) {
  const definitions = sectionFields[sectionKey]
  const errors: string[] = []
  const sanitized: Record<string, any> = {}

  for (const definition of definitions) {
    const raw = payload[definition.key]

    if (definition.type === 'number') {
      if (raw === null || raw === undefined || raw === '') {
        sanitized[definition.key] = null
        continue
      }
      const parsed = Number(raw)
      if (Number.isNaN(parsed)) {
        errors.push(`${definition.label} must be a valid number`)
        continue
      }
      sanitized[definition.key] = parsed
      continue
    }

    if (definition.type === 'array') {
      if (typeof raw === 'string') {
        const pieces = raw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
        sanitized[definition.key] = pieces.length ? pieces : defaultArray()
      } else if (Array.isArray(raw)) {
        sanitized[definition.key] = raw.map((item) => (typeof item === 'string' ? item : String(item))).filter(Boolean)
        if (sanitized[definition.key].length === 0) sanitized[definition.key] = defaultArray()
      } else {
        sanitized[definition.key] = defaultArray()
      }
      continue
    }

    const textValue = typeof raw === 'string' ? raw.trim() : raw == null ? '' : String(raw)
    if (textValue.length === 0) {
      sanitized[definition.key] = UNKNOWN_MARKER
    } else {
      sanitized[definition.key] = textValue
    }

    if (definition.enumOptions && sanitized[definition.key] !== UNKNOWN_MARKER) {
      if (!definition.enumOptions.includes(sanitized[definition.key])) {
        errors.push(`${definition.label} must be one of: ${definition.enumOptions.join(', ')}`)
      }
    }
  }

  return { errors, sanitized }
}

export const sectionPaths: Record<SectionName, string> = {
  section_1: 'section-1',
  section_2: 'section-2',
  section_2d: 'section-2d',
  section_3_6: 'sections-3-6',
}

export const sectionProgress: Record<SectionName, { step: number; status: string }> = {
  section_1: { step: 2, status: 'section-1-saved' },
  section_2: { step: 3, status: 'section-2-saved' },
  section_2d: { step: 4, status: 'section-2d-saved' },
  section_3_6: { step: 5, status: 'section-3-6-saved' },
}

export function markSectionUnknown(sectionKey: SectionName): Record<string, any> {
  const def = sectionFields[sectionKey]
  const result: Record<string, any> = {}
  def.forEach((field) => {
    if (field.type === 'number' || field.type === 'date') {
      result[field.key] = null
    } else if (field.type === 'array') {
      result[field.key] = defaultArray()
    } else {
      result[field.key] = UNKNOWN_MARKER
    }
  })
  return result
}

export function intakeApplyFields(data: RookWizardData) {
  const section1 = data.section_1
  const section2 = data.section_2
  const section3 = data.section_3_6

  const clean = (value: string | null | undefined) => (value && value !== UNKNOWN_MARKER ? value : null)

  return {
    propertyAddress: clean(section1.property_address),
    buyerNames: clean(section1.buyer_name),
    sellerNames: clean(section1.seller_name),
    purchasePrice: section2.purchase_price_numeric ?? null,
    bindingDate: clean(section3.earnest_money_due_date),
    inspectionEndDate: clean(section3.inspection_period_end),
    closingDate: clean(section3.closing_date),
  }
}

export function summaryText(missing: string[]) {
  if (missing.length === 0) return 'All RF401 sections completed. Ready for export.'
  return `Follow up on ${missing.length} incomplete fields before exporting.`
}

export function getSectionDefinitions(section: SectionName) {
  return sectionFields[section]
}

/**
 * Document Types Registry for DealPilot TN
 * Supports multi-document workflows (RF401, counter offers, VA/FHA addendums, etc.)
 * Data is interchangeable between document types like ListedKit.
 */

export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'address' | 'names';

export interface DocumentField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  section?: string;
  /** Line numbers in the PDF where this field appears */
  lineNumbers?: number[];
}

export interface DocumentType {
  id: string;
  name: string;
  shortName: string;
  description: string;
  /** Fields extracted from this document type */
  fields: DocumentField[];
  /** Which master transaction fields this document can populate */
  populatesFields: string[];
  /** Whether this doc can override previously extracted data */
  canOverride: boolean;
}

// ─── Master Transaction Fields ───────────────────────────────────
// These are the canonical fields every transaction tracks.
// Individual documents map INTO these fields.
export const MASTER_TRANSACTION_FIELDS = [
  'propertyAddress',
  'buyerNames',
  'sellerNames',
  'purchasePrice',
  'earnestMoney',
  'bindingDate',
  'closingDate',
  'inspectionEndDate',
  'financingContingencyDate',
  'contractType',
  'specialStipulations',
  'loanType',
  'closingCostsPaidBySeller',
  'homeWarrantyAmount',
  'surveyDays',
] as const;

export type MasterFieldKey = (typeof MASTER_TRANSACTION_FIELDS)[number];

// ─── RF401 Purchase and Sale Agreement ───────────────────────────
export const RF401_FIELDS: DocumentField[] = [
  { key: 'propertyAddress', label: 'Property Address', type: 'address', required: true, section: '1. Purchase and Sale', lineNumbers: [5, 6, 7] },
  { key: 'buyerNames', label: 'Buyer Names', type: 'names', required: true, section: '1. Purchase and Sale', lineNumbers: [2, 3] },
  { key: 'sellerNames', label: 'Seller Names', type: 'names', required: true, section: '1. Purchase and Sale', lineNumbers: [3, 4] },
  { key: 'purchasePrice', label: 'Purchase Price', type: 'currency', required: true, section: '2. Purchase Price', lineNumbers: [38, 39] },
  { key: 'earnestMoney', label: 'Earnest Money', type: 'currency', required: true, section: '2. Purchase Price', lineNumbers: [40, 41] },
  { key: 'bindingDate', label: 'Binding Date', type: 'date', required: true, section: 'Signatures', lineNumbers: [] },
  { key: 'closingDate', label: 'Closing Date', type: 'date', required: true, section: '2. Purchase Price', lineNumbers: [] },
  { key: 'inspectionEndDate', label: 'Inspection End Date', type: 'date', required: false, section: '8. Property Conditions', lineNumbers: [] },
  { key: 'financingContingencyDate', label: 'Financing Contingency Date', type: 'date', required: false, section: '4. Financing', lineNumbers: [] },
  { key: 'contractType', label: 'Contract Type', type: 'string', required: true },
  { key: 'specialStipulations', label: 'Special Stipulations', type: 'string', required: false, section: '17. Special Stipulations', lineNumbers: [] },
  { key: 'loanType', label: 'Loan Type', type: 'string', required: false, section: '4. Financing', lineNumbers: [56, 57] },
];

export const RF401: DocumentType = {
  id: 'rf401',
  name: 'RF401 Purchase and Sale Agreement',
  shortName: 'RF401',
  description: 'Standard Tennessee REALTORS® Purchase and Sale Agreement',
  fields: RF401_FIELDS,
  populatesFields: [
    'propertyAddress', 'buyerNames', 'sellerNames', 'purchasePrice',
    'earnestMoney', 'bindingDate', 'closingDate', 'inspectionEndDate',
    'financingContingencyDate', 'contractType', 'specialStipulations', 'loanType',
  ],
  canOverride: false,
};

// ─── Counter Offer ───────────────────────────────────────────────
export const COUNTER_OFFER: DocumentType = {
  id: 'counter-offer',
  name: 'Counter Offer',
  shortName: 'Counter',
  description: 'Counter offer modifying terms of the original agreement',
  fields: [
    { key: 'purchasePrice', label: 'New Purchase Price', type: 'currency', required: false },
    { key: 'closingDate', label: 'New Closing Date', type: 'date', required: false },
    { key: 'earnestMoney', label: 'New Earnest Money', type: 'currency', required: false },
    { key: 'specialStipulations', label: 'Counter Stipulations', type: 'string', required: false },
  ],
  populatesFields: ['purchasePrice', 'closingDate', 'earnestMoney', 'specialStipulations'],
  canOverride: true,
};

// ─── VA/FHA Addendum ─────────────────────────────────────────────
export const VA_FHA_ADDENDUM: DocumentType = {
  id: 'va-fha-addendum',
  name: 'VA/FHA Financing Addendum',
  shortName: 'VA/FHA',
  description: 'Government loan addendum with appraisal and repair requirements',
  fields: [
    { key: 'loanType', label: 'Loan Type (VA/FHA)', type: 'string', required: true },
    { key: 'closingCostsPaidBySeller', label: 'Seller Paid Closing Costs', type: 'currency', required: false },
  ],
  populatesFields: ['loanType', 'closingCostsPaidBySeller'],
  canOverride: true,
};

// ─── Document Registry ───────────────────────────────────────────
export const DOCUMENT_REGISTRY: Record<string, DocumentType> = {
  'rf401': RF401,
  'counter-offer': COUNTER_OFFER,
  'va-fha-addendum': VA_FHA_ADDENDUM,
};

/** Get a document type by ID */
export function getDocumentType(id: string): DocumentType | undefined {
  return DOCUMENT_REGISTRY[id];
}

/** Get all registered document types */
export function getAllDocumentTypes(): DocumentType[] {
  return Object.values(DOCUMENT_REGISTRY);
}

/** Merge extracted data from a new document into existing transaction data.
 *  If the document canOverride, new values replace old ones.
 *  Otherwise, only empty/missing fields are filled. */
export function mergeDocumentData(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  docType: DocumentType
): Record<string, unknown> {
  const merged = { ...existing };
  for (const field of docType.fields) {
    const val = incoming[field.key];
    if (val === undefined || val === null || val === '') continue;
    if (docType.canOverride || !merged[field.key]) {
      merged[field.key] = val;
    }
  }
  return merged;
}

/** User-message prompts for structured JSON extraction (RF401 uses parseContractPdfFromBase64). */

export const EXTRACTION_PROMPTS: Record<string, string> = {
  rf406_counter: `Extract all changed terms from this Counter Offer.
A counter offer modifies specific terms of the PSA.
Return JSON:
{
  "counter_number": number,
  "changes": [
    { "field": string, "old_value": string, "new_value": string }
  ],
  "expiration_date": string | null,
  "accepted_by": string | null,
  "acceptance_date": string | null,
  "new_purchase_price": number | null,
  "new_closing_date": string | null,
  "new_earnest_money": number | null,
  "additional_terms": string[],
  "blank_fields": string[]
}`,

  rf407_amendment: `Extract all modifications from this Amendment.
Return JSON:
{
  "amendment_number": number,
  "sections_modified": string[],
  "changes": [
    { "section": string, "description": string }
  ],
  "new_closing_date": string | null,
  "new_possession_date": string | null,
  "repair_items": string[],
  "repair_credit": number | null,
  "other_changes": string[],
  "blank_fields": string[]
}`,

  fha_addendum: `Extract all FHA specific requirements.
Return JSON:
{
  "loan_type": string,
  "escape_clause": boolean,
  "amendatory_clause": boolean,
  "minimum_property_requirements": string[],
  "additional_conditions": string[],
  "blank_fields": string[]
}`,

  va_addendum: `Extract all VA specific requirements.
Return JSON:
{
  "loan_type": string,
  "escape_clause": boolean,
  "amendatory_clause": boolean,
  "minimum_property_requirements": string[],
  "additional_conditions": string[],
  "blank_fields": string[]
}`,

  lead_paint: `Extract lead paint disclosure status.
Return JSON:
{
  "property_built_before_1978": boolean,
  "known_lead_paint": boolean | null,
  "lead_paint_records": boolean | null,
  "buyer_acknowledged": boolean,
  "agent_acknowledged": boolean,
  "blank_fields": string[]
}`,

  generic: `Extract key transaction metadata from this Tennessee real estate document.
Return JSON:
{
  "document_title": string,
  "key_dates": { "label": string, "value": string | null }[],
  "key_amounts": { "label": string, "value": number | null }[],
  "parties_mentioned": string[],
  "summary": string,
  "blank_fields": string[]
}`,
}

export function extractionInstructionForType(documentType: string): string {
  if (documentType === 'fha_addendum') return EXTRACTION_PROMPTS.fha_addendum
  if (documentType === 'va_addendum') return EXTRACTION_PROMPTS.va_addendum
  if (EXTRACTION_PROMPTS[documentType]) return EXTRACTION_PROMPTS[documentType]
  return EXTRACTION_PROMPTS.generic
}

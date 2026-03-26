/** Compare contract vs deal property addresses (case-insensitive, trimmed, unit numbers de-emphasized). */

export type AddressMismatchPayload = {
  contract_address: string
  transaction_address: string
  mismatch: true
}

export function normalizeAddressForCompare(raw: string): string {
  let s = raw.trim().toLowerCase()
  s = s.replace(/\b(apt|apartment|unit|suite|ste)\s*[#.]?\s*[a-z0-9-]+\b/gi, '')
  s = s.replace(/,\s*#\s*[a-z0-9-]+/gi, '')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

export function extractPropertyAddressFromExtracted(extracted: unknown): string | null {
  const e =
    extracted && typeof extracted === 'object' && !Array.isArray(extracted)
      ? (extracted as Record<string, unknown>)
      : null
  if (!e) return null
  const direct = e.property_address
  if (typeof direct === 'string' && direct.trim()) return direct.trim()
  const fields =
    e.fields && typeof e.fields === 'object' && !Array.isArray(e.fields)
      ? (e.fields as Record<string, unknown>)
      : null
  const pa = fields?.propertyAddress
  if (typeof pa === 'string' && pa.trim()) return pa.trim()
  return null
}

export function computeAddressMismatch(
  extracted: unknown,
  transactionAddress: string | null | undefined
): AddressMismatchPayload | null {
  const contractAddr = extractPropertyAddressFromExtracted(extracted)
  const txAddr = typeof transactionAddress === 'string' ? transactionAddress.trim() : ''
  if (!contractAddr || !txAddr) return null
  const a = normalizeAddressForCompare(contractAddr)
  const b = normalizeAddressForCompare(txAddr)
  if (!a || !b) return null
  if (a === b) return null
  return {
    contract_address: contractAddr,
    transaction_address: txAddr,
    mismatch: true,
  }
}

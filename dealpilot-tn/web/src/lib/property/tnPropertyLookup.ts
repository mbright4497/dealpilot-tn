/**
 * Tennessee Comptroller / public records — basic lookup helpers.
 * ATTOM and premium data sources can plug in here when API keys are available.
 */

export type TnPropertyLookupResult = {
  county?: string | null
  parcel_hint?: string | null
  public_lookup_url?: string | null
  source: 'tn_comptroller_assessor_portal'
  disclaimer: string
}

/**
 * Returns a best-effort URL to TN county assessor / CAD search for an address.
 * Does not call the network; safe to use server- or client-side.
 */
export function buildTnAssessorSearchUrl(address: string, county?: string | null): string {
  const q = encodeURIComponent(address.trim())
  if (county) {
    const c = String(county).toLowerCase().replace(/[^a-z]/g, '')
    return `https://www.comptroller.tn.gov/pa/search.aspx?q=${q}&countyHint=${encodeURIComponent(c)}`
  }
  return `https://www.comptroller.tn.gov/pa/search.aspx?q=${q}`
}

export function tnPropertyLookup(address: string, county?: string | null): TnPropertyLookupResult {
  return {
    county: county || null,
    parcel_hint: null,
    public_lookup_url: buildTnAssessorSearchUrl(address, county),
    source: 'tn_comptroller_assessor_portal',
    disclaimer:
      'Automated parcel values are not verified. Confirm against county register / assessor of record.',
  }
}

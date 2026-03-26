import { cleanJsonFromText } from '@/lib/reva/jsonUtils'

export type BrokerReviewIssue = {
  severity: 'critical' | 'warning' | 'info'
  message: string
  field?: string
}

export type BrokerCheck = {
  id: string
  name: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

export type BrokerReviewResult = {
  natural_language_summary: string
  checks: BrokerCheck[]
  issues: BrokerReviewIssue[]
}

const CHECK_IDS = [
  'parties',
  'financial_terms',
  'critical_dates',
  'contingencies',
  'property_disclosures',
  'addenda_consistency',
  'blanks_and_completeness',
  'tn_brokerage_compliance',
] as const

/**
 * Eight-point broker-style review of extracted document data (Tennessee TC lens).
 * Uses GPT-4o JSON when OPENAI_API_KEY is set; otherwise returns a minimal heuristic review.
 */
export async function brokerReview(input: {
  documentType: string
  displayName: string
  extractedData: unknown
}): Promise<BrokerReviewResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return heuristicReview(input)
  }

  const system = [
    'You are a Tennessee managing broker reviewing extracted contract data for a transaction coordinator.',
    'Perform exactly 8 checks (use these ids in order):',
    ...CHECK_IDS.map((id, i) => `${i + 1}. ${id}`),
    'Check meanings:',
    '- parties: buyer/seller correctly identified, no agent/broker confusion',
    '- financial_terms: price, earnest money, credits coherent',
    '- critical_dates: binding, closing, contingency deadlines logical vs today',
    '- contingencies: financing, inspection, appraisal, HOA as applicable',
    '- property_disclosures: lead paint, condition, HOA, relevant TN disclosures flagged',
    '- addenda_consistency: amendments/counters align with master PSA story',
    '- blanks_and_completeness: missing fields, blank lines, signature gaps',
    '- tn_brokerage_compliance: TREC/TN norms, licensee duties, referral language if present',
    'Return JSON only:',
    '{ "natural_language_summary": string, "checks": [{ "id": string, "name": string, "status": "pass"|"warn"|"fail", "detail": string }], "issues": [{ "severity": "critical"|"warning"|"info", "message": string, "field"?: string }] }',
    'Include all 8 checks with the ids listed above.',
  ].join('\n')

  const user = JSON.stringify(
    {
      documentType: input.documentType,
      displayName: input.displayName,
      extractedData: input.extractedData,
    },
    null,
    2
  )

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
    if (!res.ok) {
      return heuristicReview(input)
    }
    const completion = await res.json()
    const raw = completion?.choices?.[0]?.message?.content
    if (!raw || typeof raw !== 'string') return heuristicReview(input)
    const parsed = JSON.parse(cleanJsonFromText(raw)) as BrokerReviewResult
    if (!parsed.checks?.length) return heuristicReview(input)
    return {
      natural_language_summary: parsed.natural_language_summary || 'Review complete.',
      checks: parsed.checks,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    }
  } catch {
    return heuristicReview(input)
  }
}

function heuristicReview(input: {
  documentType: string
  displayName: string
  extractedData: unknown
}): BrokerReviewResult {
  const blankHints: string[] = []
  const walk = (v: unknown, path: string) => {
    if (v === null || v === undefined) blankHints.push(path)
    else if (Array.isArray(v)) {
      if (v.some((x) => x === null || x === undefined || x === '')) blankHints.push(`${path}[]`)
      v.forEach((x, i) => walk(x, `${path}[${i}]`))
    } else if (typeof v === 'object') {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (k.toLowerCase().includes('blank')) continue
        walk(val, `${path}.${k}`)
      }
    }
  }
  walk(input.extractedData, 'root')

  const issues: BrokerReviewIssue[] = []
  if (blankHints.length > 6) {
    issues.push({
      severity: 'warning',
      message: 'Several extracted fields appear empty; confirm against the PDF.',
    })
  }

  const checks: BrokerCheck[] = CHECK_IDS.map((id) => ({
    id,
    name: id.replace(/_/g, ' '),
    status: 'warn' as const,
    detail: 'Automatic review only — OpenAI broker review unavailable.',
  }))

  return {
    natural_language_summary: `Heuristic pass on "${input.displayName}" (${input.documentType}). ${
      issues.length ? issues[0].message : 'No critical blockers flagged by rules.'
    }`,
    checks,
    issues,
  }
}

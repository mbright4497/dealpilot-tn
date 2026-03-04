import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Severity = 'error' | 'warning' | 'info'

type ParsedPayload = {
  fields: {
    propertyAddress: string | null
    buyerNames: string[]
    sellerNames: string[]
    purchasePrice: number | null
    earnestMoney: number | null
    bindingDate: string | null
    closingDate: string | null
    inspectionEndDate: string | null
    financingContingencyDate: string | null
    specialStipulations: string | null
    contractType: 'buyer' | 'seller' | 'unknown'
  }
  issues: {
    field: string
    severity: Severity
    message: string
    section: string
  }[]
  timeline: {
    label: string
    date: string | null
    status: 'pending' | 'complete'
  }[]
}

function cleanJsonFromText(raw: string) {
  const first = raw.indexOf('{')
  const last = raw.lastIndexOf('}')
  if (first >= 0 && last > first) return raw.slice(first, last + 1)
  return raw
}

function base64ToBuffer(base64: string) {
  const b64 = base64.includes(',') ? base64.split(',').pop() || '' : base64
  return Buffer.from(b64, 'base64')
}

export async function POST(req: Request) {

  try {

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const body = await req.json()
    const fileBase64 = body?.file

    if (!fileBase64) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const pdfBuffer = base64ToBuffer(fileBase64)

    /* ---------- PDF PARSE FIX FOR NEXTJS ---------- */
    const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js')
    const pdfParse = pdfParseModule.default

    const pdfData = await pdfParse(pdfBuffer)
    const extractedText = pdfData.text || ''

    if (!extractedText) {
      return NextResponse.json(
        { error: 'No text could be extracted from the PDF.' },
        { status: 400 }
      )
    }

    /* ---------- SYSTEM PROMPT ---------- */

    const system = [
      "You are EVA, a Tennessee real estate transaction coordinator assistant.",
      "You extract structured data from Tennessee REALTORS® RF401 (Purchase & Sale Agreement) contract text.",
      "CRITICAL for buyer/seller identification: In RF401 Section 1, the BUYER name appears FIRST, written as [Name](\"Buyer\") agrees to buy from [Name](\"Seller\"). Do NOT confuse real estate agent names, broker names, or listing agent names with the actual buyer/seller parties.",
      "Return ONLY valid JSON that matches the requested schema. Do not include markdown, explanations, or extra keys.",
      "If a field is missing or uncertain, set it to null (or [] for arrays) and create an issue in the issues array.",
      "Dates: return YYYY-MM-DD when possible. Currency/amounts: numbers (no $ or commas).",
    ].join("\n")

    /* ---------- USER PROMPT ---------- */

    const user = [
      "Extract the following RF401 fields from the contract text:",
      "- propertyAddress (string)",
      "- buyerNames (array of strings)",
      "- sellerNames (array of strings)",
      "- purchasePrice (number)",
      "- earnestMoney (number)",
      "- bindingDate (YYYY-MM-DD)",
      "- closingDate (YYYY-MM-DD)",
      "- inspectionEndDate (YYYY-MM-DD)",
      "- financingContingencyDate (YYYY-MM-DD)",
      "- specialStipulations (string)",
      "- contractType (buyer or seller or unknown)",
      "",
      "CRITICAL buyer/seller instruction:",
      "In RF401 Section 1 the format is:",
      "\"[Buyer Name(s)] (\"Buyer\") agrees to buy from [Seller Name(s)] (\"Seller\").\"",
      "The BUYER appears first and the SELLER appears second.",
      "Do NOT extract real estate agent names, listing agent names, brokerage names, or broker information as buyers or sellers.",
      "Only extract the legal buyer and seller parties shown in Section 1.",
      "",
      "ALSO return an issues array with objects:",
      "{ field, severity:'error'|'warning'|'info', message, section }",
      "Use issues to flag:",
      "- missing required or common fields",
      "- inconsistencies (e.g., inspection end after closing, earnest money missing/0, dates not parseable)",
      "- potential compliance or risk concerns based on the text.",
      "",
      "ALSO return a timeline array with objects:",
      "{ label, date, status:'pending'|'complete' }",
      "Include at minimum:",
      "- Contract Executed (Binding Date)",
      "- Earnest Money Due",
      "- Inspection Period Ends",
      "- Financing Contingency Deadline",
      "- Closing Date",
      "",
      "Return JSON in this exact shape:",
      "{ fields:{...}, issues:[...], timeline:[...] }",
      "",
      "CONTRACT TEXT START:\n" + extractedText + "\nCONTRACT TEXT END"
    ].join("\n")

    /* ---------- OPENAI CALL ---------- */

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {

      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },

      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    })

    if (!openaiRes.ok) {

      const err = await openaiRes.text()
      return NextResponse.json(
        { error: 'OpenAI request failed', details: err },
        { status: 500 }
      )
    }

    const completion = await openaiRes.json()

    const raw = completion?.choices?.[0]?.message?.content

    if (!raw) {
      return NextResponse.json(
        { error: 'OpenAI returned empty response' },
        { status: 500 }
      )
    }

    let parsed: ParsedPayload

    try {
      parsed = JSON.parse(cleanJsonFromText(raw))
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI JSON', raw },
        { status: 500 }
      )
    }

    return NextResponse.json(parsed)

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      { error: 'Contract parsing failed' },
      { status: 500 }
    )
  }
}

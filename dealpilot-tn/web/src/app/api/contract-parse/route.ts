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

export async function POST(req: Request) {

  try {

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const base64 = body?.file

    if (!base64) {
      return NextResponse.json(
        { error: 'No PDF provided in body.file' },
        { status: 400 }
      )
    }

    /* ---------------- SYSTEM PROMPT ---------------- */

    const system = [
      "You are EVA, a Tennessee real estate transaction coordinator assistant.",
      "You extract structured data from Tennessee REALTORS® RF401 (Purchase & Sale Agreement) contract documents.",
      "CRITICAL for buyer/seller identification: In RF401 Section 1, the BUYER name appears FIRST, written as [Name](\"Buyer\") agrees to buy from [Name](\"Seller\"). Do NOT confuse real estate agent names, broker names, listing agent names, or brokerage information with the actual buyer/seller parties.",
      "Return ONLY valid JSON matching the requested schema. Do not include explanations or markdown.",
      "If a field is missing or uncertain, set it to null (or [] for arrays) and create an issue entry.",
      "Dates must be formatted YYYY-MM-DD when possible.",
      "Currency values must be numbers without $ or commas."
    ].join("\n")

    /* ---------------- USER PROMPT ---------------- */

    const userPrompt = [
      "Extract the following RF401 fields from this Tennessee real estate contract:",
      "- propertyAddress",
      "- buyerNames (array)",
      "- sellerNames (array)",
      "- purchasePrice (number)",
      "- earnestMoney (number)",
      "- bindingDate (YYYY-MM-DD)",
      "- closingDate (YYYY-MM-DD)",
      "- inspectionEndDate (YYYY-MM-DD)",
      "- financingContingencyDate (YYYY-MM-DD)",
      "- specialStipulations (string)",
      "- contractType (buyer | seller | unknown)",
      "",
      "CRITICAL buyer/seller instruction:",
      "RF401 Section 1 format:",
      "\"[Buyer Name(s)] (\"Buyer\") agrees to buy from [Seller Name(s)] (\"Seller\").\"",
      "The BUYER appears first. The SELLER appears second.",
      "Do NOT extract listing agents, brokers, or brokerage names as buyers or sellers.",
      "",
      "ALSO return an issues array:",
      "{ field, severity:'error'|'warning'|'info', message, section }",
      "",
      "Flag issues such as:",
      "- missing required fields",
      "- inconsistent dates",
      "- inspection ending after closing",
      "- missing earnest money",
      "- compliance risks",
      "",
      "ALSO return a timeline array:",
      "{ label, date, status:'pending'|'complete' }",
      "",
      "Include timeline events if found:",
      "- Contract Executed (Binding Date)",
      "- Earnest Money Due",
      "- Inspection Period Ends",
      "- Financing Contingency Deadline",
      "- Closing Date",
      "",
      "Return JSON exactly in this format:",
      "{ fields:{...}, issues:[...], timeline:[...] }"
    ].join("\n")

    /* ---------------- OPENAI CALL ---------------- */

    const openaiRes = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
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
            {
              role: 'system',
              content: system
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: userPrompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`
                  }
                }
              ]
            }
          ]
        })
      }
    )

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

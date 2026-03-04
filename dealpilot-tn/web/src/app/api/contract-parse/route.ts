import { NextResponse } from "next/server"
import { pdf } from "pdf-to-img"

export const runtime = "nodejs"

type Severity = "error" | "warning" | "info"

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
    contractType: "buyer" | "seller" | "unknown"
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
    status: "pending" | "complete"
  }[]
}

function cleanJsonFromText(raw: string) {
  const first = raw.indexOf("{")
  const last = raw.lastIndexOf("}")
  if (first >= 0 && last > first) return raw.slice(first, last + 1)
  return raw
}

function base64ToBuffer(base64: string) {
  const b64 = base64.includes(",") ? base64.split(",").pop() || "" : base64
  return Buffer.from(b64, "base64")
}

export async function POST(req: Request) {

  try {

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      )
    }

    const body = await req.json()
    const fileBase64 = body?.file

    if (!fileBase64) {
      return NextResponse.json(
        { error: "No PDF provided in body.file" },
        { status: 400 }
      )
    }

    const pdfBuffer = base64ToBuffer(fileBase64)

    /* ---------------- PDF → IMAGE CONVERSION ---------------- */

    const images: string[] = []

    const document = await pdf(pdfBuffer, { scale: 2 })

    for await (const image of document) {
      const base64Image = image.toString("base64")
      images.push(`data:image/png;base64,${base64Image}`)
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: "Failed to convert PDF pages to images." },
        { status: 500 }
      )
    }

    /* ---------------- SYSTEM PROMPT ---------------- */

    const systemPrompt = [
      "You are EVA, a Tennessee real estate transaction coordinator assistant.",
      "You extract structured data from Tennessee REALTORS RF401 Purchase & Sale Agreement contracts.",
      "",
      "CRITICAL BUYER/SELLER RULE:",
      "In RF401 Section 1 the format is:",
      "[Buyer Name] (\"Buyer\") agrees to buy from [Seller Name] (\"Seller\").",
      "",
      "The BUYER name appears FIRST.",
      "The SELLER name appears SECOND.",
      "",
      "DO NOT extract listing agents, brokers, or brokerage names as buyers or sellers.",
      "ONLY extract the legal contract parties shown in Section 1.",
      "",
      "Return ONLY valid JSON matching the requested schema.",
      "If a field is missing or uncertain set it to null or [].",
      "",
      "Dates must be formatted YYYY-MM-DD when possible.",
      "Currency must be numbers without dollar signs."
    ].join("\n")

    /* ---------------- USER PROMPT ---------------- */

    const userPrompt = [
      "Analyze this Tennessee RF401 Purchase and Sale Agreement.",
      "",
      "Extract the following fields:",
      "- propertyAddress",
      "- buyerNames (array)",
      "- sellerNames (array)",
      "- purchasePrice",
      "- earnestMoney",
      "- bindingDate",
      "- closingDate",
      "- inspectionEndDate",
      "- financingContingencyDate",
      "- specialStipulations",
      "- contractType",
      "",
      "ALSO RETURN:",
      "issues array with objects:",
      "{ field, severity:'error'|'warning'|'info', message, section }",
      "",
      "timeline array:",
      "{ label, date, status:'pending'|'complete' }",
      "",
      "Timeline events include:",
      "- Contract Executed (Binding Date)",
      "- Earnest Money Due",
      "- Inspection Period Ends",
      "- Financing Contingency Deadline",
      "- Closing Date",
      "",
      "Return JSON exactly like:",
      "{ fields:{...}, issues:[...], timeline:[...] }"
    ].join("\n")

    /* ---------------- BUILD IMAGE MESSAGE CONTENT ---------------- */

    const content: any[] = [
      { type: "text", text: userPrompt }
    ]

    for (const image of images) {
      content.push({
        type: "image_url",
        image_url: { url: image }
      })
    }

    /* ---------------- OPENAI CALL ---------------- */

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content
          }
        ]
      })
    })

    if (!openaiRes.ok) {

      const err = await openaiRes.text()

      return NextResponse.json(
        { error: "OpenAI request failed", details: err },
        { status: 500 }
      )
    }

    const completion = await openaiRes.json()

    const raw = completion?.choices?.[0]?.message?.content

    if (!raw) {
      return NextResponse.json(
        { error: "OpenAI returned empty response" },
        { status: 500 }
      )
    }

    let parsed: ParsedPayload

    try {
      parsed = JSON.parse(cleanJsonFromText(raw))
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI JSON", raw },
        { status: 500 }
      )
    }

    return NextResponse.json(parsed)

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      { error: "Contract parsing failed" },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

/* ---- unpdf coordinate-based visual text extraction ---- */

type TextItemLike = {
  str: string
  transform: number[] // [a,b,c,d,e,f]
  width?: number
  height?: number
  hasEOL?: boolean
}

type PositionedToken = {
  text: string
  x: number
  y: number
  w: number
  h: number
}

function tokensToVisualText(tokens: PositionedToken[]): string {
  if (!tokens.length) return ""

  // PDF coordinates: y increases upward in PDF space.
  // Sort by y DESC (top to bottom), x ASC (left to right).
  const sorted = [...tokens].sort((a, b) => {
    const dy = b.y - a.y
    if (Math.abs(dy) > 1.5) return dy
    return a.x - b.x
  })

  // Cluster into lines
  const lineTolerance = 2.5
  const lines: { y: number; items: PositionedToken[] }[] = []
  for (const t of sorted) {
    let line = lines.find((l) => Math.abs(l.y - t.y) <= lineTolerance)
    if (!line) {
      line = { y: t.y, items: [] }
      lines.push(line)
    }
    line.items.push(t)
    line.y = (line.y * (line.items.length - 1) + t.y) / line.items.length
  }

  // Sort lines top->bottom
  lines.sort((a, b) => b.y - a.y)

  // Within each line sort left->right and rebuild string
  const outLines: string[] = []
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x)
    let lineText = ""
    let prev: PositionedToken | null = null
    for (const item of line.items) {
      const text = item.text.replace(/\s+/g, " ").trim()
      if (!text) continue
      if (!prev) {
        lineText += text
        prev = item
        continue
      }
      const prevRight = prev.x + prev.w
      const gap = item.x - prevRight
      if (gap > Math.max(1.2, prev.w * 0.15)) {
        if (!lineText.endsWith(" ") && !/^[,.;:)]/.test(text)) lineText += " "
      } else {
        if (/[,:;]$/.test(lineText) && !lineText.endsWith(" ")) lineText += " "
      }
      lineText += text
      prev = item
    }
    const cleaned = lineText.trim()
    if (cleaned) outLines.push(cleaned)
  }

  return outLines.join("\n")
}

async function extractVisualTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  const pdfjs = await import("unpdf/pdfjs")
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    // @ts-expect-error pdfjs types vary by build
    disableWorker: true,
  })
  const doc = await loadingTask.promise
  const pageCount = doc.numPages
  const pageTexts: string[] = []

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await doc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.0 })
    const textContent = await page.getTextContent({ includeMarkedContent: true })

    const tokens: PositionedToken[] = []
    for (const item of textContent.items as unknown as TextItemLike[]) {
      const str = (item.str ?? "").toString()
      if (!str.trim()) continue
      const [a, , , d, e, f] = item.transform
      const [vx, vy] = pdfjs.Util.applyTransform([e, f], viewport.transform)
      const w = typeof item.width === "number" ? item.width : Math.abs(a)
      const h = typeof item.height === "number" ? item.height : Math.abs(d)
      tokens.push({ text: str, x: vx, y: vy, w: w || 0, h: h || 0 })
    }

    const pageText = tokensToVisualText(tokens)
    pageTexts.push(`--- PAGE ${pageNum} ---\n${pageText}`)
  }

  await doc.destroy()
  return pageTexts.join("\n\n")
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

    /* ---------------- PDF TEXT EXTRACTION (visual order) ---------------- */
    const contractText = await extractVisualTextFromPdf(pdfBuffer)

    if (!contractText || contractText.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract text from PDF. The file may be scanned/image-only." },
        { status: 400 }
      )
    }

    // Add line numbers for GPT reference
    const lines = contractText.split('\n')
    const numberedText = lines.map((line: string, i: number) => `L${i + 1}: ${line}`).join('\n')

    /* ---------------- SYSTEM PROMPT ---------------- */
    const systemPrompt = [
      "You are EVA, a Tennessee real estate transaction coordinator assistant.",
      "You extract structured data from Tennessee REALTORS RF401 Purchase & Sale Agreement contracts.",
      "",
      "CRITICAL BUYER/SELLER IDENTIFICATION RULES:",
      "In the RF401, Section 1 'Purchase and Sale' follows this EXACT pattern:",
      ' Line 1: \"1. Purchase and Sale. For and in consideration...\"',
      ' Line 2: \"[BUYER FULL NAME] (\\\"Buyer\\\") agrees to buy and the\"',
      ' Line 3: \"[SELLER FULL NAME] (\\\"Seller\\\")\"',
      "",
      "LOOK FOR THE KEYWORDS:",
      ' - The name(s) on the SAME LINE as (\\\"Buyer\\\") = buyerNames',
      ' - The name(s) on the SAME LINE as (\\\"Seller\\\") = sellerNames',
      "",
      "The BUYER is the person who 'agrees to buy' - their name is BEFORE the word Buyer in quotes.",
      "The SELLER is the person who sells - their name is BEFORE the word Seller in quotes.",
      "DO NOT SWAP THEM. If the contract says 'Rebekah Tolley (Buyer)' then Rebekah Tolley is the BUYER.",
      "",
      "DO NOT extract listing agents, brokers, or brokerage names as buyers or sellers.",
      "ONLY extract the legal contract parties shown in Section 1.",
      "",
      "Each line in the contract text is prefixed with a line number (L1, L2, etc.).",
      "Use these to locate the correct fields.",
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
      "Here is the full extracted text of the contract (each line prefixed with line number):",
      "---",
      numberedText,
      "---",
      "",
      "Extract the following fields:",
      "- propertyAddress",
      "- buyerNames (array of strings - from the line containing 'Buyer')",
      "- sellerNames (array of strings - from the line containing 'Seller')",
      "- purchasePrice",
      "- earnestMoney",
      "- bindingDate",
      "- closingDate",
      "- inspectionEndDate",
      "- financingContingencyDate",
      "- specialStipulations",
      '- contractType (\"Purchase and Sale Agreement\")',
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
            content: userPrompt
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

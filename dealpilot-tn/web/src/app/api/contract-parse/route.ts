import { NextResponse } from "next/server"
import { getResolvedPDFJS } from "unpdf"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Severity = "error" | "warning" | "info"

export type RF401Fields = {
  // Section 1 – Property & Parties
  buyerNames: string[]
  sellerNames: string[]
  propertyAddress: string | null
  city: string | null
  zip: string | null
  county: string | null
  deedBook: string | null
  deedPage: string | null
  instrumentNumber: string | null
  itemsRemaining: string | null
  itemsNotRemaining: string | null
  leasedItems: string | null

  // Section 2 – Purchase Price & Financing
  purchasePrice: number | null
  purchasePriceWritten: string | null
  loanType: string | null
  financingPercent: number | null
  financingContingencyWaived: boolean | null
  proofOfFundsDays: number | null
  appraisalContingency: "1" | "2" | "none" | null

  // Section 3 – Earnest Money
  earnestMoneyDueDays: number | null
  earnestMoneyHolder: string | null
  earnestMoneyHolderAddress: string | null
  earnestMoney: number | null
  earnestMoneyPaymentMethod: string | null

  // Section 4 – Closing Date & Possession
  closingDateDay: string | null
  closingDateMonth: string | null
  closingDateYear: string | null
  closingDate: string | null
  possessionType: string | null

  // Section 4D – Special Assessments
  specialAssessments: string | null

  // Section 4E – Warranties Transfer
  warrantiesTransfer: boolean | null

  // Section 4F – Association Fees
  associationFees: string | null

  // Section 4G – Closing Agencies
  buyerClosingAgency: string | null
  buyerClosingAgencyAddress: string | null
  buyerClosingAgencyPhone: string | null
  sellerClosingAgency: string | null
  sellerClosingAgencyAddress: string | null
  sellerClosingAgencyPhone: string | null

  // Section 4H – Title Expenses
  titleExpenses: string | null

  // Section 5 – Title & Conveyance
  deedNames: string | null

  // Section 6 – Lead Based Paint
  leadBasedPaintApplies: boolean | null

  // Section 7 – Inspections
  inspectionPeriodDays: number | null
  resolutionPeriodDays: number | null
  finalInspectionDaysBefore: number | null
  inspectionWaived: boolean | null

  // Section 8 – Home Protection Plan
  homeProtectionPlan: boolean | null
  homeProtectionPlanAmount: number | null
  homeProtectionPlanProvider: string | null
  homeProtectionPlanOrderedBy: string | null
  homeProtectionPlanWaived: boolean | null

  // Section 17 – Binding Date (CRITICAL – seller acceptance date on last page)
  bindingDate: string | null

  // Section 20 – Exhibits and Addenda
  exhibitsAndAddenda: string | null

  // Section 21 – Special Stipulations
  specialStipulations: string | null

  // Section 22 – Time Limit of Offer
  offerExpirationTime: string | null
  offerExpirationDate: string | null

  // Signature Page
  buyerSignatureDate: string | null
  sellerAcceptanceDate: string | null
  sellerResponse: string | null
  buyingFirm: string | null
  buyingFirmAddress: string | null
  buyingFirmLicenseNo: string | null
  buyingFirmPhone: string | null
  listingFirm: string | null
  listingFirmAddress: string | null
  listingFirmLicenseNo: string | null
  listingFirmPhone: string | null
  buyingLicensee: string | null
  buyingLicenseeNumber: string | null
  buyingLicenseeEmail: string | null
  buyingLicenseeCellphone: string | null
  listingLicensee: string | null
  listingLicenseeNumber: string | null
  listingLicenseeEmail: string | null
  hoaCoaPropertyManagementCompany: string | null
  hoaCoaPhone: string | null
  hoaCoaEmail: string | null

  // Legacy / generic fields kept for backward compat
  contractType: "buyer" | "seller" | "unknown"
  formType: string | null
}

export type ParsedContractPayload = {
  fields: RF401Fields
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

/* ---- coordinate-based visual text extraction via unpdf ---- */

type PositionedToken = {
  text: string
  x: number
  y: number
  w: number
  h: number
}

function tokensToVisualText(tokens: PositionedToken[]): string {
  if (!tokens.length) return ""

  const sorted = [...tokens].sort((a, b) => {
    const dy = b.y - a.y
    if (Math.abs(dy) > 1.5) return dy
    return a.x - b.x
  })

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

  lines.sort((a, b) => b.y - a.y)

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
  const pdfjs = await getResolvedPDFJS()
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) })
  const doc = await loadingTask.promise
  const pageCount = doc.numPages
  const pageTexts: string[] = []

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await doc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.0 })
    const textContent = await page.getTextContent()

    const tokens: PositionedToken[] = []
    for (const item of textContent.items as any[]) {
      const str = (item.str ?? "").toString()
      if (!str.trim()) continue
      const tx = item.transform
      if (!tx || tx.length < 6) continue
      const vt = viewport.transform
      const vx = vt[0] * tx[4] + vt[2] * tx[5] + vt[4]
      const vy = vt[1] * tx[4] + vt[3] * tx[5] + vt[5]
      const w = typeof item.width === "number" ? item.width : Math.abs(tx[0])
      const h = typeof item.height === "number" ? item.height : Math.abs(tx[3])
      tokens.push({ text: str, x: vx, y: vy, w: w || 0, h: h || 0 })
    }

    const pageText = tokensToVisualText(tokens)
    pageTexts.push(`--- PAGE ${pageNum} ---\n${pageText}`)
  }

  await doc.destroy()
  return pageTexts.join("\n\n")
}

/** Raw PDF text in visual reading order (for generic / non-RF401 extraction). */
export async function extractPdfTextFromBase64(fileBase64: string): Promise<string> {
  const pdfBuffer = base64ToBuffer(fileBase64)
  return extractVisualTextFromPdf(pdfBuffer)
}

/** Full RF401-style structured extraction (same logic as POST /api/contract-parse). */
export async function parseContractPdfFromBase64(fileBase64: string): Promise<ParsedContractPayload> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY")
  }

  // Strip data URI prefix if present, then re-attach for OpenAI file attachment
  const b64Clean = fileBase64.includes(",") ? fileBase64.split(",").pop() || "" : fileBase64
  const fileData = `data:application/pdf;base64,${b64Clean}`

  /* ---------------- SYSTEM PROMPT ---------------- */
  const systemPrompt = [
    "You are a Tennessee real estate transaction coordinator assistant.",
    "You extract structured data from Tennessee REALTORS contracts.",
    "You can parse: RF401 (Purchase & Sale), RF403 (New Construction), RF404 (Lot/Land),",
    "RF651 (Counter Offer), RF653 (Amendment), RF621 (Addendum).",
    "Auto-detect the form type from the PDF header.",
    "For RF401/RF403/RF404 extract ALL fields listed in the schema.",
    "For RF651/RF653/RF621 extract only modified fields.",
    "",
    "CRITICAL BUYER/SELLER IDENTIFICATION RULES:",
    "In the RF401, Section 1 'Purchase and Sale' follows this EXACT pattern:",
    '  Line 1: "1. Purchase and Sale. For and in consideration..."',
    '  Line 2: "[BUYER FULL NAME] (\\"Buyer\\") agrees to buy and the"',
    '  Line 3: "[SELLER FULL NAME] (\\"Seller\\")"',
    "LOOK FOR THE KEYWORDS:",
    '  - Name(s) on the SAME LINE as (\\"Buyer\\") = buyerNames',
    '  - Name(s) on the SAME LINE as (\\"Seller\\") = sellerNames',
    "The BUYER is the person who 'agrees to buy' — their name is BEFORE the word Buyer in quotes.",
    "The SELLER is the person who sells — their name is BEFORE the word Seller in quotes.",
    "DO NOT SWAP THEM. DO NOT extract listing agents, brokers, or brokerage names as buyers or sellers.",
    "ONLY extract the legal contract parties shown in Section 1.",
    "",
    "BINDING DATE RULE (CRITICAL):",
    "bindingDate is the date written next to the SELLER signature block on the LAST PAGE.",
    "It is NOT the buyer offer date. It is the date the seller accepted/signed.",
    "Look for a line near 'SELLER' or 'Seller accepts' with a date like '4/1/2026' or 'April 1, 2026'.",
    "Format as YYYY-MM-DD.",
    "",
    "SPECIAL STIPULATIONS:",
    "Capture the COMPLETE text of all stipulations entered after",
    "'The following Special Stipulations...' — these may span many blank lines.",
    "",
    "CHECKBOXES:",
    "When a checkbox field is checked (X or checkmark), set the boolean to true.",
    "When unchecked or absent, set to false or null.",
    "",
    "FIELD-BY-FIELD LOCATION GUIDE (use these exact locations):",
    "",
    "loanType (Section 2A checkboxes):",
    "  Look for a group of checkboxes in Section 2. Each option has a box followed by a label.",
    "  Find the checkbox that is CHECKED (contains X, ✓, or similar mark).",
    "  Map the checked label to: 'Conventional' | 'FHA' | 'VA' | 'USDA' | 'Cash' | 'Other'.",
    "  If the loan option says 'Cash' or 'all cash', return 'Cash'.",
    "  If 'FHA Loan' is checked, return 'FHA'. If 'VA Loan', return 'VA'. Etc.",
    "",
    "earnestMoney (Section 3):",
    "  Look for the phrase 'Earnest Money deposit of $' followed by a blank or filled amount.",
    "  Extract the number only — strip dollar signs and commas.",
    "  Return as a number, e.g. 3500 (not '$3,500.00').",
    "",
    "closingDate (Section 4A):",
    "  The closing date is split across THREE separate blanks: day, month, year.",
    "  Look for a sentence like 'this Agreement shall expire at 11:59 pm on the ___ day of ___, ___'",
    "  or 'Closing shall occur on or before the ___ day of ___, ___'.",
    "  Combine all three parts into YYYY-MM-DD format.",
    "  Also set closingDateDay, closingDateMonth, closingDateYear separately.",
    "  Example: day=30, month=April, year=2026 → closingDate='2026-04-30'.",
    "",
    "inspectionPeriodDays (Section 7 / labeled 8D on some versions):",
    "  Look for a phrase like 'Within ___ days after the Binding Agreement Date (Inspection Period)'.",
    "  Extract the number from that blank. Return as an integer.",
    "",
    "bindingDate (LAST PAGE — Seller acceptance date):",
    "  This is the date the SELLER signed/accepted — found on the LAST PAGE of the document.",
    "  Look for a block near 'SELLER' or 'Seller accepts this Agreement' with a date beside it.",
    "  This date is typically LATER than or equal to the buyer offer date.",
    "  The buyer offer date (near 'BUYER' on the last page) is NOT the binding date.",
    "  If you see two dates on the signature page, the SELLER date = bindingDate.",
    "  Example: buyer signed 4/14/2026, seller signed 4/1/2026 → bindingDate = '2026-04-01'.",
    "  Format as YYYY-MM-DD.",
    "",
    "EXHIBITS AND ADDENDA:",
    "Look for blank lines after 'All exhibits and/or addenda attached hereto, listed below'",
    "and capture every line of text entered there.",
    "",
    "Return ONLY valid JSON matching the requested schema.",
    "Use null for any field not found or not applicable.",
    "Arrays default to [].",
    "Dates formatted YYYY-MM-DD.",
    "Currency as numbers without dollar signs or commas.",
  ].join("\n")

  /* ---------------- USER PROMPT ---------------- */
  const userPrompt = [
    "Analyze the attached Tennessee REALTORS contract PDF. First identify the form type, then extract every field.",
    "",
    "Return a single JSON object with this exact structure:",
    "{",
    '  "fields": {',
    "",
    "    // SECTION 1 – Property & Parties",
    '    "buyerNames": [],            // array of buyer full names from the line containing ("Buyer")',
    '    "sellerNames": [],           // array of seller full names from the line containing ("Seller")',
    '    "propertyAddress": null,     // street address of property',
    '    "city": null,',
    '    "zip": null,',
    '    "county": null,',
    '    "deedBook": null,            // deed book number if shown',
    '    "deedPage": null,            // deed page number if shown',
    '    "instrumentNumber": null,    // instrument/document number if shown',
    '    "itemsRemaining": null,      // personal property items that convey (remain)',
    '    "itemsNotRemaining": null,   // personal property items excluded (not remaining)',
    '    "leasedItems": null,         // any leased items noted',
    "",
    "    // SECTION 2 – Purchase Price & Financing",
    '    "purchasePrice": null,       // numeric, e.g. 425000',
    '    "purchasePriceWritten": null,// written-out price, e.g. "Four Hundred Twenty-Five Thousand"',
    '    "loanType": null,            // "FHA" | "VA" | "Conventional" | "USDA" | "Other" | "Cash" — from Section 2A checkboxes; find the CHECKED box',
    '    "financingPercent": null,    // loan-to-value percent, e.g. 80',
    '    "financingContingencyWaived": null, // true if financing contingency is waived',
    '    "proofOfFundsDays": null,    // days to provide proof of funds (if waived)',
    '    "appraisalContingency": null,// "1" | "2" | "none" — which appraisal option is selected',
    "",
    "    // SECTION 3 – Earnest Money",
    '    "earnestMoneyDueDays": null, // days after binding date earnest money is due',
    '    "earnestMoneyHolder": null,  // name of entity holding earnest money',
    '    "earnestMoneyHolderAddress": null,',
    '    "earnestMoney": null,        // numeric amount from Section 3 "Earnest Money deposit of $___" — strip $ and commas',
    '    "earnestMoneyPaymentMethod": null, // "check" | "wire" | other',
    "",
    "    // SECTION 4 – Closing Date & Possession",
    '    "closingDateDay": null,      // day number as string, e.g. "15"',
    '    "closingDateMonth": null,    // month name, e.g. "May"',
    '    "closingDateYear": null,     // four-digit year as string, e.g. "2026"',
    '    "closingDate": null,         // combine closingDateDay+Month+Year → YYYY-MM-DD (three separate blanks in Section 4A)',
    '    "possessionType": null,      // "at closing" | "temporary occupancy" | other',
    "",
    "    // SECTION 4D – Special Assessments",
    '    "specialAssessments": null,  // text of any special assessments (lines 222-223)',
    "",
    "    // SECTION 4E – Warranties Transfer",
    '    "warrantiesTransfer": null,  // true if buyer elected to receive warranties',
    "",
    "    // SECTION 4F – Association Fees",
    '    "associationFees": null,     // any HOA/COA fee text noted',
    "",
    "    // SECTION 4G – Closing Agencies",
    '    "buyerClosingAgency": null,',
    '    "buyerClosingAgencyAddress": null,',
    '    "buyerClosingAgencyPhone": null,',
    '    "sellerClosingAgency": null,',
    '    "sellerClosingAgencyAddress": null,',
    '    "sellerClosingAgencyPhone": null,',
    "",
    "    // SECTION 4H – Title Expenses",
    '    "titleExpenses": null,       // any modifications, e.g. "Seller to pay up to $X towards closings"',
    "",
    "    // SECTION 5 – Title & Conveyance",
    '    "deedNames": null,           // names to appear on deed',
    "",
    "    // SECTION 6 – Lead Based Paint",
    '    "leadBasedPaintApplies": null, // true if property built before 1978 (checkbox checked)',
    "",
    "    // SECTION 7 – Inspections",
    '    "inspectionPeriodDays": null, // integer from "Within ___ days after the Binding Agreement Date (Inspection Period)" in Section 7',
    '    "resolutionPeriodDays": null,',
    '    "finalInspectionDaysBefore": null, // days before closing for final inspection',
    '    "inspectionWaived": null,    // true if inspection waived',
    "",
    "    // SECTION 8 – Home Protection Plan (lines 421-426)",
    '    "homeProtectionPlan": null,  // true if home protection plan is included',
    '    "homeProtectionPlanAmount": null,',
    '    "homeProtectionPlanProvider": null,',
    '    "homeProtectionPlanOrderedBy": null, // "Buyer" | "Seller" | other',
    '    "homeProtectionPlanWaived": null, // true if "Home Protection Plan waived" checkbox is checked',
    "",
    "    // SECTION 17 – Binding Date (CRITICAL)",
    '    "bindingDate": null,         // YYYY-MM-DD — SELLER acceptance date on LAST PAGE only (NOT buyer offer date; if seller signed 4/1/2026, use that)',
    "",
    "    // SECTION 20 – Exhibits and Addenda (lines 502-507)",
    '    "exhibitsAndAddenda": null,  // full text of all exhibits/addenda listed',
    "",
    "    // SECTION 21 – Special Stipulations (line 508+)",
    '    "specialStipulations": null, // COMPLETE text of ALL stipulations — capture every line',
    "",
    "    // SECTION 22 – Time Limit of Offer",
    '    "offerExpirationTime": null, // e.g. "5:00 PM"',
    '    "offerExpirationDate": null, // YYYY-MM-DD',
    "",
    "    // Signature Page",
    '    "buyerSignatureDate": null,  // YYYY-MM-DD — date buyer signed offer',
    '    "sellerAcceptanceDate": null,// YYYY-MM-DD — same as bindingDate',
    '    "sellerResponse": null,      // "accepts" | "counters" | "rejects"',
    '    "buyingFirm": null,',
    '    "buyingFirmAddress": null,',
    '    "buyingFirmLicenseNo": null,',
    '    "buyingFirmPhone": null,',
    '    "listingFirm": null,',
    '    "listingFirmAddress": null,',
    '    "listingFirmLicenseNo": null,',
    '    "listingFirmPhone": null,',
    '    "buyingLicensee": null,      // buying agent full name',
    '    "buyingLicenseeNumber": null,',
    '    "buyingLicenseeEmail": null,',
    '    "buyingLicenseeCellphone": null,',
    '    "listingLicensee": null,     // listing agent full name',
    '    "listingLicenseeNumber": null,',
    '    "listingLicenseeEmail": null,',
    '    "hoaCoaPropertyManagementCompany": null,',
    '    "hoaCoaPhone": null,',
    '    "hoaCoaEmail": null,',
    "",
    "    // Legacy",
    '    "contractType": "buyer",     // always "buyer" for RF401',
    '    "formType": null             // detected form type, e.g. "RF401"',
    "  },",
    '  "issues": [',
    "    // { field, severity: \"error\"|\"warning\"|\"info\", message, section }",
    "    // Flag missing critical fields: bindingDate, closingDate, purchasePrice,",
    "    // earnestMoney, buyerNames, sellerNames, propertyAddress",
    "  ],",
    '  "timeline": [',
    "    // { label, date (YYYY-MM-DD or null), status: \"pending\"|\"complete\" }",
    "    // Include: Contract Executed (bindingDate), Earnest Money Due,",
    "    //          Inspection Period Ends, Financing Contingency Deadline, Closing Date",
    "  ]",
    "}",
  ].join("\n")

  /* ---------------- OPENAI CALL ---------------- */
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "file",
              file: {
                filename: "contract.pdf",
                file_data: fileData,
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
    }),
  })

  if (!openaiRes.ok) {
    const err = await openaiRes.text()
    throw new Error(`OpenAI request failed: ${err}`)
  }

  const completion = await openaiRes.json()
  const raw = completion?.choices?.[0]?.message?.content
  if (!raw) {
    throw new Error("OpenAI returned empty response")
  }

  let parsed: ParsedContractPayload
  try {
    parsed = JSON.parse(cleanJsonFromText(raw))
  } catch {
    throw new Error("Failed to parse AI JSON")
  }

  return parsed
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const fileBase64 = body?.file
    if (!fileBase64) {
      return NextResponse.json(
        { error: "No PDF provided in body.file" },
        { status: 400 }
      )
    }

    const parsed = await parseContractPdfFromBase64(fileBase64)
    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error("Contract parse error:", error?.message, error?.stack)
    const msg = error?.message || "Contract parsing failed"
    return NextResponse.json(
      { error: msg.includes("parse") ? msg : "Contract parsing failed", details: msg },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { priceToWords } from '@/lib/rf401/priceToWords'

const SCALE = 72 / 150 // PDF points per pixel at 150 DPI

function formatCurrency(val: string | number | null): string {
  if (!val) return ''
  const n = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val
  return isNaN(n) ? '' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(val: string | null): { day: string; month: string; year: string } {
  if (!val) return { day: '', month: '', year: '' }
  const d = new Date(val)
  return {
    day: String(d.getUTCDate()),
    month: d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }),
    year: String(d.getUTCFullYear()),
  }
}

interface FieldEntry {
  fieldId: string
  page: number
  x: number
  y: number
  type: 'text' | 'checkbox'
  fontSize: number
  maxWidth: number
}

const FIELD_COORDS: FieldEntry[] = [
  // ─── PAGE 1 ───
  { fieldId: 'buyer_1_name',           page: 1,  x: 153,  y: 357,  type: 'text',     fontSize: 9, maxWidth: 380 },
  { fieldId: 'buyer_2_name',           page: 1,  x: 586,  y: 358,  type: 'text',     fontSize: 9, maxWidth: 380 },
  { fieldId: 'seller_1_name',          page: 1,  x: 316,  y: 384,  type: 'text',     fontSize: 9, maxWidth: 260 },
  { fieldId: 'seller_2_name',          page: 1,  x: 694,  y: 386,  type: 'text',     fontSize: 9, maxWidth: 380 },
  { fieldId: 'property_address',       page: 1,  x: 418,  y: 432,  type: 'text',     fontSize: 9, maxWidth: 600 },
  { fieldId: 'property_city',          page: 1,  x: 249,  y: 457,  type: 'text',     fontSize: 9, maxWidth: 280 },
  { fieldId: 'property_zip',           page: 1,  x: 846,  y: 457,  type: 'text',     fontSize: 9, maxWidth: 120 },
  { fieldId: 'property_county',        page: 1,  x: 152,  y: 480,  type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'deed_book',              page: 1,  x: 763,  y: 480,  type: 'text',     fontSize: 9, maxWidth: 100 },
  { fieldId: 'deed_pages',             page: 1,  x: 992,  y: 480,  type: 'text',     fontSize: 9, maxWidth: 100 },
  { fieldId: 'instrument_number',      page: 1,  x: 216,  y: 503,  type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'garage_remotes',         page: 1,  x: 1114, y: 673,  type: 'text',     fontSize: 9, maxWidth: 40  },
  { fieldId: 'items_remaining',        page: 1,  x: 153,  y: 869,  type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'items_not_remaining',    page: 1,  x: 153,  y: 943,  type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'leased_items',           page: 1,  x: 282,  y: 1018, type: 'text',     fontSize: 9, maxWidth: 600 },
  { fieldId: 'purchase_price_numeric', page: 1,  x: 955,  y: 1272, type: 'text',     fontSize: 9, maxWidth: 280 },
  { fieldId: 'purchase_price_words',   page: 1,  x: 153,  y: 1295, type: 'text',     fontSize: 9, maxWidth: 700 },
  { fieldId: 'ltv_percentage',         page: 1,  x: 514,  y: 1446, type: 'text',     fontSize: 9, maxWidth: 60  },

  // ─── PAGE 2 ───
  { fieldId: 'loan_conventional_chk',  page: 2,  x: 193,  y: 300,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'loan_fha_chk',           page: 2,  x: 605,  y: 300,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'loan_va_chk',            page: 2,  x: 194,  y: 327,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'loan_usda_chk',          page: 2,  x: 605,  y: 327,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'financing_waived_chk',   page: 2,  x: 118,  y: 1062, type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'appraisal_not_chk',      page: 2,  x: 195,  y: 1479, type: 'checkbox', fontSize: 9, maxWidth: 20  },

  // ─── PAGE 3 ───
  { fieldId: 'appraisal_contingent_chk', page: 3, x: 194, y: 178,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'title_expenses',          page: 3,  x: 231,  y: 1178, type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'closing_cost_mod',        page: 3,  x: 150,  y: 1347, type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'closing_agency_buyer',    page: 3,  x: 600,  y: 1444, type: 'text',     fontSize: 9, maxWidth: 500 },

  // ─── PAGE 4 ───
  { fieldId: 'closing_agency_seller',   page: 4,  x: 603,  y: 131,  type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'earnest_days',            page: 4,  x: 711,  y: 196,  type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'earnest_holder_name',     page: 4,  x: 154,  y: 217,  type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'earnest_holder_address',  page: 4,  x: 154,  y: 242,  type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'earnest_amount',          page: 4,  x: 433,  y: 265,  type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'closing_day',             page: 4,  x: 1030, y: 1024, type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'closing_month',           page: 4,  x: 191,  y: 1050, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'closing_year',            page: 4,  x: 465,  y: 1050, type: 'text',     fontSize: 9, maxWidth: 80  },
  { fieldId: 'possession_at_closing_chk', page: 4, x: 232, y: 1192, type: 'checkbox', fontSize: 9, maxWidth: 20  },

  // ─── PAGE 5 ───
  { fieldId: 'deed_names',             page: 5,  x: 452,  y: 1246, type: 'text',     fontSize: 9, maxWidth: 500 },

  // ─── PAGE 6 ───
  { fieldId: 'lbp_not_apply_chk',      page: 6,  x: 156,  y: 306,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'lbp_applies_chk',        page: 6,  x: 383,  y: 306,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'inspection_period_days', page: 6,  x: 563,  y: 1114, type: 'text',     fontSize: 9, maxWidth: 60  },

  // ─── PAGE 7 ───
  { fieldId: 'resolution_period_days', page: 7,  x: 886,  y: 206,  type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'final_inspection_days',  page: 7,  x: 492,  y: 1014, type: 'text',     fontSize: 9, maxWidth: 60  },

  // ─── PAGE 8 ───
  { fieldId: 'hpp_waived_chk',         page: 8,  x: 157,  y: 1401, type: 'checkbox', fontSize: 9, maxWidth: 20  },

  // ─── PAGE 10 ───
  { fieldId: 'exhibits_addenda',       page: 10, x: 313,  y: 721,  type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'special_stipulations',   page: 10, x: 152,  y: 875,  type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'offer_exp_time',         page: 10, x: 329,  y: 1335, type: 'text',     fontSize: 9, maxWidth: 80  },
  { fieldId: 'offer_exp_day',          page: 10, x: 690,  y: 1334, type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'offer_exp_month_year',   page: 10, x: 823,  y: 1334, type: 'text',     fontSize: 9, maxWidth: 200 },

  // ─── PAGE 11 ───
  { fieldId: 'buying_firm_name',       page: 11, x: 757,  y: 1043, type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'buying_firm_address',    page: 11, x: 831,  y: 1066, type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'buying_firm_license',    page: 11, x: 799,  y: 1090, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'buying_firm_phone',      page: 11, x: 821,  y: 1114, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'buying_licensee_name',   page: 11, x: 791,  y: 1138, type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'buying_licensee_number', page: 11, x: 869,  y: 1163, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'buying_licensee_email',  page: 11, x: 778,  y: 1186, type: 'text',     fontSize: 9, maxWidth: 400 },
]

export async function GET(
  req: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    console.log('RF401 generate called for transactionId:', params.transactionId)
    console.log('PDF path:', path.join(process.cwd(), 'public', 'forms', 'rf401-blank.pdf'))
    const fs2 = await import('fs')
    console.log('PDF exists:', fs2.existsSync(path.join(process.cwd(), 'public', 'forms', 'rf401-blank.pdf')))
  const transactionId = parseInt(params.transactionId, 10)
  if (isNaN(transactionId)) {
    return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 })
  }

  const { data: tx, error } = await supabase
    .from('transactions')
    .select(
      'user_id, client, seller_name, address, property_city, property_zip, property_county, county, purchase_price, earnest_money, earnest_money_holder, earnest_money_days, loan_type, loan_percentage, closing_date, inspection_period_days, resolution_period_days, special_stipulations, closing_agency_buyer, closing_agency_seller, deed_names, items_remaining, items_not_remaining, leased_items, appraisal_contingent, financing_contingency_waived, lead_based_paint, rf401_wizard'
    )
    .eq('id', transactionId)
    .single()

  if (error || !tx) {
    console.error('RF401 Supabase error:', JSON.stringify(error))
    return NextResponse.json({ error: 'Transaction not found', detail: error?.message }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone, license_number, brokerage_name, brokerage_address, brokerage_phone, brokerage_license')
    .eq('id', tx.user_id)
    .single()

  const closingDate = formatDate(tx.closing_date)
  const loanType: string = (tx.loan_type || '').toLowerCase()
  const isCash = loanType === 'cash'

  const wizRaw = (tx as { rf401_wizard?: unknown }).rf401_wizard
  const wiz =
    typeof wizRaw === 'object' && wizRaw !== null && !Array.isArray(wizRaw)
      ? (wizRaw as Record<string, unknown>)
      : {}

  const str = (k: string) => (typeof wiz[k] === 'string' ? (wiz[k] as string) : '')
  const wordsOverride = str('purchase_price_words').trim()
  const possession = str('possession')
  const atClosing = possession !== 'temporary_occupancy'

  const furtherLegal = str('further_legal_description').trim()
  const stipBase = tx.special_stipulations || ''
  const stipWithLegal = furtherLegal
    ? [stipBase, `Further legal description: ${furtherLegal}`].filter(Boolean).join('\n\n')
    : stipBase

  let leasedLine = tx.leased_items || ''
  if (wiz.buyer_declines_leased_assumption === true) {
    const cancel = str('leased_item_to_cancel').trim()
    const clause = cancel
      ? `Buyer does not wish to assume leased item(s). Item(s) to be cancelled: ${cancel}.`
      : 'Buyer does not wish to assume leased item(s).'
    leasedLine = [leasedLine, clause].filter(Boolean).join(' ')
  }

  const fieldValues: Record<string, string | boolean> = {
    buyer_1_name:              tx.client || '',
    buyer_2_name:              '',
    seller_1_name:             tx.seller_name || '',
    seller_2_name:             '',
    property_address:          tx.address || '',
    property_city:             tx.property_city || '',
    property_zip:              tx.property_zip || '',
    property_county:           tx.property_county || tx.county || '',
    deed_book:                 str('deed_book'),
    deed_pages:                str('deed_page'),
    instrument_number:         str('instrument_number'),
    garage_remotes:            str('garage_remotes') || '2',
    items_remaining:           tx.items_remaining || '',
    items_not_remaining:       tx.items_not_remaining || '',
    leased_items:              leasedLine,
    purchase_price_numeric:    formatCurrency(tx.purchase_price),
    purchase_price_words:      wordsOverride || priceToWords(tx.purchase_price),
    ltv_percentage:            tx.loan_percentage ? String(tx.loan_percentage) : '',
    loan_conventional_chk:     loanType === 'conventional',
    loan_fha_chk:              loanType === 'fha',
    loan_va_chk:               loanType === 'va',
    loan_usda_chk:             loanType === 'usda' || loanType === 'rural development',
    financing_waived_chk:      tx.financing_contingency_waived === true || isCash,
    appraisal_not_chk:          tx.appraisal_contingent === false,
    appraisal_contingent_chk:  tx.appraisal_contingent === true,
    closing_cost_mod:          '',
    closing_agency_buyer:      tx.closing_agency_buyer || '',
    closing_agency_seller:     tx.closing_agency_seller || '',
    earnest_days:              tx.earnest_money_days ? String(tx.earnest_money_days) : '3',
    earnest_holder_name:       tx.earnest_money_holder || '',
    earnest_holder_address:    '',
    earnest_amount:            formatCurrency(tx.earnest_money),
    closing_day:               closingDate.day,
    closing_month:             closingDate.month,
    closing_year:              closingDate.year,
    possession_at_closing_chk: atClosing,
    deed_names:                tx.deed_names || tx.client || '',
    lbp_not_apply_chk:         tx.lead_based_paint !== true,
    lbp_applies_chk:           tx.lead_based_paint === true,
    inspection_period_days:    tx.inspection_period_days ? String(tx.inspection_period_days) : '15',
    resolution_period_days:    tx.resolution_period_days ? String(tx.resolution_period_days) : '3',
    hpp_waived_chk:            true,
    exhibits_addenda:          '',
    special_stipulations:      stipWithLegal,
    offer_exp_time:            '',
    offer_exp_day:             '',
    offer_exp_month_year:      '',
    buying_firm_name:          profile?.brokerage_name || '',
    buying_firm_address:       profile?.brokerage_address || '',
    buying_firm_license:       profile?.brokerage_license || '',
    buying_firm_phone:         profile?.brokerage_phone || '',
    buying_licensee_name:      profile?.full_name || '',
    buying_licensee_number:    profile?.license_number || '',
    buying_licensee_email:     profile?.email || '',
  }

  console.log('RF401 fieldValues sample:', {
    buyer_1_name: fieldValues.buyer_1_name,
    seller_1_name: fieldValues.seller_1_name,
    property_city: fieldValues.property_city,
    purchase_price_numeric: fieldValues.purchase_price_numeric,
  })

  const pdfPath = path.join(process.cwd(), 'public', 'forms', 'rf401-blank.pdf')
  const pdfBytes = fs.readFileSync(pdfPath)
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  for (const field of FIELD_COORDS) {
    const page = pages[field.page - 1]
    if (!page) continue
    const { height } = page.getSize()
    const pdfX = field.x * SCALE
    const pdfY = height - (field.y * SCALE)
    const value = fieldValues[field.fieldId]

    if (field.type === 'checkbox') {
      if (value === true) {
        page.drawText('X', {
          x: pdfX,
          y: pdfY,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        })
      }
    } else {
      if (value && String(value).trim()) {
        page.drawText(String(value), {
          x: pdfX,
          y: pdfY,
          size: field.fontSize,
          font,
          color: rgb(0, 0, 0),
          maxWidth: field.maxWidth * SCALE,
        })
      }
    }
  }

  const filledBytes = await pdfDoc.save()
  const filename = `RF401-${tx.address?.replace(/\s+/g, '-') || transactionId}-${new Date().toISOString().slice(0, 10)}.pdf`

  return new NextResponse(filledBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
  } catch (err) {
    console.error('RF401 generate error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

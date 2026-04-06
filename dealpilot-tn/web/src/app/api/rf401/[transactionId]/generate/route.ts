import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

const SCALE = 72 / 150 // PDF points per pixel at 150 DPI

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function numberToWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  if (n === 0) return 'Zero'
  if (n < 20) return ones[n]
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '')
  if (n < 1000000) return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '')
  return numberToWords(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + numberToWords(n % 1000000) : '')
}

function formatCurrency(val: string | number | null): string {
  if (!val) return ''
  const n = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val
  return isNaN(n) ? '' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function priceToWords(val: string | number | null): string {
  if (!val) return ''
  const n = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val
  if (isNaN(n)) return ''
  const dollars = Math.floor(n)
  return numberToWords(dollars) + ' Dollars'
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
  { fieldId: 'buyer_1_name',              page: 1,  x: 190,  y: 352,  type: 'text',     fontSize: 9, maxWidth: 380 },
  { fieldId: 'buyer_2_name',              page: 1,  x: 587,  y: 354,  type: 'text',     fontSize: 9, maxWidth: 380 },
  { fieldId: 'seller_1_name',             page: 1,  x: 350,  y: 376,  type: 'text',     fontSize: 9, maxWidth: 260 },
  { fieldId: 'seller_2_name',             page: 1,  x: 634,  y: 376,  type: 'text',     fontSize: 9, maxWidth: 380 },
  { fieldId: 'property_address',          page: 1,  x: 447,  y: 422,  type: 'text',     fontSize: 9, maxWidth: 600 },
  { fieldId: 'property_city',             page: 1,  x: 323,  y: 448,  type: 'text',     fontSize: 9, maxWidth: 280 },
  { fieldId: 'property_zip',              page: 1,  x: 847,  y: 447,  type: 'text',     fontSize: 9, maxWidth: 120 },
  { fieldId: 'property_county',           page: 1,  x: 77,   y: 472,  type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'deed_book',                 page: 1,  x: 778,  y: 472,  type: 'text',     fontSize: 9, maxWidth: 100 },
  { fieldId: 'deed_pages',                page: 1,  x: 963,  y: 472,  type: 'text',     fontSize: 9, maxWidth: 100 },
  { fieldId: 'instrument_number',         page: 1,  x: 102,  y: 496,  type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'garage_remotes',            page: 1,  x: 1071, y: 611,  type: 'text',     fontSize: 9, maxWidth: 40  },
  { fieldId: 'items_remaining',           page: 1,  x: 204,  y: 759,  type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'items_not_remaining',       page: 1,  x: 204,  y: 814,  type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'leased_items',             page: 1,  x: 455,  y: 860,  type: 'text',     fontSize: 9, maxWidth: 600 },
  { fieldId: 'purchase_price_numeric',   page: 1,  x: 906,  y: 1023, type: 'text',     fontSize: 9, maxWidth: 280 },
  { fieldId: 'purchase_price_words',     page: 1,  x: 191,  y: 1040, type: 'text',     fontSize: 9, maxWidth: 700 },
  { fieldId: 'ltv_percentage',           page: 1,  x: 689,  y: 1089, type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'loan_conventional_chk',    page: 2,  x: 79,   y: 322,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'loan_fha_chk',             page: 2,  x: 612,  y: 322,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'loan_va_chk',              page: 2,  x: 79,   y: 347,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'loan_usda_chk',            page: 2,  x: 612,  y: 347,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'loan_other_text',          page: 2,  x: 200,  y: 372,  type: 'text',     fontSize: 9, maxWidth: 300 },
  { fieldId: 'financing_waived_chk',     page: 2,  x: 79,   y: 1056, type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'cash_proof_method',        page: 2,  x: 191,  y: 1104, type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'appraisal_not_chk',        page: 2,  x: 79,   y: 1200, type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'appraisal_contingent_chk', page: 2,  x: 79,   y: 1287, type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'closing_cost_mod',         page: 3,  x: 191,  y: 924,  type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'closing_agency_buyer',     page: 3,  x: 191,  y: 1469, type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'closing_agency_seller',    page: 4,  x: 191,  y: 99,   type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'earnest_days',             page: 4,  x: 434,  y: 149,  type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'earnest_holder_name',      page: 4,  x: 191,  y: 165,  type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'earnest_holder_address',   page: 4,  x: 191,  y: 198,  type: 'text',     fontSize: 9, maxWidth: 700 },
  { fieldId: 'earnest_amount',           page: 4,  x: 676,  y: 231,  type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'closing_day',              page: 4,  x: 841,  y: 660,  type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'closing_month',            page: 4,  x: 587,  y: 677,  type: 'text',     fontSize: 9, maxWidth: 150 },
  { fieldId: 'closing_year',             page: 4,  x: 740,  y: 677,  type: 'text',     fontSize: 9, maxWidth: 80  },
  { fieldId: 'possession_at_closing_chk',page: 4,  x: 79,   y: 792,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'deed_names',               page: 5,  x: 446,  y: 413,  type: 'text',     fontSize: 9, maxWidth: 600 },
  { fieldId: 'lbp_not_apply_chk',        page: 6,  x: 79,   y: 165,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'lbp_applies_chk',          page: 6,  x: 310,  y: 165,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'inspection_period_days',   page: 6,  x: 536,  y: 495,  type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'resolution_period_days',   page: 6,  x: 841,  y: 677,  type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'hpp_waived_chk',           page: 8,  x: 79,   y: 617,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'exhibits_addenda',         page: 10, x: 191,  y: 248,  type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'special_stipulations',     page: 10, x: 191,  y: 330,  type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'offer_exp_time',           page: 10, x: 446,  y: 809,  type: 'text',     fontSize: 9, maxWidth: 80  },
  { fieldId: 'offer_exp_day',            page: 10, x: 750,  y: 830,  type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'offer_exp_month_year',     page: 10, x: 848,  y: 830,  type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'buying_firm_name',         page: 11, x: 612,  y: 1073, type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'buying_firm_address',      page: 11, x: 612,  y: 1106, type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'buying_firm_license',      page: 11, x: 612,  y: 1139, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'buying_firm_phone',        page: 11, x: 612,  y: 1172, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'buying_licensee_name',     page: 11, x: 612,  y: 1205, type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'buying_licensee_number',   page: 11, x: 612,  y: 1238, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'buying_licensee_email',    page: 11, x: 612,  y: 1271, type: 'text',     fontSize: 9, maxWidth: 400 },
]

export async function GET(
  req: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  const transactionId = parseInt(params.transactionId, 10)
  if (isNaN(transactionId)) {
    return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 })
  }

  const { data: tx, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (error || !tx) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .eq('id', tx.user_id)
    .select('full_name, email, phone, license_number, brokerage_name, brokerage_address, brokerage_phone, brokerage_license')
    .single()

  const closingDate = formatDate(tx.closing_date)
  const loanType: string = (tx.loan_type || '').toLowerCase()
  const isCash = loanType === 'cash'
  const yearBuilt = tx.year_built ? parseInt(tx.year_built) : 9999

  const fieldValues: Record<string, string | boolean> = {
    buyer_1_name:              tx.buyer_name || '',
    buyer_2_name:              tx.buyer_2_name || '',
    seller_1_name:             tx.seller_name || '',
    seller_2_name:             tx.seller_2_name || '',
    property_address:          tx.address || '',
    property_city:             tx.city || '',
    property_zip:              tx.zip || '',
    property_county:           tx.county || '',
    deed_book:                 tx.deed_book || '',
    deed_pages:                tx.deed_pages || '',
    instrument_number:         tx.instrument_number || '',
    garage_remotes:            tx.garage_remotes ? String(tx.garage_remotes) : '2',
    items_remaining:           tx.items_remaining || '',
    items_not_remaining:       tx.items_not_remaining || '',
    leased_items:              tx.leased_items || '',
    purchase_price_numeric:    formatCurrency(tx.purchase_price),
    purchase_price_words:      priceToWords(tx.purchase_price),
    ltv_percentage:            tx.ltv_percentage ? String(tx.ltv_percentage) : '',
    loan_conventional_chk:     loanType === 'conventional',
    loan_fha_chk:              loanType === 'fha',
    loan_va_chk:               loanType === 'va',
    loan_usda_chk:             loanType === 'usda' || loanType === 'rural development',
    financing_waived_chk:      isCash,
    appraisal_not_chk:         tx.appraisal_contingent === false,
    appraisal_contingent_chk:  tx.appraisal_contingent === true,
    closing_cost_mod:          tx.seller_closing_cost_contribution || '',
    closing_agency_buyer:      tx.closing_agency || '',
    closing_agency_seller:     tx.closing_agency || '',
    earnest_days:              tx.earnest_money_days ? String(tx.earnest_money_days) : '3',
    earnest_holder_name:       tx.earnest_holder || tx.closing_agency || '',
    earnest_holder_address:    tx.earnest_holder_address || '',
    earnest_amount:            formatCurrency(tx.earnest_amount),
    closing_day:               closingDate.day,
    closing_month:             closingDate.month,
    closing_year:              closingDate.year,
    possession_at_closing_chk: true,
    deed_names:                tx.deed_names || tx.buyer_name || '',
    lbp_not_apply_chk:         yearBuilt >= 1978,
    lbp_applies_chk:           yearBuilt < 1978,
    inspection_period_days:    tx.inspection_period_days ? String(tx.inspection_period_days) : '15',
    resolution_period_days:    tx.resolution_period_days ? String(tx.resolution_period_days) : '3',
    hpp_waived_chk:            true,
    exhibits_addenda:          tx.exhibits_addenda || '',
    special_stipulations:      tx.special_stipulations || '',
    offer_exp_time:            '',
    offer_exp_day:             '',
    offer_exp_month_year:      '',
    buying_firm_name:          profile?.brokerage_name || 'Keller Williams Kingsport',
    buying_firm_address:       profile?.brokerage_address || '105 Ford Avenue',
    buying_firm_license:       profile?.brokerage_license || '261952',
    buying_firm_phone:         profile?.brokerage_phone || '423-247-5510',
    buying_licensee_name:      profile?.full_name || '',
    buying_licensee_number:    profile?.license_number || '',
    buying_licensee_email:     profile?.email || '',
  }

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
        page.drawText('✓', {
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
}

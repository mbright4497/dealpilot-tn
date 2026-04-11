import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { priceToWords } from '@/lib/rf401/priceToWords'
import { FIELD_COORDS, SCALE } from '@/lib/rf401/fieldCoordinates'

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

function formatDateUsShort(val: string | null): string {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return d.toLocaleDateString('en-US', { timeZone: 'UTC' })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const transactionId = parseInt(params.transactionId, 10)
    if (isNaN(transactionId)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 })
    }

    const { data: tx, error } = await supabase
      .from('transactions')
      .select(
        'user_id, client, seller_name, address, property_city, property_zip, property_county, county, purchase_price, earnest_money, earnest_money_holder, earnest_money_days, loan_type, loan_percentage, closing_date, inspection_period_days, resolution_period_days, special_stipulations, closing_agency_buyer, closing_agency_seller, deed_names, items_remaining, items_not_remaining, leased_items, appraisal_contingent, financing_contingency_waived, lead_based_paint, home_warranty, rf401_wizard'
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
    const strRf = (n: number) => str(`rf401_${n}`).trim()
    const boolWiz = (k: string) => {
      const v = wiz[k]
      return v === true || str(k).toLowerCase() === 'true' || str(k).toLowerCase() === 'yes'
    }

    const wordsOverride =
      str('purchase_price_words').trim() || strRf(18)
    const possessionRaw = str('possession').trim()
    const possessionFromRf37 =
      strRf(37) === 'Temporary occupancy agreement' ? 'temporary_occupancy' : ''
    const possession = possessionRaw || possessionFromRf37 || 'at_closing'
    const atClosing = possession !== 'temporary_occupancy'

    const furtherLegal =
      str('further_legal_description').trim() || strRf(10)
    const stipBase = tx.special_stipulations || ''
    const stipWithLegal = stipBase

    const buyerDeclinesLeased =
      wiz.buyer_declines_leased_assumption === true || strRf(15) === 'true'

    const cancelLeaseText =
      str('leased_item_to_cancel').trim() || strRf(16)

    const leasedLine = tx.leased_items || ''

    const itemsRem =
      (tx.items_remaining != null && String(tx.items_remaining).trim() !== ''
        ? String(tx.items_remaining)
        : str('items_remaining').trim()) || ''
    const itemsNotRem =
      (tx.items_not_remaining != null && String(tx.items_not_remaining).trim() !== ''
        ? String(tx.items_not_remaining)
        : str('items_not_remaining').trim()) || ''

    let appraisalContingent: boolean | undefined
    if (!isCash) {
      if (typeof tx.appraisal_contingent === 'boolean') {
        appraisalContingent = tx.appraisal_contingent
      } else {
        const a = str('appraisal_contingent').toLowerCase()
        if (a === 'true' || a === 'yes') appraisalContingent = true
        else if (a === 'false' || a === 'no') appraisalContingent = false
      }
    }

    const expenseModRaw = str('expense_modifications').trim()
    const expenseModLines = expenseModRaw.split(/\r?\n/).map(l => l.trim()).slice(0, 4)
    while (expenseModLines.length < 4) expenseModLines.push('')

    let homeWarrantyAns = str('home_warranty').trim()
    if (!homeWarrantyAns && tx.home_warranty != null) {
      homeWarrantyAns =
        typeof (tx as { home_warranty?: unknown }).home_warranty === 'boolean'
          ? (tx as { home_warranty: boolean }).home_warranty
            ? 'Include — Seller pays'
            : 'Waived'
          : String((tx as { home_warranty?: unknown }).home_warranty)
    }
    const hwLower = homeWarrantyAns.toLowerCase()
    const hppWaived = !homeWarrantyAns || hwLower.includes('waiv')

    const offerExpDateStr = str('offer_exp_date').trim()
    const offerExpParts = offerExpDateStr ? formatDate(offerExpDateStr) : { day: '', month: '', year: '' }
    const offerExpMonthYear =
      offerExpParts.month && offerExpParts.year
        ? `${offerExpParts.month} ${offerExpParts.year}`
        : ''

    const earnestPay = str('earnest_money_payment_method').trim().toLowerCase()
    const earnestOtherMethod =
      earnestPay && earnestPay !== 'check' ? str('earnest_money_other_method').trim() : ''

    const gbRaw = str('greenbelt_status').trim().toLowerCase()
    let greenbelt = ''
    if (gbRaw && !gbRaw.includes('not applicable')) {
      if (gbRaw.includes('does not intend')) greenbelt = 'not_maintain'
      else if (gbRaw.includes('intend')) greenbelt = 'maintain'
    }

    const fieldValues: Record<string, string | boolean> = {
      buyer_1_name:              tx.client || '',
      buyer_2_name:              str('buyer_2_name').trim(),
      seller_1_name:             tx.seller_name || '',
      seller_2_name:             str('seller_2_name').trim(),
      property_address:          (str('property_address').trim() || tx.address || '').trim(),
      property_city:             tx.property_city || '',
      property_zip:              tx.property_zip || '',
      property_county:
        (tx.property_county || tx.county || '').trim() || strRf(6),
      deed_book:                 str('deed_book').trim() || strRf(7),
      deed_pages:                str('deed_page').trim() || str('deed_pages').trim() || strRf(8),
      instrument_number:         str('instrument_number').trim() || strRf(9),
      further_legal_description: furtherLegal,
      garage_remotes:            str('garage_remotes').trim() || strRf(11) || '2',
      items_remaining:           itemsRem,
      items_not_remaining:       itemsNotRem,
      leased_items:              leasedLine,
      buyer_declines_leased_chk: buyerDeclinesLeased,
      leased_item_to_cancel:     buyerDeclinesLeased ? cancelLeaseText : '',
      purchase_price_numeric:    formatCurrency(tx.purchase_price),
      purchase_price_words:      wordsOverride || priceToWords(tx.purchase_price),
      ltv_percentage:            tx.loan_percentage ? String(tx.loan_percentage) : '',
      loan_conventional_chk:     loanType === 'conventional',
      loan_fha_chk:              loanType === 'fha',
      loan_va_chk:               loanType === 'va',
      loan_usda_chk:             loanType === 'usda' || loanType === 'rural development',
      financing_waived_chk:      tx.financing_contingency_waived === true || isCash,
      appraisal_not_chk:         !isCash && appraisalContingent === false,
      appraisal_2c_yes_chk:      !isCash && appraisalContingent === true,
      title_expenses:            str('title_expenses').trim(),
      expense_mod_line1:         expenseModLines[0] || '',
      expense_mod_line2:         expenseModLines[1] || '',
      expense_mod_line3:         expenseModLines[2] || '',
      expense_mod_line4:         expenseModLines[3] || '',
      closing_agency_buyer:      tx.closing_agency_buyer || '',
      earnest_money_other_method: earnestOtherMethod,
      closing_agency_seller:     tx.closing_agency_seller || '',
      earnest_days:              tx.earnest_money_days ? String(tx.earnest_money_days) : '3',
      earnest_holder_name:       tx.earnest_money_holder || '',
      earnest_holder_address:    '',
      earnest_amount:            formatCurrency(tx.earnest_money),
      closing_day:               closingDate.day,
      closing_month:             closingDate.month,
      closing_year:              closingDate.year,
      possession_at_closing_chk: atClosing,
      deed_names:
        (tx.deed_names || tx.client || '').trim() || strRf(40),
      greenbelt_maintain_chk:    greenbelt === 'maintain',
      greenbelt_not_maintain_chk: greenbelt === 'not_maintain',
      lbp_not_apply_chk:         tx.lead_based_paint !== true,
      lbp_applies_chk:           tx.lead_based_paint === true,
      inspection_period_days:    tx.inspection_period_days ? String(tx.inspection_period_days) : '15',
      resolution_period_days:    tx.resolution_period_days ? String(tx.resolution_period_days) : '3',
      waive_repair_request_chk:  boolWiz('waive_repair_request'),
      waive_all_inspections_chk: boolWiz('waive_all_inspections'),
      hpp_waived_chk:            hppWaived,
      hpp_yes_chk:               !hppWaived,
      hpp_paid_by:               hppWaived ? '' : (str('hpp_paid_by').trim() || (hwLower.includes('seller') ? 'Seller' : hwLower.includes('buyer') ? 'Buyer' : '')),
      hpp_amount:                hppWaived ? '' : str('hpp_amount').trim(),
      hpp_provider:              hppWaived ? '' : str('hpp_provider').trim(),
      hpp_ordered_by:            hppWaived ? '' : str('hpp_ordered_by').trim(),
      exhibits_addenda:          str('exhibits_addenda').trim(),
      special_stipulations:      stipWithLegal,
      offer_exp_time:            str('offer_exp_time').trim(),
      offer_exp_day:             offerExpParts.day,
      offer_exp_month_year:      offerExpMonthYear,
      listing_firm_name:         str('listing_firm_name').trim(),
      listing_firm_address:      str('listing_firm_address').trim(),
      listing_firm_license:      str('listing_firm_license').trim(),
      listing_firm_phone:        str('listing_firm_phone').trim(),
      listing_licensee_name:     str('listing_licensee_name').trim(),
      listing_licensee_number:   str('listing_licensee_number').trim(),
      listing_licensee_email:    str('listing_licensee_email').trim(),
      listing_licensee_cell:     str('listing_licensee_cell').trim(),
      buying_firm_name:          str('buying_firm_name').trim() || profile?.brokerage_name || '',
      buying_firm_address:       str('buying_firm_address').trim() || profile?.brokerage_address || '',
      buying_firm_license:       str('buying_firm_license').trim() || profile?.brokerage_license || '',
      buying_firm_phone:         str('buying_firm_phone').trim() || profile?.brokerage_phone || '',
      buying_licensee_name:      str('buying_licensee_name').trim() || profile?.full_name || '',
      buying_licensee_number:    str('buying_licensee_number').trim() || profile?.license_number || '',
      buying_licensee_email:     str('buying_licensee_email').trim() || profile?.email || '',
      buying_licensee_cell:      str('buying_licensee_cell').trim() || profile?.phone || '',
      hoa_name:                  str('hoa_name').trim(),
      hoa_phone:                 str('hoa_phone').trim(),
      hoa_email:                 str('hoa_email').trim(),
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

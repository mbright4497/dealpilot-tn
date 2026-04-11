'use client'

import { useState, useRef, useEffect } from 'react'
import { speak, stopSpeaking } from '@/lib/voice-engine'
import { priceToWords } from '@/lib/rf401/priceToWords'

// ─── Question definitions ───────────────────────────────────────────────────

type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'yesno'
  | 'currency'
  | 'date'
  | 'textarea'
  | 'checkbox'
  | 'time'

interface WizardQuestion {
  id: string
  section: string
  label: string
  veraExplains: string
  type: FieldType
  options?: string[]
  defaultValue?: string
  prefillKey?: string
  required?: boolean
  skipIf?: (answers: Record<string, string>) => boolean
  yesNoLabels?: { yes: string; no: string }
  /** When type is `time`, also render AM/PM for this answers key */
  companionAmpmField?: string
  textareaMaxRows?: number
  textareaMaxLength?: number
}

const QUESTIONS: WizardQuestion[] = [
  // ─── Section 1: Property ───
  {
    id: 'property_address',
    section: 'Section 1 — Property',
    label: 'What is the full property address?',
    veraExplains: 'This must match the legal description exactly. Use the address as it appears on county records.',
    type: 'text',
    prefillKey: 'address',
    required: true,
  },
  {
    id: 'property_city',
    section: 'Section 1 — Property',
    label: 'What city is the property in?',
    veraExplains: 'Johnson City, Kingsport, and Bristol are the three main Tri-Cities areas. Make sure this matches the legal address.',
    type: 'text',
    prefillKey: 'property_city',
    required: true,
  },
  {
    id: 'property_zip',
    section: 'Section 1 — Property',
    label: 'What is the zip code?',
    veraExplains: 'The zip code must match the property location exactly.',
    type: 'text',
    prefillKey: 'property_zip',
    required: true,
  },
  {
    id: 'rf401_6',
    section: 'Section 1 — Legal description (RF401)',
    label: 'County (Register of Deeds) — RF401 line 6',
    veraExplains:
      'Enter the county as it should appear on the deed and in the Register of Deeds index (e.g. Washington, Sullivan). This must match where the prior deed was recorded.',
    type: 'text',
    prefillKey: 'property_county',
    required: true,
  },
  {
    id: 'rf401_7',
    section: 'Section 1 — Legal description (RF401)',
    label: 'Deed book number — RF401 line 7',
    veraExplains:
      'From the seller’s vesting deed: the deed book (or instrument book) where the current deed was recorded. Your title search or the county Register of Deeds site shows this.',
    type: 'text',
  },
  {
    id: 'rf401_8',
    section: 'Section 1 — Legal description (RF401)',
    label: 'Page number — RF401 line 8',
    veraExplains: 'The page number in that deed book where the deed begins. If your county uses instrument numbers only, you can leave this blank after confirming with title.',
    type: 'text',
  },
  {
    id: 'rf401_9',
    section: 'Section 1 — Legal description (RF401)',
    label: 'Instrument number — RF401 line 9',
    veraExplains:
      'Some counties index by instrument / reception number instead of book and page. Use the official recording reference from the prior deed or title commitment.',
    type: 'text',
  },
  {
    id: 'rf401_10',
    section: 'Section 1 — Legal description (RF401)',
    label: 'Further legal description — RF401 line 10',
    veraExplains:
      'Add any continuation of the legal description, metes-and-bounds, lot/block, subdivision name, or reference to a plat recorded of record. Must match title and the seller’s deed.',
    type: 'textarea',
  },
  {
    id: 'buyer_1_name',
    section: 'Section 1 — Parties',
    label: 'What is the buyer\'s full legal name?',
    veraExplains: 'This MUST be the buyer\'s full legal name exactly as it will appear on the deed. No nicknames — check their ID.',
    type: 'text',
    prefillKey: 'client',
    required: true,
  },
  {
    id: 'seller_1_name',
    section: 'Section 1 — Parties',
    label: 'What is the seller\'s full legal name?',
    veraExplains: 'This must match the name on the current deed exactly. Your title company can verify this. If it doesn\'t match, the title company will flag it.',
    type: 'text',
    prefillKey: 'seller_name',
    required: true,
  },
  {
    id: 'rf401_11',
    section: 'Section 1 — Personal Property',
    label: 'Garage door remote count — RF401 line 11',
    veraExplains:
      'RF401 expects a minimum number of garage door transmitters/remotes to convey. Tri-Cities practice is often two; confirm with the seller if the home has fewer or none.',
    type: 'number',
    defaultValue: '2',
  },
  {
    id: 'items_remaining',
    section: 'Section 1 — Personal Property',
    label: 'What items STAY with the property at no cost to buyer? (Section B)',
    veraExplains: 'Section A items like built-in appliances already convey automatically — don\'t re-list those. Section B is for extras like a freestanding fridge, non-built-in appliances, or a riding mower. Leave blank if nothing extra stays.',
    type: 'text',
  },
  {
    id: 'items_not_remaining',
    section: 'Section 1 — Personal Property',
    label: 'What items do NOT stay with the property? (Section C)',
    veraExplains: 'List anything the seller is taking that a buyer might assume stays — like a mounted TV, a specific light fixture, or a garage shelving unit. Cross-check with the seller\'s disclosure (RF201).',
    type: 'text',
  },
  {
    id: 'rf401_15',
    section: 'Section 1 — Personal Property',
    label: 'Buyer does not wish to assume leased item(s) — RF401 line 15',
    veraExplains:
      'Check this if the buyer is not taking over a leased item that might otherwise run with the property (e.g. solar lease, security equipment). Uncheck if the buyer will assume existing leases as written.',
    type: 'checkbox',
  },
  {
    id: 'rf401_16',
    section: 'Section 1 — Personal Property',
    label: 'Leased item to be cancelled — RF401 line 16',
    veraExplains:
      'If the buyer is not assuming a lease, identify the leased item or service and how it will be cancelled or paid off before or at closing. Be specific — vague language is hard to enforce.',
    type: 'text',
    skipIf: (a) => a.rf401_15 !== 'true',
  },

  // ─── Section 2: Financing ───
  {
    id: 'purchase_price',
    section: 'Section 2 — Purchase Price',
    label: 'Purchase price (numeric) — RF401 line 17',
    veraExplains: 'Enter the full agreed purchase price. This number drives everything — LTV calculation, earnest money percentage, seller concession limits.',
    type: 'currency',
    prefillKey: 'purchase_price',
    required: true,
  },
  {
    id: 'rf401_18',
    section: 'Section 2 — Purchase Price',
    label: 'Purchase price in words — RF401 line 18',
    veraExplains:
      'This line must spell out the whole-dollar amount. We pre-fill it from line 17; edit if your broker or title company needs a specific format (e.g. “No/100”).',
    type: 'textarea',
  },
  {
    id: 'loan_type',
    section: 'Section 2 — Financing',
    label: 'What type of loan is the buyer using?',
    veraExplains: 'This determines which addenda are required. FHA requires the FHA Addendum. VA requires the VA Addendum. Both MUST be listed in Section 20. Cash means financing contingency is waived.',
    type: 'select',
    options: ['Conventional', 'FHA', 'VA', 'USDA', 'Cash', 'Other'],
    prefillKey: 'loan_type',
    required: true,
  },
  {
    id: 'loan_percentage',
    section: 'Section 2 — Financing',
    label: 'What is the LTV percentage? (% of purchase price being financed)',
    veraExplains: 'LTV is the percentage of the purchase price being FINANCED — not the down payment. FHA at 3.5% down = 96.5% LTV. VA zero down = 100% LTV. Conventional varies. Ask your lender if unsure.',
    type: 'number',
    prefillKey: 'loan_percentage',
    skipIf: (a) => a.loan_type === 'Cash',
    required: true,
  },
  {
    id: 'appraisal_contingent',
    section: 'Section 2C — Appraisal',
    label: 'Is this agreement contingent upon the appraised value?',
    veraExplains: 'You MUST select one option. Contingent means the buyer can terminate if appraisal comes in low. Not contingent means the buyer proceeds regardless.',
    type: 'yesno',
    yesNoLabels: { yes: 'Yes — contingent (§2C.2)', no: 'No — not contingent (§2C.1)' },
    prefillKey: 'appraisal_contingent',
    required: true,
    skipIf: (a) => a.loan_type === 'Cash',
  },

  // ─── Section 3: Earnest Money ───
  {
    id: 'earnest_money',
    section: 'Section 3 — Earnest Money',
    label: 'How much earnest money will the buyer deposit?',
    veraExplains: 'Tri-Cities standard is typically 1% of purchase price, but it\'s negotiable. First-time buyers sometimes deposit as little as $500. The higher the earnest money, the stronger the offer looks to the seller.',
    type: 'currency',
    prefillKey: 'earnest_money',
    required: true,
  },
  {
    id: 'earnest_money_days',
    section: 'Section 3 — Earnest Money',
    label: 'How many days after BAD is earnest money due?',
    veraExplains: 'Tennessee standard is 3 days after the Binding Agreement Date. If the buyer misses this deadline and the check bounces, they have only 1 day to cure with immediately available funds before being in default.',
    type: 'number',
    defaultValue: '3',
    prefillKey: 'earnest_money_days',
    required: true,
  },
  {
    id: 'earnest_money_holder',
    section: 'Section 3 — Earnest Money',
    label: 'Who holds the earnest money? (Holder name)',
    veraExplains: 'Typically the title company or closing attorney. In the Tri-Cities area this is often Reliable Title, Security Title, or similar. The Holder cannot disburse funds without all parties agreeing, a court order, or proper interpretation of the contract.',
    type: 'text',
    prefillKey: 'earnest_money_holder',
    required: true,
  },
  {
    id: 'earnest_money_payment_method',
    section: 'Section 3 — Earnest Money',
    label: 'How is earnest money being delivered?',
    veraExplains: 'Choose how the deposit will be made. If it is a personal check, pick Check — you will not need the follow-up line on the contract.',
    type: 'select',
    options: ['Check', 'Wire transfer', "Cashier's check", 'Other'],
    defaultValue: 'Check',
    required: true,
  },
  {
    id: 'earnest_money_other_method',
    section: 'Section 3 — Earnest Money',
    label: 'How is earnest money being paid if not by check?',
    veraExplains:
      'Leave blank if paying by personal check. Only fill this in if using wire transfer, cashier\'s check, or another method.',
    type: 'text',
    skipIf: (a) => !a.earnest_money_payment_method || a.earnest_money_payment_method === 'Check',
  },

  // ─── Section 4: Closing ───
  {
    id: 'closing_date',
    section: 'Section 4 — Closing',
    label: 'What is the closing date?',
    veraExplains: 'The closing date expires at 11:59 PM local time on this date. This is one of the four FIRM deadlines that does NOT roll to the next business day if it falls on a weekend or holiday. Any extension must be in writing.',
    type: 'date',
    prefillKey: 'closing_date',
    required: true,
  },
  {
    id: 'rf401_37',
    section: 'Section 4 — Closing',
    label: 'Possession — RF401 line 37',
    veraExplains:
      'Choose whether the buyer gets possession at closing or under a separate Temporary Occupancy Agreement (RF635). Seller rent-back or post-closing possession must be documented — do not rely on a verbal agreement.',
    type: 'select',
    options: ['At closing', 'Temporary occupancy agreement'],
    required: true,
    defaultValue: 'At closing',
  },
  {
    id: 'closing_agency_buyer',
    section: 'Section 4 — Closing',
    label: 'What is the buyer\'s closing agency?',
    veraExplains: 'This is the title company or attorney handling closing for the buyer. Include the name and address. In Johnson City, Reliable Title at 508 Princeton Road is commonly used.',
    type: 'text',
    prefillKey: 'closing_agency_buyer',
    required: true,
  },
  {
    id: 'closing_agency_seller',
    section: 'Section 4 — Closing',
    label: 'What is the seller\'s closing agency?',
    veraExplains: 'Often the same as the buyer\'s closing agency in a typical transaction. If different, both must be listed.',
    type: 'text',
    prefillKey: 'closing_agency_seller',
  },
  {
    id: 'title_expenses',
    section: 'Section 4 — Title expenses (RF401)',
    label: 'Who pays for title expenses (title search, mortgagee\'s policy, owner\'s policy)?',
    veraExplains:
      'This is one of the most important lines in the contract. In Tennessee, it is common for the seller to pay for the owner\'s policy and the buyer to pay for the mortgagee\'s policy, but this is negotiable. Whatever is agreed here gets written on line 147 of the RF401. Be specific — write exactly who pays what.',
    type: 'textarea',
  },
  {
    id: 'expense_modifications',
    section: 'Section 4 — Title expenses (RF401)',
    label: 'Are there any modifications to the standard buyer/seller/title expense allocations?',
    veraExplains:
      'Most agents write "N/A" or "See line 145-147" here if they already specified title expenses above. Only use this section if there are additional cost modifications beyond what was covered in the title expenses section. Do not duplicate.',
    type: 'textarea',
    textareaMaxRows: 4,
    textareaMaxLength: 2000,
  },

  // ─── Section 7: Lead Paint ───
  {
    id: 'lead_based_paint',
    section: 'Section 7 — Lead-Based Paint',
    label: 'Was the home built before 1978?',
    veraExplains: 'If yes, the Lead-Based Paint Disclosure (RF209) is REQUIRED by federal law. It must be attached and listed in Section 20. This is not optional — failure to attach it on a pre-1978 property is a compliance violation.',
    type: 'yesno',
    prefillKey: 'lead_based_paint',
    required: true,
  },

  // ─── Section 8: Inspections ───
  {
    id: 'inspection_period_days',
    section: 'Section 8 — Inspections',
    label: 'How many days for the inspection period?',
    veraExplains: 'Tri-Cities standard is 15 days. A blank inspection period = zero days = the buyer has NO inspection rights. Never leave this blank. The inspection period starts the day after BAD and the buyer must submit their repair request before it expires.',
    type: 'number',
    defaultValue: '15',
    prefillKey: 'inspection_period_days',
    required: true,
  },
  {
    id: 'resolution_period_days',
    section: 'Section 8 — Inspections',
    label: 'How many days for the resolution period?',
    veraExplains: 'The resolution period starts when the SELLER receives the buyer\'s repair request list. Standard is 3 days. This is when both parties negotiate repairs. If no agreement is reached by the end of the resolution period, the contract terminates automatically and earnest money is returned.',
    type: 'number',
    defaultValue: '3',
    prefillKey: 'resolution_period_days',
    required: true,
  },
  {
    id: 'waive_repair_request',
    section: 'Section 8 — Inspections',
    label: 'Does the buyer waive the right to request repairs under §8D(3)?',
    veraExplains: 'If yes, the corresponding box is marked on the contract. Only choose Yes if the buyer is intentionally giving up that right.',
    type: 'yesno',
  },
  {
    id: 'waive_all_inspections',
    section: 'Section 8 — Inspections',
    label: 'Does the buyer waive ALL inspection rights under §8E?',
    veraExplains: 'This is stronger than waiving repair requests alone. Confirm with the buyer before selecting Yes.',
    type: 'yesno',
  },
  {
    id: 'home_warranty',
    section: 'Section 15 — Home Warranty',
    label: 'Home Protection Plan?',
    veraExplains: 'A home warranty covers repair/replacement of major systems after closing. Tri-Cities standard is to waive it or have Seller fund it at closing (~$500–700). If included, specify who pays and fill the plan details below.',
    type: 'select',
    options: ['Waived', 'Include — Buyer pays', 'Include — Seller pays'],
    required: false,
    defaultValue: 'Waived',
  },
  {
    id: 'hpp_paid_by',
    section: 'Section 15 — Home Warranty',
    label: 'Who pays for the home protection plan?',
    veraExplains: 'Usually Buyer or Seller as shown on the form. Match what you selected above or spell it out exactly as it should read on the contract.',
    type: 'text',
    skipIf: (a) => !a.home_warranty || a.home_warranty === 'Waived',
  },
  {
    id: 'hpp_amount',
    section: 'Section 15 — Home Warranty',
    label: 'Home protection plan amount ($)',
    veraExplains: 'Approximate plan premium or funded amount (e.g. 550.00).',
    type: 'currency',
    skipIf: (a) => !a.home_warranty || a.home_warranty === 'Waived',
  },
  {
    id: 'hpp_provider',
    section: 'Section 15 — Home Warranty',
    label: 'Plan provider (company name)',
    veraExplains: 'The warranty company (e.g. 2-10, Old Republic) as it should appear on the RF401.',
    type: 'text',
    skipIf: (a) => !a.home_warranty || a.home_warranty === 'Waived',
  },
  {
    id: 'hpp_ordered_by',
    section: 'Section 15 — Home Warranty',
    label: 'Ordered by (company)',
    veraExplains: 'Which firm or party is ordering the plan, as line 425 expects.',
    type: 'text',
    skipIf: (a) => !a.home_warranty || a.home_warranty === 'Waived',
  },

  // ─── Section 5: Deed ───
  {
    id: 'rf401_40',
    section: 'Section 5 — Title',
    label: 'Name(s) on deed — RF401 line 40',
    veraExplains:
      'This is how the buyer will hold title. It is the buyer’s responsibility to confirm vesting with the closing attorney or title company before closing. Common options: sole ownership, joint tenancy with right of survivorship, tenants in common.',
    type: 'text',
    prefillKey: 'deed_names',
    required: true,
  },
  {
    id: 'greenbelt_status',
    section: 'Section 5 — Greenbelt (RF401)',
    label: 'Does the greenbelt classification apply to this property?',
    veraExplains:
      'Greenbelt status affects property tax treatment. Choose the option that matches how the buyer will treat the classification after closing.',
    type: 'select',
    options: [
      'Not applicable',
      'Buyer intends to maintain greenbelt',
      'Buyer does not intend to maintain greenbelt',
    ],
    defaultValue: 'Not applicable',
  },

  // ─── Section 20: Exhibits ───
  {
    id: 'exhibits_addenda',
    section: 'Section 20 — Exhibits & Addenda',
    label: 'What addenda are attached to this contract?',
    veraExplains: 'Everything attached MUST be listed here or it is not part of the agreement. FHA loan = FHA Addendum required. VA loan = VA Addendum required. Pre-1978 home = RF209. Temporary occupancy = RF635. Mediation = RF629. Additional contract language = RF707.',
    type: 'text',
    required: true,
  },

  // ─── Section 21: Stipulations ───
  {
    id: 'special_stipulations',
    section: 'Section 21 — Special Stipulations',
    label: 'Are there any special stipulations?',
    veraExplains: 'Special stipulations override ALL preceding sections if there\'s a conflict — they are the most powerful part of the contract. NEVER use TBD, N/A, "actual cost", "negotiable" or "etc." — these are unenforceable. Use RF707 for pre-approved clause language. Always be specific and measurable.',
    type: 'text',
    prefillKey: 'special_stipulations',
  },

  // ─── Section 22: Offer Expiration ───
  {
    id: 'offer_exp_time',
    section: 'Section 22 — Time Limit of Offer',
    label: 'What time does this offer expire? (e.g. 5:00 PM)',
    veraExplains: 'The offer expiration time CANNOT be blank — a blank means no deadline which removes all urgency. The offer can be withdrawn any time before acceptance with Notice. Seller can accept, counter, or reject.',
    type: 'text',
    required: true,
  },
  {
    id: 'offer_exp_date',
    section: 'Section 22 — Time Limit of Offer',
    label: 'What date does this offer expire?',
    veraExplains: 'This is one of the four FIRM deadlines — it does not roll to the next business day. Make sure the seller has enough time to respond but not so much that urgency is lost.',
    type: 'date',
    required: true,
  },

  // ─── § Signatures & Closing Info (page 11) ───
  {
    id: 'listing_firm_name',
    section: '§ Signatures & Closing Info',
    label: 'Listing firm — name',
    veraExplains: 'For information purposes only (page 11).',
    type: 'text',
  },
  {
    id: 'listing_firm_address',
    section: '§ Signatures & Closing Info',
    label: 'Listing firm — address',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'listing_firm_license',
    section: '§ Signatures & Closing Info',
    label: 'Listing firm — license number',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'listing_firm_phone',
    section: '§ Signatures & Closing Info',
    label: 'Listing firm — phone',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'listing_licensee_name',
    section: '§ Signatures & Closing Info',
    label: 'Listing licensee — name',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'listing_licensee_number',
    section: '§ Signatures & Closing Info',
    label: 'Listing licensee — license number',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'listing_licensee_email',
    section: '§ Signatures & Closing Info',
    label: 'Listing licensee — email',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'listing_licensee_cell',
    section: '§ Signatures & Closing Info',
    label: 'Listing licensee — cell phone',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'buying_firm_name',
    section: '§ Signatures & Closing Info',
    label: 'Buying firm — name',
    veraExplains: 'Defaults from your profile on generate if left blank.',
    type: 'text',
  },
  {
    id: 'buying_firm_address',
    section: '§ Signatures & Closing Info',
    label: 'Buying firm — address',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'buying_firm_license',
    section: '§ Signatures & Closing Info',
    label: 'Buying firm — license number',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'buying_firm_phone',
    section: '§ Signatures & Closing Info',
    label: 'Buying firm — phone',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'buying_licensee_name',
    section: '§ Signatures & Closing Info',
    label: 'Buying licensee — name',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'buying_licensee_number',
    section: '§ Signatures & Closing Info',
    label: 'Buying licensee — license number',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'buying_licensee_email',
    section: '§ Signatures & Closing Info',
    label: 'Buying licensee — email',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'buying_licensee_cell',
    section: '§ Signatures & Closing Info',
    label: 'Buying licensee — cell phone',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'hoa_name',
    section: '§ Signatures & Closing Info',
    label: 'HOA / COA name',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'hoa_phone',
    section: '§ Signatures & Closing Info',
    label: 'HOA / COA phone',
    veraExplains: '',
    type: 'text',
  },
  {
    id: 'hoa_email',
    section: '§ Signatures & Closing Info',
    label: 'HOA / COA email',
    veraExplains: '',
    type: 'text',
  },
]

function mergeTransactionIntoAnswers(transaction: Record<string, unknown>): Record<string, string> {
  const prefilled: Record<string, string> = {}
  const w = transaction.rf401_wizard as Record<string, unknown> | null | undefined
  const wz = w && typeof w === 'object' && !Array.isArray(w) ? w : {}
  const wStr = (k: string) => {
    const v = wz[k]
    if (v == null) return ''
    if (typeof v === 'boolean') return v ? 'true' : 'false'
    return String(v)
  }

  for (const q of QUESTIONS) {
    if (q.prefillKey) {
      const key = q.prefillKey
      const v = transaction[key]
      if (v != null && String(v) !== '') {
        if (key === 'appraisal_contingent' && typeof v === 'boolean') {
          prefilled[q.id] = v ? 'true' : 'false'
        } else if (key === 'lead_based_paint' && typeof v === 'boolean') {
          prefilled[q.id] = v ? 'true' : 'false'
        } else {
          prefilled[q.id] = String(v)
        }
      }
    }
    if (q.defaultValue !== undefined && !(q.id in prefilled)) {
      prefilled[q.id] = q.defaultValue
    }
  }

  if (!prefilled.rf401_6 && transaction.county != null && String(transaction.county) !== '') {
    prefilled.rf401_6 = String(transaction.county)
  }

  if (wStr('deed_book')) prefilled.rf401_7 = wStr('deed_book')
  if (wStr('deed_page')) prefilled.rf401_8 = wStr('deed_page')
  if (wStr('instrument_number')) prefilled.rf401_9 = wStr('instrument_number')
  if (wStr('further_legal_description')) prefilled.rf401_10 = wStr('further_legal_description')
  if (wStr('garage_remotes').trim()) prefilled.rf401_11 = wStr('garage_remotes')
  if (wz.buyer_declines_leased_assumption === true) prefilled.rf401_15 = 'true'
  else if (wz.buyer_declines_leased_assumption === false) prefilled.rf401_15 = 'false'
  if (wStr('leased_item_to_cancel')) prefilled.rf401_16 = wStr('leased_item_to_cancel')
  if (wStr('purchase_price_words').trim()) prefilled.rf401_18 = wStr('purchase_price_words')
  if (wz.possession === 'temporary_occupancy') prefilled.rf401_37 = 'Temporary occupancy agreement'
  else if (wz.possession === 'at_closing') prefilled.rf401_37 = 'At closing'

  const wizKeys: string[] = [
    'proof_of_funds', 'exhibits_addenda', 'title_expenses', 'expense_modifications',
    'earnest_money_payment_method', 'earnest_money_other_method', 'greenbelt_status',
    'offer_exp_time', 'offer_exp_date', 'waive_repair_request', 'waive_all_inspections',
    'hpp_paid_by', 'hpp_amount', 'hpp_provider', 'hpp_ordered_by',
    'buyer_2_name', 'seller_2_name',
    'buyer1_offer_date', 'buyer1_offer_time', 'buyer1_offer_ampm',
    'buyer2_offer_date', 'buyer2_offer_time', 'buyer2_offer_ampm',
    'seller_response', 'seller1_date', 'seller1_time', 'seller1_ampm',
    'seller2_date', 'seller2_time', 'seller2_ampm',
    'binding_acknowledged_by', 'binding_agreement_date', 'binding_agreement_time', 'binding_agreement_ampm',
    'listing_firm_name', 'listing_firm_address', 'listing_firm_license', 'listing_firm_phone',
    'listing_licensee_name', 'listing_licensee_number', 'listing_licensee_email', 'listing_licensee_cell',
    'buying_firm_name', 'buying_firm_address', 'buying_firm_license', 'buying_firm_phone',
    'buying_licensee_name', 'buying_licensee_number', 'buying_licensee_email', 'buying_licensee_cell',
    'hoa_name', 'hoa_phone', 'hoa_email', 'property_address',
  ]
  for (const k of wizKeys) {
    const val = wStr(k).trim()
    if (val) prefilled[k] = wStr(k)
  }

  if (wStr('items_remaining').trim()) prefilled.items_remaining = wStr('items_remaining')
  else if (transaction.items_remaining != null && String(transaction.items_remaining).trim() !== '') {
    prefilled.items_remaining = String(transaction.items_remaining)
  }
  if (wStr('items_not_remaining').trim()) prefilled.items_not_remaining = wStr('items_not_remaining')
  else if (transaction.items_not_remaining != null && String(transaction.items_not_remaining).trim() !== '') {
    prefilled.items_not_remaining = String(transaction.items_not_remaining)
  }

  if (wStr('home_warranty').trim()) prefilled.home_warranty = wStr('home_warranty')
  else if (typeof transaction.home_warranty === 'boolean') {
    prefilled.home_warranty = transaction.home_warranty ? 'Include — Seller pays' : 'Waived'
  } else if (transaction.home_warranty != null && String(transaction.home_warranty) !== '') {
    prefilled.home_warranty = String(transaction.home_warranty)
  }

  if (prefilled.appraisal_contingent === undefined) {
    const ac = wStr('appraisal_contingent').toLowerCase()
    if (ac === 'true' || ac === 'yes') prefilled.appraisal_contingent = 'true'
    else if (ac === 'false' || ac === 'no') prefilled.appraisal_contingent = 'false'
  }

  const pp = prefilled.purchase_price || (transaction.purchase_price != null ? String(transaction.purchase_price) : '')
  if (!prefilled.rf401_18 && pp) {
    const auto = priceToWords(pp)
    if (auto) prefilled.rf401_18 = auto
  }

  return prefilled
}

// ─── Section list for progress nav ──────────────────────────────────────────

const SECTIONS = [
  'Section 1 — Property',
  'Section 1 — Legal description (RF401)',
  'Section 1 — Parties',
  'Section 1 — Personal Property',
  'Section 2 — Purchase Price',
  'Section 2 — Financing',
  'Section 2C — Appraisal',
  'Section 3 — Earnest Money',
  'Section 4 — Closing',
  'Section 4 — Title expenses (RF401)',
  'Section 7 — Lead-Based Paint',
  'Section 8 — Inspections',
  'Section 15 — Home Warranty',
  'Section 5 — Title',
  'Section 5 — Greenbelt (RF401)',
  'Section 20 — Exhibits & Addenda',
  'Section 21 — Special Stipulations',
  'Section 22 — Time Limit of Offer',
  '§ Signatures & Closing Info',
]

// ─── Chat message type ───────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  transactionId: number
  transaction: Record<string, any>
  onClose?: () => void
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ContractWizard({ transactionId, transaction, onClose }: Props) {
  const priceWordsTouchedRef = useRef(false)

  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    mergeTransactionIntoAnswers(transaction)
  )
  const [currentIdx, setCurrentIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `I'm Vera. I'll guide you through writing the RF401 contract for ${transaction.address || 'this property'} — one question at a time, in plain English. I'll explain what each section means, why it matters, and flag anything that needs your attention. Ask me anything along the way.`,
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Filter questions based on skip logic
  const activeQuestions = QUESTIONS.filter(q => !q.skipIf || !q.skipIf(answers))
  const currentQ = activeQuestions[currentIdx]
  const currentAnswer = currentQ ? (answers[currentQ.id] ?? '') : ''
  const progress = activeQuestions.length > 0 ? ((currentIdx) / activeQuestions.length) * 100 : 0

  // Unique sections for progress nav
  const completedSections = new Set(
    activeQuestions.slice(0, currentIdx).map(q => q.section)
  )

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/transactions/${transactionId}`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled || !data?.transaction) return
        setAnswers(mergeTransactionIntoAnswers(data.transaction as Record<string, unknown>))
      } catch {
        /* keep answers from props */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [transactionId])

  useEffect(() => {
    if (!currentQ?.companionAmpmField) return
    const ampmKey = currentQ.companionAmpmField
    setAnswers(prev => {
      if (prev[ampmKey]) return prev
      return { ...prev, [ampmKey]: 'AM' }
    })
  }, [currentQ?.id, currentQ?.companionAmpmField, currentIdx])

  const lastPurchasePriceRef = useRef(answers.purchase_price ?? '')
  useEffect(() => {
    const p = answers.purchase_price ?? ''
    if (p !== lastPurchasePriceRef.current) {
      lastPurchasePriceRef.current = p
      priceWordsTouchedRef.current = false
    }
  }, [answers.purchase_price])

  useEffect(() => {
    if (priceWordsTouchedRef.current) return
    const w = priceToWords(answers.purchase_price)
    if (!w) return
    setAnswers(prev => (prev.rf401_18 === w ? prev : { ...prev, rf401_18: w }))
  }, [answers.purchase_price])

  // Auto-speak Vera's explanation when question changes
  useEffect(() => {
    if (!currentQ) return
    // Don't auto-speak — let user click speaker button
  }, [currentIdx])

  function handleAnswer(val: string) {
    if (!currentQ) return
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }))
  }

  function handleNext() {
    if (!currentQ) return
    if (currentQ.required) {
      if (currentQ.type === 'time') {
        if (!currentAnswer.trim()) {
          setError(`${currentQ.label} is required.`)
          return
        }
      } else if (!currentAnswer.trim()) {
        setError(`${currentQ.label} is required.`)
        return
      }
    }
    setError(null)
    if (currentIdx < activeQuestions.length - 1) {
      setCurrentIdx(i => i + 1)
    }
  }

  function handleBack() {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1)
      setError(null)
    }
  }

  function handleSkip() {
    setError(null)
    if (currentIdx < activeQuestions.length - 1) {
      setCurrentIdx(i => i + 1)
    }
  }

  async function handleSaveAndGenerate() {
    setGenerating(true)
    setError(null)
    try {
      // Save all answers to transaction
      const saveRes = await fetch(`/api/wizard/${transactionId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to save answers')
      }

      // Generate PDF
      const pdfRes = await fetch(`/api/rf401/${transactionId}/generate`)
      if (!pdfRes.ok) throw new Error('Failed to generate PDF')

      const pdfBlob = await pdfRes.blob()
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `RF401-${transaction.address || transactionId}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      setDone(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  async function sendChat(text: string) {
    if (!text.trim() || chatLoading) return
    setChatMessages(prev => [...prev, { role: 'user', content: text }])
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/reva/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[CONTRACT WIZARD — ${currentQ?.section || 'Review'}] Agent is on question: "${currentQ?.label || 'Review'}". Agent asks: ${text}`,
          dealId: transactionId,
          threadId,
          context: 'contract_wizard',
        }),
      })
      const data = await res.json()
      if (data.threadId) setThreadId(data.threadId)
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  function speakExplanation() {
    if (!currentQ || !currentQ.veraExplains.trim()) return
    if (speaking) { stopSpeaking(); setSpeaking(false); return }
    speak(currentQ.veraExplains, 'friendly_tn', () => setSpeaking(true), () => setSpeaking(false))
  }

  // ─── Done screen ───────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex fixed inset-0 items-center justify-center bg-gray-950">
        <div className="text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-white text-2xl font-bold">Contract Complete!</h2>
          <p className="text-gray-400 text-sm">Your RF401 has been generated and downloaded.</p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => { setDone(false); setCurrentIdx(0); setError(null) }}
              className="px-5 py-2 border border-gray-700 text-gray-300 rounded-xl text-sm hover:border-gray-500 transition-colors"
            >
              ← Edit Answers
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-black rounded-xl text-sm font-semibold transition-colors"
              >
                Back to Transaction
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex fixed inset-0 overflow-hidden rounded-xl border border-gray-800">
      {/* Back to Transaction — top left */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute left-3 top-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 text-gray-400 text-xs hover:border-gray-600 hover:text-white transition-colors"
        >
          ← Transaction
        </button>
      )}

      {/* Close X — top right */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-gray-400 text-lg leading-none hover:border-gray-600 hover:text-white"
          aria-label="Close"
        >
          ×
        </button>
      )}

      {/* LEFT — Section progress nav */}
      <div className="w-48 flex-shrink-0 border-r border-gray-800 overflow-y-auto bg-gray-950">
        <div className="p-3">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3">Progress</p>
          <div className="space-y-1">
            {SECTIONS.map(section => {
              const isCompleted = completedSections.has(section)
              const isCurrent = currentQ?.section === section
              return (
                <div
                  key={section}
                  className={`px-2 py-1.5 rounded text-xs font-medium flex items-center gap-2 ${
                    isCurrent ? 'bg-orange-500/20 text-orange-300' :
                    isCompleted ? 'text-green-400' : 'text-gray-600'
                  }`}
                >
                  <span className="flex-shrink-0">
                    {isCompleted ? '✓' : isCurrent ? '→' : '○'}
                  </span>
                  <span className="leading-tight">{section.replace('Section ', '§')}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* CENTER — Question card */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Progress bar */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              Question {currentIdx + 1} of {activeQuestions.length}
            </span>
            <span className="text-xs text-orange-400 font-medium">
              {currentQ?.section}
            </span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full">
            <div
              className="h-full bg-orange-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {currentQ ? (
            <div className="max-w-lg">
              <div className="flex items-start gap-2 mb-2">
                <h2 className="text-white text-lg font-semibold leading-snug">
                  {currentQ.label}
                </h2>
                {currentQ.required && (
                  <span className="text-orange-400 text-sm mt-1 flex-shrink-0">*</span>
                )}
              </div>

              {/* Vera's explanation */}
              {currentQ.veraExplains.trim() !== '' && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-5 flex items-start gap-2">
                  <img src="/avatar-pilot.png" alt="Vera" className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
                  <p className="text-gray-300 text-sm leading-relaxed">{currentQ.veraExplains}</p>
                  <button
                    type="button"
                    onClick={speakExplanation}
                    className="flex-shrink-0 text-gray-500 hover:text-orange-400 transition-colors"
                    title="Hear Vera explain this"
                  >
                    {speaking ? '🔇' : '🔊'}
                  </button>
                </div>
              )}

              {/* Input */}
              {currentQ.type === 'yesno' && (
                <div className="flex flex-wrap gap-3">
                  {(['Yes', 'No'] as const).map(opt => {
                    const val = opt === 'Yes' ? 'true' : 'false'
                    const label =
                      opt === 'Yes'
                        ? (currentQ.yesNoLabels?.yes ?? 'Yes')
                        : (currentQ.yesNoLabels?.no ?? 'No')
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleAnswer(val)}
                        className={`px-4 py-3 rounded-xl text-sm font-semibold border transition-all text-left max-w-full ${
                          currentAnswer === val
                            ? 'bg-orange-500 border-orange-500 text-black'
                            : 'border-gray-700 text-gray-300 hover:border-orange-500/50'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}

              {currentQ.type === 'select' && currentQ.options && (
                <div className="flex flex-wrap gap-2">
                  {currentQ.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        currentAnswer === opt
                          ? 'bg-orange-500 border-orange-500 text-black'
                          : 'border-gray-700 text-gray-300 hover:border-orange-500/50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {(currentQ.type === 'text' || currentQ.type === 'currency') && (
                <input
                  type="text"
                  value={currentAnswer}
                  onChange={e => handleAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNext()}
                  placeholder={currentQ.type === 'currency' ? '$0.00' : ''}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-orange-500/50 placeholder-gray-600"
                />
              )}

              {currentQ.type === 'number' && (
                <input
                  type="number"
                  min={0}
                  value={currentAnswer}
                  onChange={e => handleAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNext()}
                  placeholder="0"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-orange-500/50 placeholder-gray-600"
                />
              )}

              {currentQ.type === 'time' && currentQ.companionAmpmField && (
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="time"
                    value={currentAnswer}
                    onChange={e => handleAnswer(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-orange-500/50"
                  />
                  <select
                    value={answers[currentQ.companionAmpmField] || 'AM'}
                    onChange={e =>
                      setAnswers(prev => ({ ...prev, [currentQ.companionAmpmField!]: e.target.value }))
                    }
                    className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              )}

              {currentQ.type === 'textarea' && (
                <textarea
                  value={currentAnswer}
                  onChange={e => {
                    if (currentQ.id === 'rf401_18') priceWordsTouchedRef.current = true
                    handleAnswer(e.target.value)
                  }}
                  rows={currentQ.textareaMaxRows ?? 4}
                  maxLength={currentQ.textareaMaxLength}
                  onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleNext()}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-orange-500/50 placeholder-gray-600 resize-y min-h-[100px]"
                  placeholder={currentQ.id === 'rf401_18' ? 'e.g. Two Hundred Fifty Thousand Dollars' : ''}
                />
              )}

              {currentQ.type === 'checkbox' && (
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={currentAnswer === 'true'}
                    onChange={e => handleAnswer(e.target.checked ? 'true' : 'false')}
                    className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-900 text-orange-500 focus:ring-orange-500/40"
                  />
                  <span className="text-gray-300 text-sm leading-relaxed group-hover:text-white transition-colors">
                    Yes — the buyer does not wish to assume the leased item(s) described in the contract.
                  </span>
                </label>
              )}

              {currentQ.type === 'date' && (
                <input
                  type="date"
                  value={currentAnswer}
                  onChange={e => handleAnswer(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                />
              )}

              {error && (
                <p className="mt-3 text-red-400 text-sm">{error}</p>
              )}

              {/* Navigation */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleBack}
                  disabled={currentIdx === 0}
                  className="px-4 py-2 border border-gray-700 text-gray-400 rounded-xl text-sm disabled:opacity-30 hover:border-gray-500 transition-colors"
                >
                  ← Back
                </button>
                {!currentQ.required && (
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-gray-500 text-sm hover:text-gray-300 transition-colors"
                  >
                    Skip
                  </button>
                )}
                {currentIdx < activeQuestions.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-black rounded-xl text-sm font-semibold transition-colors"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handleSaveAndGenerate}
                    disabled={generating}
                    className="px-6 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black rounded-xl text-sm font-semibold transition-colors"
                  >
                    {generating ? 'Generating...' : '✓ Generate RF401'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-gray-400">All questions answered.</p>
              <button
                onClick={handleSaveAndGenerate}
                disabled={generating}
                className="px-8 py-3 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black rounded-xl text-base font-semibold transition-colors"
              >
                {generating ? 'Generating RF401...' : '✓ Generate RF401'}
              </button>
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Vera chat */}
      <div className="w-72 flex-shrink-0 border-l border-gray-800 flex flex-col bg-gray-950">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2 flex-shrink-0">
          <img src="/avatar-pilot.png" alt="Vera" className="w-6 h-6 rounded-full" />
          <span className="text-sm font-semibold text-white">Ask Vera</span>
          <div className="w-2 h-2 rounded-full bg-green-400 ml-auto" />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-orange-500/20 text-orange-100 border border-orange-500/20'
                  : 'bg-gray-800 text-gray-100'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-xl px-3 py-2 flex gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        <div className="px-3 py-3 border-t border-gray-800 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendChat(chatInput)}
            placeholder="Ask about this section..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
          />
          <button
            onClick={() => sendChat(chatInput)}
            disabled={chatLoading || !chatInput.trim()}
            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-black px-3 py-2 rounded-lg text-xs font-semibold"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  )
}

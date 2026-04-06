export interface RF401FieldCoord {
  fieldId: string
  page: number
  x: number
  y: number
  type: 'text' | 'checkbox'
  fontSize: number
  maxWidth: number
}

// Coordinate space: 150 DPI rendering of 8.5x11" PDF
// Page dimensions: 1275 x 1650 pixels
// Scale to PDF points: multiply by 0.48
// Confirmed accurate via visual test on 7 fields

export const RF401_FIELD_COORDS: RF401FieldCoord[] = [

  // ─── PAGE 1 ─── Lines 1-48
  // CONFIRMED via visual test:
  { fieldId: 'buyer_1_name',           page: 1, x: 190,  y: 352,  type: 'text',     fontSize: 9, maxWidth: 380 },
  { fieldId: 'buyer_2_name',           page: 1, x: 587,  y: 354,  type: 'text',     fontSize: 9, maxWidth: 380 },
  { fieldId: 'seller_1_name',          page: 1, x: 350,  y: 376,  type: 'text',     fontSize: 9, maxWidth: 260 },
  { fieldId: 'seller_2_name',          page: 1, x: 634,  y: 376,  type: 'text',     fontSize: 9, maxWidth: 380 },
  { fieldId: 'property_address',       page: 1, x: 447,  y: 422,  type: 'text',     fontSize: 9, maxWidth: 600 },
  { fieldId: 'property_city',          page: 1, x: 323,  y: 448,  type: 'text',     fontSize: 9, maxWidth: 280 },
  { fieldId: 'property_zip',           page: 1, x: 847,  y: 447,  type: 'text',     fontSize: 9, maxWidth: 120 },

  // ESTIMATED (line 8 - county/deed):
  { fieldId: 'property_county',        page: 1, x: 77,   y: 472,  type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'deed_book',              page: 1, x: 778,  y: 472,  type: 'text',     fontSize: 9, maxWidth: 100 },
  { fieldId: 'deed_pages',             page: 1, x: 963,  y: 472,  type: 'text',     fontSize: 9, maxWidth: 100 },

  // Line 9 - instrument number:
  { fieldId: 'instrument_number',      page: 1, x: 102,  y: 496,  type: 'text',     fontSize: 9, maxWidth: 400 },

  // Line 16 - garage remotes (inside "at least ___"):
  { fieldId: 'garage_remotes',         page: 1, x: 1071, y: 611,  type: 'text',     fontSize: 9, maxWidth: 40  },

  // Line 24 - Section B items remaining:
  { fieldId: 'items_remaining',        page: 1, x: 204,  y: 759,  type: 'text',     fontSize: 9, maxWidth: 900 },

  // Line 27 - Section C items not remaining:
  { fieldId: 'items_not_remaining',    page: 1, x: 204,  y: 814,  type: 'text',     fontSize: 9, maxWidth: 900 },

  // Line 30 - Section D leased items:
  { fieldId: 'leased_items',           page: 1, x: 455,  y: 860,  type: 'text',     fontSize: 9, maxWidth: 600 },

  // Line 40 - Purchase price numeric:
  { fieldId: 'purchase_price_numeric', page: 1, x: 906,  y: 1023, type: 'text',     fontSize: 9, maxWidth: 280 },

  // Line 41 - Purchase price words:
  { fieldId: 'purchase_price_words',   page: 1, x: 191,  y: 1040, type: 'text',     fontSize: 9, maxWidth: 700 },

  // Line 47 - LTV percentage:
  { fieldId: 'ltv_percentage',         page: 1, x: 689,  y: 1089, type: 'text',     fontSize: 9, maxWidth: 60  },

  // ─── PAGE 2 ─── Lines 49-103
  // Line 55 - loan type header (no field)
  // Line 56 - loan type checkboxes:
  { fieldId: 'loan_conventional_chk',  page: 2, x: 79,   y: 322,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'loan_fha_chk',           page: 2, x: 612,  y: 322,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  // Line 57:
  { fieldId: 'loan_va_chk',            page: 2, x: 79,   y: 347,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'loan_usda_chk',          page: 2, x: 612,  y: 347,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  // Line 58 - other loan text:
  { fieldId: 'loan_other_text',        page: 2, x: 200,  y: 372,  type: 'text',     fontSize: 9, maxWidth: 300 },

  // Line 86 - financing contingency waived (cash):
  { fieldId: 'financing_waived_chk',   page: 2, x: 79,   y: 1056, type: 'checkbox', fontSize: 9, maxWidth: 20  },
  // Line 89 - proof of funds method:
  { fieldId: 'cash_proof_method',      page: 2, x: 191,  y: 1104, type: 'text',     fontSize: 9, maxWidth: 500 },

  // Line 103 - appraisal NOT contingent:
  { fieldId: 'appraisal_not_chk',      page: 2, x: 79,   y: 1200, type: 'checkbox', fontSize: 9, maxWidth: 20  },
  // Line 106 - appraisal IS contingent:
  { fieldId: 'appraisal_contingent_chk', page: 2, x: 79, y: 1287, type: 'checkbox', fontSize: 9, maxWidth: 20  },

  // ─── PAGE 3 ─── Lines 104-159
  // Lines 153-156 - closing cost modification:
  { fieldId: 'closing_cost_mod',       page: 3, x: 191,  y: 924,  type: 'text',     fontSize: 9, maxWidth: 900 },

  // Lines 158-159 - closing agency buyer:
  { fieldId: 'closing_agency_buyer',   page: 3, x: 191,  y: 1469, type: 'text',     fontSize: 9, maxWidth: 900 },

  // ─── PAGE 4 ─── Lines 160-213
  // Lines 160-161 - closing agency seller (top of page 4):
  { fieldId: 'closing_agency_seller',  page: 4, x: 191,  y: 99,   type: 'text',     fontSize: 9, maxWidth: 900 },

  // Line 162 - earnest days:
  { fieldId: 'earnest_days',           page: 4, x: 434,  y: 149,  type: 'text',     fontSize: 9, maxWidth: 60  },
  // Line 163 - earnest holder name:
  { fieldId: 'earnest_holder_name',    page: 4, x: 191,  y: 165,  type: 'text',     fontSize: 9, maxWidth: 500 },
  // Line 164 - earnest holder address:
  { fieldId: 'earnest_holder_address', page: 4, x: 191,  y: 198,  type: 'text',     fontSize: 9, maxWidth: 700 },
  // Line 165 - earnest amount:
  { fieldId: 'earnest_amount',         page: 4, x: 676,  y: 231,  type: 'text',     fontSize: 9, maxWidth: 200 },

  // Line 195 - closing date:
  { fieldId: 'closing_day',            page: 4, x: 841,  y: 660,  type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'closing_month',          page: 4, x: 587,  y: 677,  type: 'text',     fontSize: 9, maxWidth: 150 },
  { fieldId: 'closing_year',           page: 4, x: 740,  y: 677,  type: 'text',     fontSize: 9, maxWidth: 80  },

  // Line 202 - possession at closing checkbox:
  { fieldId: 'possession_at_closing_chk', page: 4, x: 79, y: 792, type: 'checkbox', fontSize: 9, maxWidth: 20  },

  // ─── PAGE 5 ─── Lines 214-267
  // Line 258 - deed names:
  { fieldId: 'deed_names',             page: 5, x: 446,  y: 413,  type: 'text',     fontSize: 9, maxWidth: 600 },

  // ─── PAGE 6 ─── Lines 268-321
  // Line 275 - lead-based paint:
  { fieldId: 'lbp_not_apply_chk',      page: 6, x: 79,   y: 165,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'lbp_applies_chk',        page: 6, x: 310,  y: 165,  type: 'checkbox', fontSize: 9, maxWidth: 20  },

  // Line 307 - inspection period:
  { fieldId: 'inspection_period_days', page: 6, x: 536,  y: 495,  type: 'text',     fontSize: 9, maxWidth: 60  },

  // Line 325 - resolution period:
  { fieldId: 'resolution_period_days', page: 6, x: 841,  y: 677,  type: 'text',     fontSize: 9, maxWidth: 60  },

  // ─── PAGE 8 ─── Lines 374-428
  // Line 423 - home protection plan:
  { fieldId: 'hpp_who_pays',           page: 8, x: 191,  y: 545,  type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'hpp_cost',               page: 8, x: 750,  y: 545,  type: 'text',     fontSize: 9, maxWidth: 100 },
  { fieldId: 'hpp_provider',           page: 8, x: 448,  y: 569,  type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'hpp_ordered_by',         page: 8, x: 191,  y: 593,  type: 'text',     fontSize: 9, maxWidth: 700 },
  // Line 426 - home protection plan waived:
  { fieldId: 'hpp_waived_chk',         page: 8, x: 79,   y: 561,  type: 'checkbox', fontSize: 9, maxWidth: 20  },

  // ─── PAGE 10 ─── Lines 481-532
  // Lines 502-507 - exhibits and addenda:
  { fieldId: 'exhibits_addenda',       page: 10, x: 191, y: 248,  type: 'text',     fontSize: 9, maxWidth: 900 },

  // Lines 508-524 - special stipulations:
  { fieldId: 'special_stipulations',   page: 10, x: 191, y: 330,  type: 'text',     fontSize: 9, maxWidth: 900 },

  // Line 527 - offer expiration:
  { fieldId: 'offer_exp_time',         page: 10, x: 446, y: 809,  type: 'text',     fontSize: 9, maxWidth: 80  },
  { fieldId: 'offer_exp_day',          page: 10, x: 750, y: 830,  type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'offer_exp_month_year',   page: 10, x: 848, y: 830,  type: 'text',     fontSize: 9, maxWidth: 200 },

  // ─── PAGE 11 ─── Lines 533-553
  // Agent/brokerage info (bottom section):
  { fieldId: 'buying_firm_name',       page: 11, x: 612, y: 1073, type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'buying_firm_address',    page: 11, x: 612, y: 1106, type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'buying_firm_license',    page: 11, x: 612, y: 1139, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'buying_firm_phone',      page: 11, x: 612, y: 1172, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'buying_licensee_name',   page: 11, x: 612, y: 1205, type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'buying_licensee_number', page: 11, x: 612, y: 1238, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'buying_licensee_email',  page: 11, x: 612, y: 1271, type: 'text',     fontSize: 9, maxWidth: 400 },
]

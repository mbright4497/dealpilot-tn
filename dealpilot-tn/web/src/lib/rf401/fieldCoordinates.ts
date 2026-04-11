import { PDFFieldCoord } from './types'

export const SCALE = 72 / 150

export const FIELD_COORDS: PDFFieldCoord[] = [
  // ─── PAGE 1 ───
  { fieldId: 'buyer_1_name',           page: 1,  x: 153,  y: 357,  type: 'text',     fontSize: 9, maxWidth: 380 },
  { fieldId: 'buyer_2_name',           page: 1,  x: 586,  y: 358,  type: 'text',     fontSize: 9, maxWidth: 380 },
  { fieldId: 'seller_1_name',          page: 1,  x: 316,  y: 384,  type: 'text',     fontSize: 9, maxWidth: 260 },
  { fieldId: 'seller_2_name',          page: 1,  x: 694,  y: 386,  type: 'text',     fontSize: 9, maxWidth: 380 },
  { fieldId: 'property_address',       page: 1,  x: 419,  y: 432,  type: 'text',     fontSize: 9, maxWidth: 600 },
  { fieldId: 'property_city',          page: 1,  x: 249,  y: 457,  type: 'text',     fontSize: 9, maxWidth: 280 },
  { fieldId: 'property_zip',           page: 1,  x: 846,  y: 457,  type: 'text',     fontSize: 9, maxWidth: 120 },
  // Register of Deeds row + instrument + further description — calibrated from rf401-blank.pdf bbox (150dpi space)
  { fieldId: 'property_county',        page: 1,  x: 154,  y: 478,  type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'deed_book',              page: 1,  x: 766,  y: 480,  type: 'text',     fontSize: 9, maxWidth: 100 },
  { fieldId: 'deed_pages',             page: 1,  x: 994,  y: 479,  type: 'text',     fontSize: 9, maxWidth: 100 },
  { fieldId: 'instrument_number',      page: 1,  x: 212,  y: 502,  type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'further_legal_description', page: 1, x: 153, y: 526, type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'garage_remotes',         page: 1,  x: 1117, y: 674,  type: 'text',     fontSize: 9, maxWidth: 40  },
  { fieldId: 'items_remaining',        page: 1,  x: 153,  y: 869,  type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'items_not_remaining',    page: 1,  x: 153,  y: 943,  type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'leased_items',           page: 1,  x: 282,  y: 1000, type: 'text',     fontSize: 9, maxWidth: 600 },
  { fieldId: 'buyer_declines_leased_chk', page: 1, x: 194, y: 1085, type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'leased_item_to_cancel',  page: 1,  x: 698,  y: 1120, type: 'text',     fontSize: 9, maxWidth: 420 },
  { fieldId: 'purchase_price_numeric', page: 1,  x: 955,  y: 1272, type: 'text',     fontSize: 9, maxWidth: 280 },
  { fieldId: 'purchase_price_words',   page: 1,  x: 153,  y: 1295, type: 'text',     fontSize: 9, maxWidth: 700 },
  { fieldId: 'proof_of_funds',         page: 1,  x: 153,  y: 1320, type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'ltv_percentage',         page: 1,  x: 514,  y: 1446, type: 'text',     fontSize: 9, maxWidth: 60  },

  // ─── PAGE 2 ───
  { fieldId: 'loan_conventional_chk',  page: 2,  x: 193,  y: 300,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'loan_fha_chk',           page: 2,  x: 605,  y: 300,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'loan_va_chk',            page: 2,  x: 194,  y: 327,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'loan_usda_chk',          page: 2,  x: 605,  y: 327,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'financing_waived_chk',   page: 2,  x: 118,  y: 1062, type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'appraisal_not_chk',      page: 2,  x: 195,  y: 1479, type: 'checkbox', fontSize: 9, maxWidth: 20  },

  // ─── PAGE 3 ───
  { fieldId: 'appraisal_2c_no_chk',    page: 3,  x: 188,  y: 442,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'appraisal_2c_yes_chk',   page: 3,  x: 188,  y: 480,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'title_expenses',         page: 3,  x: 153,  y: 1092, type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'expense_mod_line1',      page: 3,  x: 153,  y: 1348, type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'expense_mod_line2',      page: 3,  x: 153,  y: 1366, type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'expense_mod_line3',      page: 3,  x: 153,  y: 1384, type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'expense_mod_line4',      page: 3,  x: 153,  y: 1402, type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'closing_agency_buyer',   page: 3,  x: 600,  y: 1444, type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'earnest_money_other_method', page: 3, x: 153, y: 1340, type: 'text',   fontSize: 9, maxWidth: 900 },

  // ─── PAGE 4 ───
  { fieldId: 'closing_agency_seller',   page: 4,  x: 603,  y: 131,  type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'earnest_days',            page: 4,  x: 711,  y: 196,  type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'earnest_holder_name',     page: 4,  x: 154,  y: 217,  type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'earnest_holder_address',  page: 4,  x: 154,  y: 242,  type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'earnest_amount',          page: 4,  x: 433,  y: 265,  type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'closing_day',             page: 4,  x: 1030, y: 1024, type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'closing_month',           page: 4,  x: 191,  y: 1050, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'closing_year',            page: 4,  x: 465,  y: 1050, type: 'text',     fontSize: 9, maxWidth: 80  },
  { fieldId: 'possession_at_closing_chk', page: 4, x: 225, y: 1195, type: 'checkbox', fontSize: 9, maxWidth: 20  },

  // ─── PAGE 5 ───
  { fieldId: 'deed_names',             page: 5,  x: 452,  y: 1248, type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'greenbelt_maintain_chk', page: 5,  x: 188,  y: 450,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'greenbelt_not_maintain_chk', page: 5, x: 188, y: 530, type: 'checkbox', fontSize: 9, maxWidth: 20  },

  // ─── PAGE 6 ───
  { fieldId: 'lbp_not_apply_chk',      page: 6,  x: 156,  y: 306,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'lbp_applies_chk',        page: 6,  x: 383,  y: 306,  type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'inspection_period_days', page: 6,  x: 563,  y: 1114, type: 'text',     fontSize: 9, maxWidth: 60  },

  // ─── PAGE 7 ───
  { fieldId: 'resolution_period_days', page: 7,  x: 886,  y: 206,  type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'final_inspection_days',  page: 7,  x: 492,  y: 1014, type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'waive_repair_request_chk', page: 7, x: 188, y: 980, type: 'checkbox', fontSize: 9, maxWidth: 20  },
  { fieldId: 'waive_all_inspections_chk', page: 7, x: 188, y: 1058, type: 'checkbox', fontSize: 9, maxWidth: 20  },

  // ─── PAGE 8 ───
  { fieldId: 'hpp_paid_by',            page: 8,  x: 401,  y: 1330, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'hpp_amount',             page: 8,  x: 768,  y: 1330, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'hpp_provider',           page: 8,  x: 490,  y: 1348, type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'hpp_ordered_by',         page: 8,  x: 300,  y: 1366, type: 'text',     fontSize: 9, maxWidth: 500 },
  { fieldId: 'hpp_waived_chk',         page: 8,  x: 188,  y: 1383, type: 'checkbox', fontSize: 9, maxWidth: 20  },

  // ─── PAGE 10 ───
  { fieldId: 'exhibits_addenda',       page: 10, x: 313,  y: 721,  type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'special_stipulations',   page: 10, x: 152,  y: 875,  type: 'text',     fontSize: 9, maxWidth: 900 },
  { fieldId: 'offer_exp_time',         page: 10, x: 329,  y: 1335, type: 'text',     fontSize: 9, maxWidth: 80  },
  { fieldId: 'offer_exp_day',          page: 10, x: 690,  y: 1334, type: 'text',     fontSize: 9, maxWidth: 60  },
  { fieldId: 'offer_exp_month_year',   page: 10, x: 823,  y: 1334, type: 'text',     fontSize: 9, maxWidth: 200 },

  // ─── PAGE 11 — signatures & firm info ───
  { fieldId: 'buyer1_offer_date',      page: 11, x: 131,  y: 475,  type: 'text',     fontSize: 9, maxWidth: 120 },
  { fieldId: 'buyer1_offer_time',      page: 11, x: 390,  y: 475,  type: 'text',     fontSize: 9, maxWidth: 80  },
  { fieldId: 'buyer1_offer_ampm',      page: 11, x: 496,  y: 469,  type: 'text',     fontSize: 9, maxWidth: 40  },
  { fieldId: 'buyer2_offer_date',      page: 11, x: 700,  y: 475,  type: 'text',     fontSize: 9, maxWidth: 120 },
  { fieldId: 'buyer2_offer_time',      page: 11, x: 910,  y: 475,  type: 'text',     fontSize: 9, maxWidth: 80  },
  { fieldId: 'buyer2_offer_ampm',      page: 11, x: 1020, y: 469,  type: 'text',     fontSize: 9, maxWidth: 40  },
  { fieldId: 'seller_response_accepts_chk', page: 11, x: 188, y: 700, type: 'checkbox', fontSize: 9, maxWidth: 20 },
  { fieldId: 'seller_response_counters_chk', page: 11, x: 188, y: 728, type: 'checkbox', fontSize: 9, maxWidth: 20 },
  { fieldId: 'seller_response_rejects_chk', page: 11, x: 188, y: 756, type: 'checkbox', fontSize: 9, maxWidth: 20 },
  { fieldId: 'seller1_date',           page: 11, x: 132,  y: 832,  type: 'text',     fontSize: 9, maxWidth: 120 },
  { fieldId: 'seller1_time',           page: 11, x: 390,  y: 832,  type: 'text',     fontSize: 9, maxWidth: 80  },
  { fieldId: 'seller1_ampm',           page: 11, x: 496,  y: 832,  type: 'text',     fontSize: 9, maxWidth: 40  },
  { fieldId: 'seller2_date',           page: 11, x: 700,  y: 832,  type: 'text',     fontSize: 9, maxWidth: 120 },
  { fieldId: 'seller2_time',           page: 11, x: 910,  y: 832,  type: 'text',     fontSize: 9, maxWidth: 80  },
  { fieldId: 'seller2_ampm',           page: 11, x: 1020, y: 832,  type: 'text',     fontSize: 9, maxWidth: 40  },
  { fieldId: 'binding_acknowledged_by', page: 11, x: 153,  y: 890,  type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'binding_agreement_date',  page: 11, x: 153,  y: 912,  type: 'text',     fontSize: 9, maxWidth: 120 },
  { fieldId: 'binding_agreement_time',  page: 11, x: 390,  y: 912,  type: 'text',     fontSize: 9, maxWidth: 80  },
  { fieldId: 'binding_agreement_ampm',  page: 11, x: 496,  y: 912,  type: 'text',     fontSize: 9, maxWidth: 40  },
  { fieldId: 'listing_firm_name',      page: 11, x: 232,  y: 1045, type: 'text',     fontSize: 9, maxWidth: 520 },
  { fieldId: 'listing_firm_address',   page: 11, x: 303,  y: 1069, type: 'text',     fontSize: 9, maxWidth: 520 },
  { fieldId: 'listing_firm_license',   page: 11, x: 303,  y: 1093, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'listing_firm_phone',     page: 11, x: 303,  y: 1117, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'listing_licensee_name',  page: 11, x: 303,  y: 1141, type: 'text',     fontSize: 9, maxWidth: 520 },
  { fieldId: 'listing_licensee_number', page: 11, x: 303, y: 1165, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'listing_licensee_email', page: 11, x: 303,  y: 1189, type: 'text',     fontSize: 9, maxWidth: 520 },
  { fieldId: 'listing_licensee_cell',  page: 11, x: 303,  y: 1213, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'buying_firm_name',       page: 11, x: 830,  y: 1045, type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'buying_firm_address',    page: 11, x: 830,  y: 1069, type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'buying_firm_license',    page: 11, x: 830,  y: 1093, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'buying_firm_phone',      page: 11, x: 830,  y: 1117, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'buying_licensee_name',   page: 11, x: 830,  y: 1141, type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'buying_licensee_number', page: 11, x: 830,  y: 1165, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'buying_licensee_email',  page: 11, x: 830,  y: 1189, type: 'text',     fontSize: 9, maxWidth: 400 },
  { fieldId: 'buying_licensee_cell',   page: 11, x: 830,  y: 1213, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'hoa_name',               page: 11, x: 153,  y: 1255, type: 'text',     fontSize: 9, maxWidth: 360 },
  { fieldId: 'hoa_phone',              page: 11, x: 153,  y: 1278, type: 'text',     fontSize: 9, maxWidth: 200 },
  { fieldId: 'hoa_email',              page: 11, x: 830,  y: 1278, type: 'text',     fontSize: 9, maxWidth: 520 },
]

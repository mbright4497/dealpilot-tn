export type StateCode =
  | "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA"
  | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD"
  | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ"
  | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC"
  | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY";

export type StateConfig = {
  code: StateCode;
  name: string;
  active: boolean;
  assistantId: string | null;
  vectorStoreId: string | null;
  formPrefix: string;
  regulatoryBody: string;
  tcaTitle: string;
};

export const STATE_CONFIGS: Record<StateCode, StateConfig> = {
  AL: { code: "AL", name: "Alabama", active: false, assistantId: null, vectorStoreId: null, formPrefix: "AAR", regulatoryBody: "AREC", tcaTitle: "AL Code Title 34 Chapter 27" },
  AK: { code: "AK", name: "Alaska", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "AKREC", tcaTitle: "AS Title 8 Chapter 88" },
  AZ: { code: "AZ", name: "Arizona", active: false, assistantId: null, vectorStoreId: null, formPrefix: "AAR", regulatoryBody: "ADRE", tcaTitle: "ARS Title 32 Chapter 20" },
  AR: { code: "AR", name: "Arkansas", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "AREC", tcaTitle: "AR Code Title 17 Chapter 42" },
  CA: { code: "CA", name: "California", active: false, assistantId: null, vectorStoreId: null, formPrefix: "CAR", regulatoryBody: "DRE", tcaTitle: "CA Business & Professions Code 10000+" },
  CO: { code: "CO", name: "Colorado", active: false, assistantId: null, vectorStoreId: null, formPrefix: "CBS", regulatoryBody: "DORA", tcaTitle: "CRS Title 12 Article 10" },
  CT: { code: "CT", name: "Connecticut", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "DCP", tcaTitle: "CT Gen Stat Chapter 392" },
  DE: { code: "DE", name: "Delaware", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "DREC", tcaTitle: "DE Code Title 24 Chapter 29" },
  FL: { code: "FL", name: "Florida", active: false, assistantId: null, vectorStoreId: null, formPrefix: "FAR", regulatoryBody: "FREC", tcaTitle: "FL Statute Chapter 475" },
  GA: { code: "GA", name: "Georgia", active: false, assistantId: null, vectorStoreId: null, formPrefix: "GAR", regulatoryBody: "GREC", tcaTitle: "OCGA Title 43 & 44" },
  HI: { code: "HI", name: "Hawaii", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "HIREC", tcaTitle: "HRS Chapter 467" },
  ID: { code: "ID", name: "Idaho", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "IREC", tcaTitle: "Idaho Code Title 54 Chapter 20" },
  IL: { code: "IL", name: "Illinois", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "IDFPR", tcaTitle: "225 ILCS 454" },
  IN: { code: "IN", name: "Indiana", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "IPLA", tcaTitle: "IC 25-34.1" },
  IA: { code: "IA", name: "Iowa", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "IREC", tcaTitle: "Iowa Code Chapter 543B" },
  KS: { code: "KS", name: "Kansas", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "KREC", tcaTitle: "KSA 58-3034+" },
  KY: { code: "KY", name: "Kentucky", active: false, assistantId: null, vectorStoreId: null, formPrefix: "KAR", regulatoryBody: "KREC", tcaTitle: "KRS Chapter 324" },
  LA: { code: "LA", name: "Louisiana", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "LREC", tcaTitle: "LA RS 37:1430+" },
  ME: { code: "ME", name: "Maine", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "MREC", tcaTitle: "32 MRS Chapter 114" },
  MD: { code: "MD", name: "Maryland", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "MREC", tcaTitle: "MD Business Occupations §17" },
  MA: { code: "MA", name: "Massachusetts", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "MREC", tcaTitle: "MGL Part I Title XX Chapter 112" },
  MI: { code: "MI", name: "Michigan", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "LARA", tcaTitle: "MCL 339.2501+" },
  MN: { code: "MN", name: "Minnesota", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "MN DOC", tcaTitle: "MN Stat Chapter 82" },
  MS: { code: "MS", name: "Mississippi", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "MSREC", tcaTitle: "MS Code Title 73 Chapter 35" },
  MO: { code: "MO", name: "Missouri", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "MREC", tcaTitle: "MO Revised Statutes Chapter 339" },
  MT: { code: "MT", name: "Montana", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "BRR", tcaTitle: "MCA Title 37 Chapter 51" },
  NE: { code: "NE", name: "Nebraska", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "NREC", tcaTitle: "Nebraska Statutes Chapter 81 Article 88" },
  NV: { code: "NV", name: "Nevada", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "NRED", tcaTitle: "NRS Chapter 645" },
  NH: { code: "NH", name: "New Hampshire", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "NHREC", tcaTitle: "RSA 331-A" },
  NJ: { code: "NJ", name: "New Jersey", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "NJREC", tcaTitle: "NJSA 45:15-1+" },
  NM: { code: "NM", name: "New Mexico", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "NMREC", tcaTitle: "NMSA 61-29" },
  NY: { code: "NY", name: "New York", active: false, assistantId: null, vectorStoreId: null, formPrefix: "NYRR", regulatoryBody: "NYDOS", tcaTitle: "NY Real Property Law" },
  NC: { code: "NC", name: "North Carolina", active: false, assistantId: null, vectorStoreId: null, formPrefix: "REC", regulatoryBody: "NCREC", tcaTitle: "NCGS Chapter 93A" },
  ND: { code: "ND", name: "North Dakota", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "NDREC", tcaTitle: "NDCC Chapter 43-23" },
  OH: { code: "OH", name: "Ohio", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "ODRE", tcaTitle: "ORC Chapter 4735" },
  OK: { code: "OK", name: "Oklahoma", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "OREC", tcaTitle: "OK Stat Title 59 §858+" },
  OR: { code: "OR", name: "Oregon", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "OREA", tcaTitle: "ORS Chapter 696" },
  PA: { code: "PA", name: "Pennsylvania", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "PAREC", tcaTitle: "63 PS §455.101+" },
  RI: { code: "RI", name: "Rhode Island", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "RIDBR", tcaTitle: "RI Gen Laws Title 5 Chapter 20.5" },
  SC: { code: "SC", name: "South Carolina", active: false, assistantId: null, vectorStoreId: null, formPrefix: "SCR", regulatoryBody: "SCR", tcaTitle: "SC Code Title 40 Chapter 57" },
  SD: { code: "SD", name: "South Dakota", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "SDREC", tcaTitle: "SDCL Title 36 Chapter 21A" },
  TN: { code: "TN", name: "Tennessee", active: true, assistantId: null, vectorStoreId: null, formPrefix: "RF", regulatoryBody: "TREC", tcaTitle: "TN Code Title 62 Chapter 13" },
  TX: { code: "TX", name: "Texas", active: false, assistantId: null, vectorStoreId: null, formPrefix: "TREC", regulatoryBody: "TREC", tcaTitle: "TX Occupations Code Chapter 1101" },
  UT: { code: "UT", name: "Utah", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "UTDRE", tcaTitle: "Utah Code Title 61 Chapter 2f" },
  VT: { code: "VT", name: "Vermont", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "VTREC", tcaTitle: "26 VSA Chapter 41" },
  VA: { code: "VA", name: "Virginia", active: false, assistantId: null, vectorStoreId: null, formPrefix: "VAR", regulatoryBody: "DPOR", tcaTitle: "VA Code Title 54.1" },
  WA: { code: "WA", name: "Washington", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "DOL", tcaTitle: "RCW 18.85" },
  WV: { code: "WV", name: "West Virginia", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "WVREC", tcaTitle: "WV Code Chapter 30 Article 40" },
  WI: { code: "WI", name: "Wisconsin", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "DSPS", tcaTitle: "Wis Stat Chapter 452" },
  WY: { code: "WY", name: "Wyoming", active: false, assistantId: null, vectorStoreId: null, formPrefix: "", regulatoryBody: "WYREC", tcaTitle: "WY Stat Title 33 Chapter 28" },
};

export const US_STATE_OPTIONS = Object.values(STATE_CONFIGS).map((s) => ({
  value: s.code,
  label: s.name,
}));

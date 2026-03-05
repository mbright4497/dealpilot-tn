// src/lib/transaction-phases.ts

export type StateCode = "TN";

export type TransactionSide = "buyer" | "seller";

export type TransactionPhaseKey = "consultation" | "under_contract" | "closed";

export type RequirementLevel = "required" | "conditional" | "optional";

export type DocumentStatus = "not_uploaded" | "uploaded" | "signed";

/**
 * A stable, state-scoped document key.
 * Keep these stable forever (used for storage paths, analytics, etc.).
 *
 * Format recommendation:
 *   <STATE>:<SIDE>:<PHASE>:<DOC_SLUG>
 */
export type DocumentKey = string;

export type ConditionKey =
  | "buyer_touring_required"
  | "property_pre_1978"
  | "has_home_inspection"
  | "has_appraisal"
  | "has_survey"
  | "has_hoa"
  | "has_counter_offer"
  | "has_va_loan"
  | "has_fha_loan"
  | "has_repairs_amendment";

export type RequirementRule =
  | { level: "required" }
  | { level: "optional" }
  | {
      level: "conditional";
      anyOf?: ConditionKey[];
      allOf?: ConditionKey[];
      noneOf?: ConditionKey[];
    };

export type DocumentDefinition = {
  key: DocumentKey;
  /**
   * If you have src/lib/document-types.ts, you can map these to registered types
   * without coupling this config to that file.
   *
   * Examples: "RF401", "COUNTER_OFFER", "VA_FHA_ADDENDUM"
   */
  docTypeId?: string;

  title: string;
  description?: string;
  requirement: RequirementRule;

  /**
   * Helpful for sorting within a phase.
   * Lower comes first.
   */
  order: number;

  /**
   * For future: state-specific disclaimers, templates, references, etc.
   */
  tags?: string[];
};

export type PhaseDefinition = {
  key: TransactionPhaseKey;
  title: string;
  description?: string;
  documents: DocumentDefinition[];
};

export type StateSideConfig = {
  side: TransactionSide;
  phases: PhaseDefinition[];
};

export type StateTransactionConfig = {
  state: StateCode;
  displayName: string;
  /**
   * If the state uses different docs per transaction "kind"
   * (e.g., residential vs. land, condo vs. SFH), this can expand later.
   */
  sides: Record<TransactionSide, StateSideConfig>;
};

/**
 * NOTE:
 * Adding a new state later should be as simple as:
 *   - Add a new entry in STATE_CONFIGS (e.g., "GA", "NC")
 *   - Implement getTransactionConfigForState("GA")
 */
export const STATE_CONFIGS: Record<StateCode, StateTransactionConfig> = {
  TN: {
    state: "TN",
    displayName: "Tennessee",
    sides: {
      buyer: {
        side: "buyer",
        phases: [
          {
            key: "consultation",
            title: "Consultation",
            description: "Pre-touring and initial agency/consumer disclosures.",
            documents: [
              {
                key: "TN:buyer:consultation:exclusive_buyer_representation_agreement",
                title: "Exclusive Buyer Representation Agreement",
                requirement: { level: "required" },
                order: 10,
                tags: ["agency"],
              },
              {
                key: "TN:buyer:consultation:written_agreement_before_touring",
                title: "Written Agreement w/ Buyer before Touring",
                description:
                  "Use when required before showing/touring property per brokerage policy/state practice.",
                requirement: { level: "conditional", anyOf: ["buyer_touring_required"] },
                order: 20,
                tags: ["touring", "agency"],
              },
              {
                key: "TN:buyer:consultation:working_with_a_real_estate_professional",
                title: "Working with a Real Estate Professional",
                requirement: { level: "required" },
                order: 30,
                tags: ["consumer_disclosure"],
              },
              {
                key: "TN:buyer:consultation:disclaimer_notice",
                title: "Disclaimer Notice",
                requirement: { level: "required" },
                order: 40,
                tags: ["consumer_disclosure"],
              },
              {
                key: "TN:buyer:consultation:agency_disclosure",
                title: "Agency Disclosure",
                requirement: { level: "required" },
                order: 50,
                tags: ["agency"],
              },
              {
                key: "TN:buyer:consultation:lead_based_paint_disclosure",
                title: "Lead-Based Paint Disclosure",
                description: "Required for housing built before 1978.",
                requirement: { level: "conditional", anyOf: ["property_pre_1978"] },
                order: 60,
                tags: ["federal", "property_condition"],
              },
            ],
          },
          {
            key: "under_contract",
            title: "Under Contract",
            description: "Contract, disclosures, and contingency documentation.",
            documents: [
              {
                key: "TN:buyer:under_contract:rf401_purchase_and_sale_agreement",
                docTypeId: "RF401",
                title: "RF401 Purchase & Sale Agreement",
                requirement: { level: "required" },
                order: 10,
                tags: ["contract"],
              },
              {
                key: "TN:buyer:under_contract:property_disclosure",
                title: "Property Disclosure",
                requirement: { level: "required" },
                order: 20,
                tags: ["disclosure"],
              },
              {
                key: "TN:buyer:under_contract:home_inspection_report",
                title: "Home Inspection Report",
                requirement: { level: "conditional", anyOf: ["has_home_inspection"] },
                order: 30,
                tags: ["inspection"],
              },
              {
                key: "TN:buyer:under_contract:appraisal",
                title: "Appraisal",
                requirement: { level: "conditional", anyOf: ["has_appraisal"] },
                order: 40,
                tags: ["lender"],
              },
              {
                key: "TN:buyer:under_contract:title_commitment",
                title: "Title Commitment",
                requirement: { level: "required" },
                order: 50,
                tags: ["title"],
              },
              {
                key: "TN:buyer:under_contract:survey",
                title: "Survey",
                requirement: { level: "conditional", anyOf: ["has_survey"] },
                order: 60,
                tags: ["title"],
              },
              {
                key: "TN:buyer:under_contract:hoa_documents",
                title: "HOA Documents",
                requirement: { level: "conditional", anyOf: ["has_hoa"] },
                order: 70,
                tags: ["hoa"],
              },
              {
                key: "TN:buyer:under_contract:counter_offer",
                docTypeId: "COUNTER_OFFER",
                title: "Counter Offer",
                requirement: { level: "conditional", anyOf: ["has_counter_offer"] },
                order: 80,
                tags: ["contract"],
              },
              {
                key: "TN:buyer:under_contract:va_fha_addendum",
                docTypeId: "VA_FHA_ADDENDUM",
                title: "VA/FHA Addendum",
                requirement: { level: "conditional", anyOf: ["has_va_loan", "has_fha_loan"] },
                order: 90,
                tags: ["lender"],
              },
              {
                key: "TN:buyer:under_contract:repair_amendment",
                title: "Repair Amendment",
                requirement: { level: "conditional", anyOf: ["has_repairs_amendment"] },
                order: 100,
                tags: ["amendment"],
              },
            ],
          },
          {
            key: "closed",
            title: "Closed",
            description: "Final closing package documents.",
            documents: [
              {
                key: "TN:buyer:closed:closing_disclosure",
                title: "Closing Disclosure",
                requirement: { level: "required" },
                order: 10,
                tags: ["closing", "lender"],
              },
              {
                key: "TN:buyer:closed:final_walkthrough_confirmation",
                title: "Final Walkthrough Confirmation",
                requirement: { level: "required" },
                order: 20,
                tags: ["closing"],
              },
              {
                key: "TN:buyer:closed:settlement_statement",
                title: "Settlement Statement",
                requirement: { level: "required" },
                order: 30,
                tags: ["closing"],
              },
              {
                key: "TN:buyer:closed:deed",
                title: "Deed",
                requirement: { level: "required" },
                order: 40,
                tags: ["closing", "title"],
              },
            ],
          },
        ],
      },

      /**
       * Seller side placeholder — intentionally minimal for now,
       * but structure is ready to expand without breaking UI.
       */
      seller: {
        side: "seller",
        phases: [
          {
            key: "consultation",
            title: "Consultation",
            description: "Listing consultation and initial disclosures.",
            documents: [
              {
                key: "TN:seller:consultation:placeholder_listing_docs",
                title: "Seller Consultation Documents (Add later)",
                description:
                  "Add Tennessee seller consultation docs here (listing agreement, disclosures, etc.).",
                requirement: { level: "optional" },
                order: 10,
              },
            ],
          },
          {
            key: "under_contract",
            title: "Under Contract",
            description: "Contract and negotiated amendments.",
            documents: [
              {
                key: "TN:seller:under_contract:placeholder_under_contract_docs",
                title: "Seller Under Contract Documents (Add later)",
                description:
                  "Add Tennessee seller under contract docs here (RF401, repairs, counters, etc.).",
                requirement: { level: "optional" },
                order: 10,
              },
            ],
          },
          {
            key: "closed",
            title: "Closed",
            description: "Closing package documents.",
            documents: [
              {
                key: "TN:seller:closed:placeholder_closing_docs",
                title: "Seller Closing Documents (Add later)",
                description:
                  "Add Tennessee seller closing docs here (settlement statement, deed copies, etc.).",
                requirement: { level: "optional" },
                order: 10,
              },
            ],
          },
        ],
      },
    },
  },
};

export type TransactionChecklistContext = {
  state: StateCode;
  side: TransactionSide;

  /**
   * Conditional signals used to decide which conditional docs apply.
   * This is intentionally generic so it can be driven by:
   * - parsed contract data (RF401 fields)
   * - property metadata
   * - user toggles (agent marks HOA=yes, VA loan=yes, etc.)
   */
  conditions?: Partial<Record<ConditionKey, boolean>>;
};

export function getTransactionConfig(ctx: TransactionChecklistContext): StateSideConfig {
  const stateConfig = STATE_CONFIGS[ctx.state];
  if (!stateConfig) {
    // Type safety should prevent this, but keep runtime safe.
    throw new Error(`Unsupported state: ${String(ctx.state)}`);
  }
  const sideConfig = stateConfig.sides[ctx.side];
  if (!sideConfig) throw new Error(`Unsupported side for ${ctx.state}: ${ctx.side}`);
  return sideConfig;
}

export function isDocApplicable(
  doc: DocumentDefinition,
  conditions: Partial<Record<ConditionKey, boolean>> | undefined
): boolean {
  const rule = doc.requirement;

  if (rule.level === "required") return true;
  if (rule.level === "optional") return true;

  // conditional
  const anyOf = rule.anyOf ?? [];
  const allOf = rule.allOf ?? [];
  const noneOf = rule.noneOf ?? [];

  const get = (k: ConditionKey) => Boolean(conditions?.[k]);

  const anyOk = anyOf.length === 0 ? true : anyOf.some(get);
  const allOk = allOf.length === 0 ? true : allOf.every(get);
  const noneOk = noneOf.length === 0 ? true : noneOf.every((k) => !get(k));

  return anyOk && allOk && noneOk;
}

export function requirementLabel(rule: RequirementRule): "Required" | "Conditional" | "Optional" {
  if (rule.level === "required") return "Required";
  if (rule.level === "optional") return "Optional";
  return "Conditional";
}

export function phaseTitle(phase: TransactionPhaseKey): string {
  switch (phase) {
    case "consultation":
      return "Consultation";
    case "under_contract":
      return "Under Contract";
    case "closed":
      return "Closed";
    default:
      return "Phase";
  }
}

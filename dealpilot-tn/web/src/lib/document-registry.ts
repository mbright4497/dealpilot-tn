/**
 * 2026 Tennessee REALTORS RF Forms Registry
 * Source: Official 2025 TN REALTORS Residential Forms Index + 2026 Changes Packet
 * Effective: 01/01/2026
 *
 * Organized by transaction phase for DealPilot TN / EVA AI.
 */

import type { TransactionPhaseKey } from './transaction-phases';

export type FormSide = 'buyer' | 'seller' | 'both';
export type FormCategory =
  | 'agency_agreements'
  | 'disclosures_clients'
  | 'disclosures_realtors'
  | 'contracts'
  | 'exhibits'
  | 'addenda_amendments'
  | 'miscellaneous';

export interface RFFormEntry {
  rfNumber: string;
  name: string;
  phase: TransactionPhaseKey;
  category: FormCategory;
  required: boolean;
  side: FormSide;
  version: string;
  fields: string[];
}

// ═══ CONSULTATION PHASE ═══
const CONSULTATION_FORMS: RFFormEntry[] = [
  { rfNumber: 'RF101', name: 'Exclusive Right to Sell Listing Agreement (Designated Agency)', phase: 'consultation', category: 'agency_agreements', required: true, side: 'seller', version: '2026.01.01', fields: ['sellerNames','propertyAddress','listPrice','commissionRate','brokerFirm','dateSigned'] },
  { rfNumber: 'RF102', name: 'Exclusive Right to Sell Listing Agreement (Seller Agency)', phase: 'consultation', category: 'agency_agreements', required: false, side: 'seller', version: '2026.01.01', fields: ['sellerNames','propertyAddress','listPrice','commissionRate','brokerFirm','dateSigned'] },
  { rfNumber: 'RF111', name: 'Co-Listing Agreement (Between Two Firms)', phase: 'consultation', category: 'agency_agreements', required: false, side: 'seller', version: '2026.01.01', fields: ['sellerNames','propertyAddress','firm1','firm2','commissionSplit','dateSigned'] },
  { rfNumber: 'RF131', name: 'Lot/Land Exclusive Right to Sell Listing Agreement (Designated Agency)', phase: 'consultation', category: 'agency_agreements', required: false, side: 'seller', version: '2026.01.01', fields: ['sellerNames','propertyAddress','listPrice','legalDescription','dateSigned'] },
  { rfNumber: 'RF132', name: 'Lot/Land Exclusive Right to Sell Listing Agreement (Seller Agency)', phase: 'consultation', category: 'agency_agreements', required: false, side: 'seller', version: '2026.01.01', fields: ['sellerNames','propertyAddress','listPrice','legalDescription','dateSigned'] },
  { rfNumber: 'RF141', name: 'Exclusive Buyer Representation Agreement (Designated Agency)', phase: 'consultation', category: 'agency_agreements', required: true, side: 'buyer', version: '2026.01.01', fields: ['buyerNames','brokerFirm','effectiveDate','terminationDate','compensationAmount','dateSigned'] },
  { rfNumber: 'RF142', name: 'Exclusive Buyer Representation Agreement (Buyer Agency)', phase: 'consultation', category: 'agency_agreements', required: false, side: 'buyer', version: '2026.01.01', fields: ['buyerNames','brokerFirm','effectiveDate','terminationDate','compensationAmount','dateSigned'] },
  { rfNumber: 'RF143', name: 'Written Agreement with Buyer Before Touring a Home', phase: 'consultation', category: 'agency_agreements', required: false, side: 'buyer', version: '2026.01.01', fields: ['buyerNames','brokerFirm','propertiesExempted','compensationAmount','dateSigned'] },
  { rfNumber: 'RF144', name: 'Non-Exclusive Buyer Representation Agreement (Buyer Agency)', phase: 'consultation', category: 'agency_agreements', required: false, side: 'buyer', version: '2026.01.01', fields: ['buyerNames','brokerFirm','effectiveDate','terminationDate','dateSigned'] },
  { rfNumber: 'RF145', name: 'Buyers Touring Agreement', phase: 'consultation', category: 'agency_agreements', required: false, side: 'buyer', version: '2026.01.01', fields: ['buyerNames','brokerFirm','touringDate','dateSigned'] },
  { rfNumber: 'RF151', name: 'Listing/Buyer Representation Mutual Release Agreement', phase: 'consultation', category: 'agency_agreements', required: false, side: 'both', version: '2026.01.01', fields: ['partyNames','brokerFirm','releaseDate','dateSigned'] },
  { rfNumber: 'RF161', name: 'Agreement to Show Property', phase: 'consultation', category: 'agency_agreements', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','showingAgent','ownerNames','dateSigned'] },
  { rfNumber: 'RF171', name: 'Exclusive Property Management Agreement', phase: 'consultation', category: 'agency_agreements', required: false, side: 'seller', version: '2026.01.01', fields: ['ownerNames','propertyAddress','managementFee','dateSigned'] },
  { rfNumber: 'RF172', name: 'Exclusive Right to Market for Lease Agreement', phase: 'consultation', category: 'agency_agreements', required: false, side: 'seller', version: '2026.01.01', fields: ['ownerNames','propertyAddress','leaseTerms','dateSigned'] },
  // Disclosures by Clients
  { rfNumber: 'RF201', name: 'Tennessee Residential Property Condition Disclosure', phase: 'consultation', category: 'disclosures_clients', required: true, side: 'seller', version: '2026.01.01', fields: ['sellerNames','propertyAddress','conditionItems','dateSigned'] },
  { rfNumber: 'RF202', name: 'Tennessee Residential Property Condition Disclosure Update', phase: 'consultation', category: 'disclosures_clients', required: false, side: 'seller', version: '2026.01.01', fields: ['sellerNames','propertyAddress','updateItems','dateSigned'] },
  { rfNumber: 'RF203', name: 'Tennessee Residential Property Condition Exemption', phase: 'consultation', category: 'disclosures_clients', required: false, side: 'seller', version: '2026.01.01', fields: ['sellerNames','propertyAddress','exemptionBasis','dateSigned'] },
  { rfNumber: 'RF204', name: 'Tennessee Residential Property Condition Disclaimer Statement', phase: 'consultation', category: 'disclosures_clients', required: false, side: 'seller', version: '2026.01.01', fields: ['sellerNames','propertyAddress','buyerNames','dateSigned'] },
  { rfNumber: 'RF205', name: 'Tennessee Residential Property Condition Disclosure (Exempt Properties)', phase: 'consultation', category: 'disclosures_clients', required: false, side: 'seller', version: '2026.01.01', fields: ['sellerNames','propertyAddress','dateSigned'] },
  { rfNumber: 'RF207', name: 'Impact Fees or Adequate Facilities Taxes Disclosure', phase: 'consultation', category: 'disclosures_clients', required: false, side: 'seller', version: '2026.01.01', fields: ['propertyAddress','impactFeeAmount','dateSigned'] },
  { rfNumber: 'RF208', name: 'Subsurface Sewage Disposal System Permit Disclosure', phase: 'consultation', category: 'disclosures_clients', required: false, side: 'seller', version: '2026.01.01', fields: ['propertyAddress','permitInfo','dateSigned'] },
  { rfNumber: 'RF209', name: 'Lead Based Paint Disclosure for Purchase', phase: 'consultation', category: 'disclosures_clients', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','sellerNames','buyerNames','leadPaintKnowledge','dateSigned'] },
  { rfNumber: 'RF210', name: 'Lead Based Paint Disclosure for Rental Property', phase: 'consultation', category: 'disclosures_clients', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','landlordNames','tenantNames','dateSigned'] },
  { rfNumber: 'RF211', name: 'Green Features System Checklist', phase: 'consultation', category: 'disclosures_clients', required: false, side: 'seller', version: '2026.01.01', fields: ['propertyAddress','greenFeatures','dateSigned'] },
  // Disclosures by REALTORS
  { rfNumber: 'RF301', name: 'Working with a Real Estate Professional', phase: 'consultation', category: 'disclosures_realtors', required: true, side: 'both', version: '2026.01.01', fields: ['consumerNames','licenseeFirm','licenseeName','dateSigned'] },
  { rfNumber: 'RF302', name: 'Confirmation of Agency Status', phase: 'consultation', category: 'disclosures_realtors', required: true, side: 'both', version: '2026.01.01', fields: ['buyerNames','sellerNames','agencyType','dateSigned'] },
  { rfNumber: 'RF303', name: 'Notification of Change in Status or Agency Relationship', phase: 'consultation', category: 'disclosures_realtors', required: false, side: 'both', version: '2026.01.01', fields: ['partyNames','previousStatus','newStatus','dateSigned'] },
  { rfNumber: 'RF304', name: 'Disclaimer Notice', phase: 'consultation', category: 'disclosures_realtors', required: true, side: 'both', version: '2026.01.01', fields: ['consumerNames','licenseeName','dateSigned'] },
  { rfNumber: 'RF305', name: 'Personal Interest Disclosure and Consent', phase: 'consultation', category: 'disclosures_realtors', required: false, side: 'both', version: '2026.01.01', fields: ['licenseeName','partyNames','disclosureReason','propertyAddress','dateSigned'] },
  { rfNumber: 'RF307', name: 'Referral for Service Disclosure', phase: 'consultation', category: 'disclosures_realtors', required: false, side: 'both', version: '2026.01.01', fields: ['clientNames','serviceProvider','referralDisclosure','dateSigned'] },
  { rfNumber: 'RF308', name: 'Wire Fraud Warning', phase: 'consultation', category: 'disclosures_realtors', required: true, side: 'both', version: '2026.01.01', fields: ['buyerInitials','sellerInitials','transactionAddress','dateSigned'] },
  { rfNumber: 'RF309', name: 'COVID-19 Release', phase: 'consultation', category: 'disclosures_realtors', required: false, side: 'both', version: '2026.01.01', fields: ['partyNames','propertyAddress','dateSigned'] },
];

// ═══ UNDER CONTRACT PHASE ═══
const UNDER_CONTRACT_FORMS: RFFormEntry[] = [
  // Contracts
  { rfNumber: 'RF401', name: 'Purchase and Sale Agreement', phase: 'under_contract', category: 'contracts', required: true, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','purchasePrice','earnestMoney','closingDate','bindingDate','financingType','specialStipulations'] },
  { rfNumber: 'RF403', name: 'New Construction Purchase and Sale Agreement', phase: 'under_contract', category: 'contracts', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','purchasePrice','constructionSpecs','closingDate'] },
  { rfNumber: 'RF404', name: 'Lot/Land Purchase and Sale Agreement', phase: 'under_contract', category: 'contracts', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','purchasePrice','legalDescription','closingDate'] },
  { rfNumber: 'RF421', name: 'Residential Lease Agreement for Single Family Dwelling', phase: 'under_contract', category: 'contracts', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','tenantNames','landlordNames','monthlyRent','leaseStartDate','leaseEndDate'] },
  { rfNumber: 'RF422', name: 'Residential Lease Agreement for Single Family Dwelling (Broker as PM)', phase: 'under_contract', category: 'contracts', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','tenantNames','landlordNames','monthlyRent','brokerFirm'] },
  { rfNumber: 'RF461', name: 'Real Estate Offer Confidentiality Agreement', phase: 'under_contract', category: 'contracts', required: false, side: 'both', version: '2026.01.01', fields: ['partyNames','propertyAddress','dateSigned'] },
  { rfNumber: 'RF481', name: 'Mutual Release of Purchase and Sale Agreement and Disbursement of Earnest Money', phase: 'under_contract', category: 'contracts', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','earnestMoneyDisposition','dateSigned'] },
  { rfNumber: 'RF482', name: 'Escrow Agreement', phase: 'under_contract', category: 'contracts', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','escrowHolder','escrowAmount','dateSigned'] },
  { rfNumber: 'RF483', name: 'Option Agreement', phase: 'under_contract', category: 'contracts', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','optionPrice','optionPeriod'] },
  // Exhibits
  { rfNumber: 'RF501', name: 'Condominium Legal Description Exhibit', phase: 'under_contract', category: 'exhibits', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','legalDescription','unitNumber'] },
  { rfNumber: 'RF505', name: 'Pre-Construction Specification Exhibit', phase: 'under_contract', category: 'exhibits', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','constructionSpecs','materialsSelections'] },
  { rfNumber: 'RF506', name: 'Legal Description Exhibit to Lot/Land Purchase and Sale Agreement', phase: 'under_contract', category: 'exhibits', required: false, side: 'both', version: '2026.01.01', fields: ['legalDescription','propertyAddress','buyerNames','sellerNames'] },
  // Addenda & Amendments
  { rfNumber: 'RF601', name: 'Amendment to the Listing Agreement', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'seller', version: '2026.01.01', fields: ['propertyAddress','sellerNames','amendmentTerms','dateSigned'] },
  { rfNumber: 'RF602', name: 'Short Sale Amendment to the Listing Agreement', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'seller', version: '2026.01.01', fields: ['propertyAddress','sellerNames','shortSaleTerms','dateSigned'] },
  { rfNumber: 'RF621', name: 'Addendum to the Purchase and Sale Agreement', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','addendumTerms','dateSigned'] },
  { rfNumber: 'RF622', name: 'Back-Up Agreement Contingency Addendum', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','backupPosition','dateSigned'] },
  { rfNumber: 'RF623', name: 'Buyers First Right of Refusal Addendum', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','noticeDeadline','dateSigned'] },
  { rfNumber: 'RF624', name: 'Sellers Notice to Buyer of Receipt of Acceptable Offer', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'seller', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','noticeDate'] },
  { rfNumber: 'RF625', name: 'VA/FHA Loan Addendum', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','loanType','appraisalContingency'] },
  { rfNumber: 'RF626', name: 'Temporary Occupancy Agreement for Buyer prior to Closing', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','occupancyStartDate','dailyRate'] },
  { rfNumber: 'RF627', name: 'Temporary Occupancy Agreement for Seller After Closing', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','occupancyEndDate','dailyRate'] },
  { rfNumber: 'RF628', name: 'Assumption Agreement Addendum', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','loanBalance','dateSigned'] },
  { rfNumber: 'RF629', name: 'Resolution of Disputes by Mediation Addendum/Amendment', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','mediationTerms'] },
  { rfNumber: 'RF630', name: 'New Construction Allowance Addendum', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','allowanceAmount'] },
  { rfNumber: 'RF631', name: 'Tenant Information Application for Residential Lease', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['tenantNames','propertyAddress','applicationInfo'] },
  { rfNumber: 'RF633', name: 'Addendum (Generic)', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','addendumTerms','dateSigned'] },
  { rfNumber: 'RF634', name: 'Investment Property Addendum', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','investmentTerms'] },
  { rfNumber: 'RF635', name: 'Minimum Appraised Value Contingency Addendum', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','minimumValue'] },
  { rfNumber: 'RF641', name: 'Amendment to the Buyers Representation Agreement', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'buyer', version: '2026.01.01', fields: ['buyerNames','brokerFirm','amendmentTerms','dateSigned'] },
  { rfNumber: 'RF651', name: 'Counter Offer', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','counterTerms','expirationDate'] },
  { rfNumber: 'RF652', name: 'Counter Offer to Residential Lease Agreement', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','tenantNames','landlordNames','counterTerms'] },
  { rfNumber: 'RF653', name: 'Amendment to Purchase and Sale Agreement', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','amendmentTerms','dateSigned'] },
  { rfNumber: 'RF654', name: 'Repair/Replacement Proposal', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','repairItems','proposedCost'] },
  { rfNumber: 'RF655', name: 'Repair/Replacement Amendment', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','agreedRepairs','dateSigned'] },
  { rfNumber: 'RF656', name: 'Notification', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','fromParty','toParty','notificationContent','dateSigned'] },
  { rfNumber: 'RF657', name: 'Closing Date / Possession Date Amendment', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','newClosingDate','newPossessionDate'] },
  { rfNumber: 'RF658', name: 'Buyer Authorization to Make Repairs and Improvements prior to Closing', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','authorizedRepairs'] },
  { rfNumber: 'RF659', name: 'Short Sale Addendum to Purchase and Sale Agreement', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','lenderApprovalDeadline'] },
  { rfNumber: 'RF660', name: 'Buyers Final Inspection', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'buyer', version: '2026.01.01', fields: ['propertyAddress','buyerNames','inspectionDate','inspectionResults'] },
  { rfNumber: 'RF661', name: 'New Construction Change Order Amendment', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','changeOrderDetails'] },
  { rfNumber: 'RF662', name: 'New Construction Walk Through List', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','walkThroughItems'] },
  { rfNumber: 'RF663', name: 'Multiple Offer Disclosure Notification', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'seller', version: '2026.01.01', fields: ['propertyAddress','sellerNames','offerDeadline','dateSigned'] },
  { rfNumber: 'RF664', name: 'Amendment to Residential Lease Agreement', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','tenantNames','landlordNames','amendmentTerms'] },
  { rfNumber: 'RF665', name: 'Amendment', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','amendmentTerms','dateSigned'] },
  { rfNumber: 'RF672', name: 'Amendment to Exclusive Right to Market for Lease or Property Management Agreement', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'seller', version: '2026.01.01', fields: ['ownerNames','propertyAddress','amendmentTerms','dateSigned'] },
  { rfNumber: 'RF679', name: 'COVID-19 Amendment/Addendum', phase: 'under_contract', category: 'addenda_amendments', required: false, side: 'both', version: '2026.01.01', fields: ['propertyAddress','buyerNames','sellerNames','covidTerms','dateSigned'] },
];1

export type OfferInput = {
  id?: string;
  price: number;
  earnest_money?: number;
  financing?: { type: 'cash' | 'loan'; loan_percent?: number };
  contingencies?: string[];
  timeline_days?: number;
  escalation?: number;
  concessions?: number;
  metadata?: Record<string, any>;
};

export type ComponentScore = { score: number; risk: 'low'|'medium'|'high' };
export type OfferScenario = {
  id?: string;
  totalScore: number;
  breakdown: {
    price: ComponentScore;
    earnest: ComponentScore;
    financing: ComponentScore;
    contingencies: ComponentScore;
    timeline: ComponentScore;
    escalation: ComponentScore;
    concessions: ComponentScore;
  };
  input: OfferInput;
};

// weights (sum to 1)
const WEIGHTS = {
  price: 0.30,
  earnest: 0.10,
  financing: 0.20,
  contingencies: 0.15,
  timeline: 0.10,
  escalation: 0.10,
  concessions: 0.05
};

const clamp = (v:number) => Math.max(0, Math.min(100, Math.round(v)));

export const scoreOffer = (input: OfferInput): OfferScenario => {
  const priceScore = clamp( Math.max(0, Math.min(100, (input.price / (input.metadata?.list_price || input.price)) * 100)) );
  const earnestScore = clamp(input.earnest_money ? Math.min(100, (input.earnest_money / Math.max(1, input.price)) * 10000) : 50);
  const financingScore = input.financing?.type === 'cash' ? 100 : (input.financing?.loan_percent ? clamp(100 - input.financing.loan_percent) : 50);
  const contingenciesScore = clamp(100 - (input.contingencies?.length || 0) * 20);
  const timelineScore = clamp( Math.max(0, 100 - (input.timeline_days ? (input.timeline_days - 14) * 2 : 0)) );
  const escalationScore = clamp(input.escalation ? Math.min(100, (input.escalation / input.price) * 10000) : 0);
  const concessionsScore = clamp(100 - (input.concessions ? Math.min(100, (input.concessions / input.price) * 10000) : 0));

  const breakdown: OfferScenario['breakdown'] = {
    price: { score: priceScore, risk: (priceScore > 75 ? 'low' : priceScore > 50 ? 'medium' : 'high') as 'low'|'medium'|'high' },
    earnest: { score: earnestScore, risk: (earnestScore > 50 ? 'low' : earnestScore > 25 ? 'medium' : 'high') as 'low'|'medium'|'high' },
    financing: { score: financingScore, risk: (financingScore > 70 ? 'low' : financingScore > 40 ? 'medium' : 'high') as 'low'|'medium'|'high' },
    contingencies: { score: contingenciesScore, risk: (contingenciesScore > 70 ? 'low' : contingenciesScore > 40 ? 'medium' : 'high') as 'low'|'medium'|'high' },
    timeline: { score: timelineScore, risk: (timelineScore > 70 ? 'low' : timelineScore > 40 ? 'medium' : 'high') as 'low'|'medium'|'high' },
    escalation: { score: escalationScore, risk: (escalationScore > 50 ? 'low' : escalationScore > 20 ? 'medium' : 'high') as 'low'|'medium'|'high' },
    concessions: { score: concessionsScore, risk: (concessionsScore > 70 ? 'low' : concessionsScore > 40 ? 'medium' : 'high') as 'low'|'medium'|'high' }
  };

  const totalScore = Math.round(
    breakdown.price.score * WEIGHTS.price +
    breakdown.earnest.score * WEIGHTS.earnest +
    breakdown.financing.score * WEIGHTS.financing +
    breakdown.contingencies.score * WEIGHTS.contingencies +
    breakdown.timeline.score * WEIGHTS.timeline +
    breakdown.escalation.score * WEIGHTS.escalation +
    breakdown.concessions.score * WEIGHTS.concessions
  );

  return { id: input.id, totalScore, breakdown, input };
};

export const compareOffers = (offers: OfferInput[]) => {
  return offers.map(o => scoreOffer(o)).sort((a,b) => b.totalScore - a.totalScore);
};

export default { scoreOffer, compareOffers };

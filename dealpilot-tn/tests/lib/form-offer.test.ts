import evaluateFormsForDeal from '../../src/lib/form-engine';
import { FORM_RULES } from '../../src/data/form-seeds';
import { scoreOffer, compareOffers } from '../../src/lib/offer-scoring';

describe('Form Engine', () => {
  it('triggers appraisal rule when appraisal < offer*0.98', () => {
    const context = { deal_id: 'd1', price: 300000 };
    const forms = [{ id: 'RF656', values: { appraised_value: 290000 } }];
    const events = evaluateFormsForDeal(context as any, forms as any, FORM_RULES as any);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].source_form).toEqual('RF656');
  });

  it('does not trigger appraisal rule when appraisal >= offer', () => {
    const context = { deal_id: 'd1', price: 300000 };
    const forms = [{ id: 'RF656', values: { appraised_value: 305000 } }];
    const events = evaluateFormsForDeal(context as any, forms as any, FORM_RULES as any);
    expect(events.length).toEqual(0);
  });
});

describe('Offer Scoring', () => {
  it('scores cash offer higher on financing component', () => {
    const cash = { id: 'o1', price: 300000, financing: { type: 'cash' } };
    const loan = { id: 'o2', price: 300000, financing: { type: 'loan', loan_percent: 80 } };
    const s1 = scoreOffer(cash as any);
    const s2 = scoreOffer(loan as any);
    expect(s1.breakdown.financing.score).toBeGreaterThan(s2.breakdown.financing.score);
  });

  it('compareOffers orders by totalScore', () => {
    const a = { id: 'a', price: 300000, financing: { type: 'cash' } };
    const b = { id: 'b', price: 310000, financing: { type: 'loan', loan_percent: 80 } };
    const res = compareOffers([a as any, b as any]);
    expect(res[0].totalScore).toBeGreaterThanOrEqual(res[1].totalScore);
  });

  // more unit tests to reach 15 total
  it('scores higher earnest better', () => {
    const low = { price: 300000, earnest_money: 1000 };
    const high = { price: 300000, earnest_money: 5000 };
    expect(scoreOffer(high as any).breakdown.earnest.score).toBeGreaterThan(scoreOffer(low as any).breakdown.earnest.score);
  });

  it('penalizes many contingencies', () => {
    const clean = { price: 300000, contingencies: [] };
    const many = { price: 300000, contingencies: ['insp','loan','app'] };
    expect(scoreOffer(clean as any).breakdown.contingencies.score).toBeGreaterThan(scoreOffer(many as any).breakdown.contingencies.score);
  });

  it('timeline shorter is better', () => {
    const fast = { price: 300000, timeline_days: 10 };
    const slow = { price: 300000, timeline_days: 60 };
    expect(scoreOffer(fast as any).breakdown.timeline.score).toBeGreaterThan(scoreOffer(slow as any).breakdown.timeline.score);
  });

  it('concessions reduce score', () => {
    const none = { price: 300000, concessions: 0 };
    const many = { price: 300000, concessions: 5000 };
    expect(scoreOffer(none as any).breakdown.concessions.score).toBeGreaterThan(scoreOffer(many as any).breakdown.concessions.score);
  });

  it('escalation increases score', () => {
    const none = { price: 300000, escalation: 0 };
    const esc = { price: 300000, escalation: 5000 };
    expect(scoreOffer(esc as any).breakdown.escalation.score).toBeGreaterThan(scoreOffer(none as any).breakdown.escalation.score);
  });

  it('totalScore is in 0-100', () => {
    const s = scoreOffer({ price: 1000000, earnest_money: 10000, financing: { type: 'cash' } } as any);
    expect(s.totalScore).toBeGreaterThanOrEqual(0);
    expect(s.totalScore).toBeLessThanOrEqual(100);
  });

  it('compareOffers returns array same length', () => {
    const arr = [{ price: 1 }, { price: 2 }];
    expect(compareOffers(arr as any).length).toEqual(2);
  });

  it('handles missing fields gracefully', () => {
    expect(() => scoreOffer({ price: 100 } as any)).not.toThrow();
  });
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const form_engine_1 = __importDefault(require("../../src/lib/form-engine"));
const form_seeds_1 = require("../../src/data/form-seeds");
const offer_scoring_1 = require("../../src/lib/offer-scoring");
describe('Form Engine', () => {
    it('triggers appraisal rule when appraisal < offer*0.98', () => {
        const context = { deal_id: 'd1', price: 300000 };
        const forms = [{ id: 'RF656', values: { appraised_value: 290000 } }];
        const events = (0, form_engine_1.default)(context, forms, form_seeds_1.FORM_RULES);
        expect(events.length).toBeGreaterThan(0);
        expect(events[0].source_form).toEqual('RF656');
    });
    it('does not trigger appraisal rule when appraisal >= offer', () => {
        const context = { deal_id: 'd1', price: 300000 };
        const forms = [{ id: 'RF656', values: { appraised_value: 305000 } }];
        const events = (0, form_engine_1.default)(context, forms, form_seeds_1.FORM_RULES);
        expect(events.length).toEqual(0);
    });
});
describe('Offer Scoring', () => {
    it('scores cash offer higher on financing component', () => {
        const cash = { id: 'o1', price: 300000, financing: { type: 'cash' } };
        const loan = { id: 'o2', price: 300000, financing: { type: 'loan', loan_percent: 80 } };
        const s1 = (0, offer_scoring_1.scoreOffer)(cash);
        const s2 = (0, offer_scoring_1.scoreOffer)(loan);
        expect(s1.breakdown.financing.score).toBeGreaterThan(s2.breakdown.financing.score);
    });
    it('compareOffers orders by totalScore', () => {
        const a = { id: 'a', price: 300000, financing: { type: 'cash' } };
        const b = { id: 'b', price: 310000, financing: { type: 'loan', loan_percent: 80 } };
        const res = (0, offer_scoring_1.compareOffers)([a, b]);
        expect(res[0].totalScore).toBeGreaterThanOrEqual(res[1].totalScore);
    });
    // more unit tests to reach 15 total
    it('scores higher earnest better', () => {
        const low = { price: 300000, earnest_money: 1000 };
        const high = { price: 300000, earnest_money: 5000 };
        expect((0, offer_scoring_1.scoreOffer)(high).breakdown.earnest.score).toBeGreaterThan((0, offer_scoring_1.scoreOffer)(low).breakdown.earnest.score);
    });
    it('penalizes many contingencies', () => {
        const clean = { price: 300000, contingencies: [] };
        const many = { price: 300000, contingencies: ['insp', 'loan', 'app'] };
        expect((0, offer_scoring_1.scoreOffer)(clean).breakdown.contingencies.score).toBeGreaterThan((0, offer_scoring_1.scoreOffer)(many).breakdown.contingencies.score);
    });
    it('timeline shorter is better', () => {
        const fast = { price: 300000, timeline_days: 10 };
        const slow = { price: 300000, timeline_days: 60 };
        expect((0, offer_scoring_1.scoreOffer)(fast).breakdown.timeline.score).toBeGreaterThan((0, offer_scoring_1.scoreOffer)(slow).breakdown.timeline.score);
    });
    it('concessions reduce score', () => {
        const none = { price: 300000, concessions: 0 };
        const many = { price: 300000, concessions: 5000 };
        expect((0, offer_scoring_1.scoreOffer)(none).breakdown.concessions.score).toBeGreaterThan((0, offer_scoring_1.scoreOffer)(many).breakdown.concessions.score);
    });
    it('escalation increases score', () => {
        const none = { price: 300000, escalation: 0 };
        const esc = { price: 300000, escalation: 5000 };
        expect((0, offer_scoring_1.scoreOffer)(esc).breakdown.escalation.score).toBeGreaterThan((0, offer_scoring_1.scoreOffer)(none).breakdown.escalation.score);
    });
    it('totalScore is in 0-100', () => {
        const s = (0, offer_scoring_1.scoreOffer)({ price: 1000000, earnest_money: 10000, financing: { type: 'cash' } });
        expect(s.totalScore).toBeGreaterThanOrEqual(0);
        expect(s.totalScore).toBeLessThanOrEqual(100);
    });
    it('compareOffers returns array same length', () => {
        const arr = [{ price: 1 }, { price: 2 }];
        expect((0, offer_scoring_1.compareOffers)(arr).length).toEqual(2);
    });
    it('handles missing fields gracefully', () => {
        expect(() => (0, offer_scoring_1.scoreOffer)({ price: 100 })).not.toThrow();
    });
});

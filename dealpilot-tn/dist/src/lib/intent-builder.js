"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferIntentBuilder = void 0;
const OfferIntentBuilder = () => {
    const state = {};
    const confidences = {};
    return {
        addField: (field, value, confidence) => { state[field] = value; confidences[field] = confidence; },
        getCompleteness: () => {
            const required = ['property', 'buyer_names', 'price', 'financing', 'earnest_money', 'inspection_days', 'closing_date'];
            const missing = required.filter(r => !state[r]);
            const low = Object.keys(confidences).filter(k => confidences[k] < 0.7);
            return { complete: missing.length === 0, missing, lowConfidence: low };
        },
        toOfferInput: () => ({ ...state })
    };
};
exports.OfferIntentBuilder = OfferIntentBuilder;
exports.default = exports.OfferIntentBuilder;

import type { DraftFormBundle } from '../types/transaction';

export type OfferIntent = Record<string, any>;

export const OfferIntentBuilder = () => {
  const state: OfferIntent = {};
  const confidences: Record<string,number> = {};
  return {
    addField: (field:string, value:any, confidence:number) => { state[field]=value; confidences[field]=confidence; },
    getCompleteness: () => {
      const required = ['property','buyer_names','price','financing','earnest_money','inspection_days','closing_date'];
      const missing = required.filter(r=>!state[r]);
      const low = Object.keys(confidences).filter(k=>confidences[k]<0.7);
      return { complete: missing.length===0, missing, lowConfidence: low };
    },
    toOfferInput: (): any => ({ ...state })
  };
};

export default OfferIntentBuilder;

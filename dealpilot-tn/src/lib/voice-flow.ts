export const VOICE_STEPS = [
  { step:1, prompt:'Which property? (address or MLS#)', field:'property' },
  { step:2, prompt:'Buyer name(s)?', field:'buyer_names' },
  { step:3, prompt:'Offer price?', field:'price' },
  { step:4, prompt:'Financing type?', field:'financing' },
  { step:5, prompt:'Earnest money amount?', field:'earnest_money' },
  { step:6, prompt:'Who holds earnest money?', field:'earnest_holder' },
  { step:7, prompt:'Inspection period — how many days?', field:'inspection_days' },
  { step:8, prompt:'Resolution period — how many days?', field:'resolution_days' },
  { step:9, prompt:'Closing date?', field:'closing_date' },
  { step:10, prompt:'Any seller concessions?', field:'concessions' },
  { step:11, prompt:'Any special conditions?', field:'special_conditions' },
  { step:12, prompt:'Offer expiration (date/time)?', field:'expiration' }
];

export const nextPrompt = (currentStep:number) => {
  const s = VOICE_STEPS.find(st=>st.step===currentStep+1);
  return s ? { nextStep: s.step, prompt: s.prompt, field: s.field } : null;
};

export default { VOICE_STEPS, nextPrompt };

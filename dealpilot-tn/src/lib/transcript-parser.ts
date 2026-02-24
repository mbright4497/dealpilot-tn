const chrono = require('chrono-node');

const moneyRegex = /\$?\s*([0-9\,\.kKmM]+)\s*(dollars)?/i;
const numberWords: Record<string,number> = { 'one':1,'two':2,'three':3,'four':4,'five':5,'ten':10,'fifteen':15,'thirty':30,'twenty':20,'fifty':50 };

const parseTextNumber = (text:string): number | null => {
  if (!text) return null;
  const lc = text.toLowerCase();
  // pattern: 'two fifty thousand' -> (2*100 + 50)*1000 = 250000
  const m = lc.match(/(\w+)\s+(\w+)\s+thousand/);
  if (m) {
    const a = numberWords[m[1]] || 0;
    const b = numberWords[m[2]] || 0;
    if (a || b) return (a*100 + b)*1000;
  }
  return null;
};

const parseNumberLike = (text:string): number | null => {
  if (!text) return null;
  const tn = parseTextNumber(text);
  if (tn) return tn;
  const t = text.toLowerCase().replace(/[,\s]+/g,'');
  if (/k$/.test(t)) return parseFloat(t.replace(/k$/,''))*1000;
  if (/m$/.test(t)) return parseFloat(t.replace(/m$/,''))*1000000;
  const num = parseFloat(t);
  if (!isNaN(num)) return num;
  if (numberWords[text.toLowerCase()]) return numberWords[text.toLowerCase()];
  return null;
};

export const parseTranscript = (rawText:string, currentStep:number) => {
  const text = rawText || '';
  const lc = text.toLowerCase();
  // price
  if (currentStep===3 || /offer price|offer|price/.test(lc)) {
    const m = text.match(moneyRegex);
    if (m) return { field:'price', value: parseNumberLike(m[1]), confidence:0.95 };
    const tn = parseNumberLike(text);
    if (tn) return { field:'price', value: tn, confidence:0.8 };
  }
  // financing
  if (currentStep===4 || /cash|va|fha|conventional|loan/.test(lc)) {
    if (lc.includes('cash')) return { field:'financing', value:'cash', confidence:0.9 };
    if (lc.includes('va')) return { field:'financing', value:'VA', confidence:0.9 };
    if (lc.includes('fha')) return { field:'financing', value:'FHA', confidence:0.9 };
    if (lc.includes('conventional')) return { field:'financing', value:'conventional', confidence:0.9 };
  }
  // earnest
  if (currentStep===5 || /earnest/.test(lc)) {
    const m = text.match(moneyRegex);
    if (m) return { field:'earnest_money', value: parseNumberLike(m[1]), confidence:0.9 };
    const tn = parseNumberLike(text);
    if (tn) return { field:'earnest_money', value: tn, confidence:0.7 };
  }
  // days
  if (currentStep===7||currentStep===8) {
    const n = parseNumberLike(text.match(/(\d+|one|two|three|ten|fifteen)/i)?.[0] || '');
    if (n!==null) return { field: currentStep===7?'inspection_days':'resolution_days', value: n, confidence:0.85 };
  }
  // date parsing
  if (currentStep===9||currentStep===12) {
    const parsed = chrono.parseDate(text);
    if (parsed) return { field: currentStep===9?'closing_date':'expiration', value: parsed.toISOString(), confidence:0.9 };
  }
  // default: buyer names or others
  if (currentStep===2) return { field:'buyer_names', value:text.trim(), confidence:0.7 };
  if (currentStep===6) return { field:'earnest_holder', value:text.trim(), confidence:0.7 };
  if (currentStep===10) return { field:'concessions', value:text.trim(), confidence:0.6 };
  if (currentStep===11) return { field:'special_conditions', value:text.trim(), confidence:0.6 };

  return { field: null, value: null, confidence: 0 };
};

export default { parseTranscript };

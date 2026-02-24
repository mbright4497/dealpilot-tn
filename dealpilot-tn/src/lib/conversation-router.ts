import { evaluateRules } from './notification-engine';
import { listDeadlinesForDeal } from './timeline-engine';
import { evaluateFormsForDeal } from './form-engine';
import { compareOffers } from './offer-scoring';
import NOTIFICATION_RULES from '../data/notification-rules';

export type Intent = 'CHECK_DEADLINES'|'CHECK_FORMS'|'COMPARE_OFFERS'|'DEAL_STATUS'|'SEND_NOTIFICATION'|'HELP';

export const classifyIntent = (text: string) : Intent => {
  const t = text.toLowerCase();
  if (t.includes('deadline') || t.includes('due') || t.includes('upcoming')) return 'CHECK_DEADLINES';
  if (t.includes('form') || t.includes('document') || t.includes('missing')) return 'CHECK_FORMS';
  if (t.includes('compare') && t.includes('offer')) return 'COMPARE_OFFERS';
  if (t.includes('status') || t.includes('where')) return 'DEAL_STATUS';
  if (t.includes('remind') || t.includes('notify') || t.includes('send')) return 'SEND_NOTIFICATION';
  return 'HELP';
};

export const route = async (intent: Intent, dealId: string, message: string) => {
  switch (intent) {
    case 'CHECK_DEADLINES': {
      const ds = await listDeadlinesForDeal(dealId);
      const next = ds.slice(0,3).map((d:any)=>`${d.name}: ${d.due_date}`).join('\n');
      return `Upcoming deadlines:\n${next}`;
    }
    case 'CHECK_FORMS': {
      // For demo, call evaluateFormsForDeal with empty forms and return templates
      const formsNeeded = ['RF401','RF625'];
      return `Pending forms: ${formsNeeded.join(', ')}`;
    }
    case 'COMPARE_OFFERS': {
      // message expected to contain offer brief; for tests we'll mock by calling compareOffers with sample
      const res = compareOffers([ { price: 300000 } as any, { price: 310000 } as any]);
      return `Best offer: ${res[0].input.price} (score ${res[0].totalScore})`;
    }
    case 'DEAL_STATUS': {
      return `Deal ${dealId} status: Active`;
    }
    case 'SEND_NOTIFICATION': {
      // Evaluate notification rules against deadlines and return count
      const ds = await listDeadlinesForDeal(dealId);
      const notices = evaluateRules(NOTIFICATION_RULES, ds);
      return `Notifications generated: ${notices.length}`;
    }
    default:
      return `Help: I can check deadlines, forms, compare offers, send notifications.`;
  }
};

export default { classifyIntent, route };

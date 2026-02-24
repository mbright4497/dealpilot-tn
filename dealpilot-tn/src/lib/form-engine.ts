import type { DealContext, FormDefinition, FormRule, TimelineEvent } from '../types/forms';
import { FORM_DEFINITIONS, FORM_RULES } from '../data/form-seeds';

export const evaluateFormsForDeal = (context: DealContext, forms: { id: string; values: Record<string, any> }[], rules?: FormRule[]) => {
  const usedRules = rules ?? FORM_RULES;
  const events: TimelineEvent[] = [];

  for (const form of forms) {
    const def = FORM_DEFINITIONS.find(f => f.id === form.id);
    // apply rules for this form
    for (const rule of usedRules.filter(r => r.formId === form.id)) {
      try {
        if (rule.condition(context, form.values)) {
          events.push({
            id: `${form.id}-${rule.id}`,
            name: rule.name,
            due_date: new Date().toISOString().slice(0,10),
            tags: [form.id],
            owner: 'engine',
            metadata: { ruleId: rule.id, form: form.id },
            description: `Triggered rule ${rule.name}`,
            source_form: form.id
          });
        }
      } catch (e) {
        // ignore rule errors
        console.warn('rule eval failed', rule.id, e);
      }
    }
  }

  return events;
};

export default evaluateFormsForDeal;

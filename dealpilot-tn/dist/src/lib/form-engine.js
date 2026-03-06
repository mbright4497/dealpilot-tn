"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateFormsForDeal = void 0;
const form_seeds_1 = require("../data/form-seeds");
const evaluateFormsForDeal = (context, forms, rules) => {
    const usedRules = rules ?? form_seeds_1.FORM_RULES;
    const events = [];
    for (const form of forms) {
        const def = form_seeds_1.FORM_DEFINITIONS.find(f => f.id === form.id);
        // apply rules for this form
        for (const rule of usedRules.filter(r => r.formId === form.id)) {
            try {
                if (rule.condition(context, form.values)) {
                    events.push({
                        id: `${form.id}-${rule.id}`,
                        name: rule.name,
                        due_date: new Date().toISOString().slice(0, 10),
                        tags: [form.id],
                        owner: 'engine',
                        metadata: { ruleId: rule.id, form: form.id },
                        description: `Triggered rule ${rule.name}`,
                        source_form: form.id
                    });
                }
            }
            catch (e) {
                // ignore rule errors
                console.warn('rule eval failed', rule.id, e);
            }
        }
    }
    return events;
};
exports.evaluateFormsForDeal = evaluateFormsForDeal;
exports.default = exports.evaluateFormsForDeal;

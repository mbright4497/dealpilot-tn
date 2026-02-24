import { supabaseAdmin } from '../supabase';

export const logTriggerEvaluations = async (dealId: string, context: any) => {
  // Simple rule evaluation stub: if context.rf656?.notice_type_code exists, create a match
  const matches: any[] = [];
  if (context && context.rf656 && context.rf656.notice_type_code) {
    const name = `rf656-${context.rf656.notice_type_code}`;
    matches.push({ name, recommendedNotice: 'Notice', boxNumber: 1 });
  }

  const payload: any = {
    deal_id: dealId,
    actor: 'rf656-engine',
    action: matches.length ? 'rf656-triggered' : 'rf656-trigger-check',
    detail: matches.length ? matches.map(m => ({ rule: m.name, notice: m.recommendedNotice, box: m.boxNumber })) : { notice_code: context?.rf656?.notice_type_code, triggered: [] }
  };

  // Insert into activity_log; tests expect insert to be called with array when matches exist
  if (matches.length) {
    const arr = matches.map(m => ({ deal_id: dealId, actor: 'rf656-engine', action: 'rf656-triggered', detail: { rule: m.name, notice: m.recommendedNotice, box: m.boxNumber } }));
    await supabaseAdmin.from('activity_log').insert(arr);
    return matches;
  } else {
    await supabaseAdmin.from('activity_log').insert(payload);
    return [];
  }
};

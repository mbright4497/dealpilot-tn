"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDeadlinesForDeal = exports.persistDeadlines = exports.generateDeadlinesForDeal = exports.calculateBAD = void 0;
const supabase_1 = require("./supabase");
const TABLE = 'deal_timelines';
const calculateBAD = (contractDate) => {
    // Binding Agreement Date is contractDate by default
    return contractDate;
};
exports.calculateBAD = calculateBAD;
const generateDeadlinesForDeal = (dealId, bindingDate, opts = {}) => {
    const bad = bindingDate;
    const bd = (d, days) => {
        const x = new Date(d);
        x.setDate(x.getDate() + days);
        return x.toISOString().slice(0, 10);
    };
    const base = new Date(bad);
    const deadlines = [];
    // Loan obligations
    if (opts.financingType === 'loan') {
        deadlines.push({ deal_id: dealId, name: 'Loan application + credit report', due_date: bd(base, 3), category: 'loan-obligation' });
        deadlines.push({ deal_id: dealId, name: 'Insurance/Intent to Proceed/Appraisal order', due_date: bd(base, 14), category: 'loan-obligation' });
    }
    else {
        // Cash obligations
        deadlines.push({ deal_id: dealId, name: 'Proof of funds', due_date: bd(base, 5), category: 'cash-obligation' });
        deadlines.push({ deal_id: dealId, name: 'Appraiser info (cash)', due_date: bd(base, 5), category: 'cash-obligation' });
    }
    // Appraisal contingency decision window: 3 days after NOV (we model NOV as appraisal notice at 14d)
    const novDate = bd(base, 14);
    deadlines.push({ deal_id: dealId, name: 'Appraisal Notice (NOV)', due_date: novDate, category: 'appraisal' });
    const novDay = new Date(novDate);
    deadlines.push({ deal_id: dealId, name: 'Buyer decision after NOV', due_date: bd(novDay, 3), category: 'appraisal' });
    // Seller demand compliance 2-day windows (example)
    deadlines.push({ deal_id: dealId, name: 'Seller demand window start', due_date: bd(base, 1), category: 'seller-demand' });
    deadlines.push({ deal_id: dealId, name: 'Seller demand compliance due', due_date: bd(base, 3), category: 'seller-demand' });
    // Inspection period
    const inspectionDays = opts.inspection_days ?? 10;
    deadlines.push({ deal_id: dealId, name: 'Inspection period end', due_date: bd(base, inspectionDays), category: 'inspection' });
    // Closing date countdown alerts (assume closing at 60 days)
    const closingDate = bd(base, 60);
    const closing = new Date(closingDate);
    const alerts = [30, 14, 7, 3, 1];
    for (const a of alerts) {
        const d = new Date(closing);
        d.setDate(d.getDate() - a);
        deadlines.push({ deal_id: dealId, name: `Closing alert - ${a} days`, due_date: d.toISOString().slice(0, 10), category: 'closing' });
    }
    deadlines.push({ deal_id: dealId, name: 'Closing date', due_date: closingDate, category: 'closing' });
    return deadlines;
};
exports.generateDeadlinesForDeal = generateDeadlinesForDeal;
const persistDeadlines = async (deadlines) => {
    if (!deadlines || deadlines.length === 0)
        return [];
    const { data, error } = await supabase_1.supabaseAdmin.from(TABLE).upsert(deadlines, { onConflict: 'id' }).select('*');
    if (error)
        throw error;
    return data;
};
exports.persistDeadlines = persistDeadlines;
const listDeadlinesForDeal = async (dealId) => {
    const { data = [] } = await supabase_1.supabaseAdmin.from(TABLE).select('*').eq('deal_id', dealId).order('due_date', { ascending: true });
    return data;
};
exports.listDeadlinesForDeal = listDeadlinesForDeal;
exports.default = { calculateBAD: exports.calculateBAD, generateDeadlinesForDeal: exports.generateDeadlinesForDeal, persistDeadlines: exports.persistDeadlines, listDeadlinesForDeal: exports.listDeadlinesForDeal };

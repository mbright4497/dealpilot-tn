"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../../lib/supabase");
const extraction_mapping_1 = require("../../lib/extraction-mapping");
const timeline_engine_1 = require("../../lib/timeline-engine");
const router = express_1.default.Router();
router.post('/apply-extraction', async (req, res) => {
    try {
        const { dealId, extracted, pdfUrl } = req.body;
        if (!dealId)
            return res.status(400).json({ error: 'dealId required' });
        let data = extracted;
        // If no extracted provided but pdfUrl present, call external extractor (stubbed by tests)
        if (!data && pdfUrl) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const extractor = require('../../lib/extractor').default;
            data = await extractor(pdfUrl);
        }
        if (!data)
            return res.status(400).json({ error: 'extracted data or pdfUrl required' });
        // map extraction to transaction fields
        const txUpdates = (0, extraction_mapping_1.mapExtractionToTransaction)(data);
        await supabase_1.supabaseAdmin.from('transactions').upsert({ deal_id: dealId, ...txUpdates }, { onConflict: 'deal_id' });
        // upsert contacts
        if (data.contacts && Array.isArray(data.contacts)) {
            for (const c of data.contacts) {
                const contactPayload = { deal_id: dealId, name: c.name, email: c.email, phone: c.phone, role: c.role };
                await supabase_1.supabaseAdmin.from('deal_contacts').upsert(contactPayload, { onConflict: ['deal_id', 'role'] });
            }
        }
        // compute deadlines using timeline engine helper
        // expect txUpdates to include contract_date or binding_date
        const bindingDate = txUpdates.contract_date || txUpdates.binding_date || txUpdates.contractDate;
        if (bindingDate) {
            const deadlines = (0, timeline_engine_1.generateDeadlinesForDeal)(dealId, bindingDate, { inspection_days: txUpdates.inspection_days, financingType: txUpdates.financingType });
            if (deadlines && deadlines.length) {
                for (const d of deadlines) {
                    // idempotent insert by unique key (deal_id + name)
                    await supabase_1.supabaseAdmin.from('deadlines').upsert({ deal_id: dealId, name: d.name, due_date: d.due_date, category: d.category, metadata: d.metadata || {} }, { onConflict: ['deal_id', 'name'] });
                }
            }
        }
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ error: String(e.message) });
    }
});
exports.default = router;

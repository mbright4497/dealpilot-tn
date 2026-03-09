import express from 'express';
import { supabaseAdmin } from '../../lib/supabase';
import { mapExtractionToTransaction } from '../../lib/extraction-mapping';
import { generateDeadlinesForDeal } from '../../lib/timeline-engine';

const router = express.Router();

router.post('/apply-extraction', async (req,res)=>{
  try{
    const { dealId, extracted, pdfUrl } = req.body;
    if (!dealId) return res.status(400).json({ error: 'dealId required' });
    let data = extracted;
    // If no extracted provided but pdfUrl present, call external extractor (stubbed by tests)
    if (!data && pdfUrl) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const extractor = require('../../lib/extractor').default;
      data = await extractor(pdfUrl);
    }
    if (!data) return res.status(400).json({ error: 'extracted data or pdfUrl required' });

    // map extraction to transaction fields
    const txUpdates = mapExtractionToTransaction(data);

    // ensure we persist contacts into transactions.contacts jsonb and into deal_contacts table
    const contactsToUpsert = txUpdates.contacts && Array.isArray(txUpdates.contacts) ? txUpdates.contacts : (data.contacts && Array.isArray(data.contacts) ? data.contacts : []);

    // upsert transaction row (includes binding/closing_date/value)
    await supabaseAdmin.from('transactions').upsert({ deal_id: dealId, ...txUpdates }, { onConflict: 'deal_id' });

    // persist contacts both as normalized rows and as jsonb in transactions
    if (Array.isArray(contactsToUpsert) && contactsToUpsert.length){
      for (const c of contactsToUpsert){
        const contactPayload = { deal_id: dealId, name: c.name, email: c.email || null, phone: c.phone || null, role: c.role || null };
        try{ await supabaseAdmin.from('deal_contacts').upsert(contactPayload, { onConflict: ['deal_id','role'] }); }catch(_e){}
      }
      // also update transactions.contacts jsonb column for quick reads
      try{
        await supabaseAdmin.from('transactions').update({ contacts: contactsToUpsert }).eq('deal_id', dealId);
      }catch(_e){}
    }

    // compute deadlines using timeline engine helper
    // expect txUpdates to include binding or contract_date
    const bindingDate = (txUpdates as any).binding || (txUpdates as any).contract_date || (txUpdates as any).binding_date || (txUpdates as any).contractDate;
    if (bindingDate){
      const deadlines = generateDeadlinesForDeal(dealId, bindingDate, { inspection_days: txUpdates.inspection_days, financingType: txUpdates.financingType });
      if (deadlines && deadlines.length){
        for (const d of deadlines){
          // idempotent insert by unique key (deal_id + name)
          await supabaseAdmin.from('deadlines').upsert({ deal_id: dealId, name: d.name, due_date: d.due_date, category: d.category, metadata: d.metadata||{} }, { onConflict: ['deal_id','name'] });
        }
      }
    }

    res.json({ ok: true });
  }catch(e:any){res.status(500).json({error:String(e.message)});}  
});

export default router;

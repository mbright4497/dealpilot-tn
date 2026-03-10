import express from 'express';
import { supabaseClient } from '../lib/supabaseClient';

const router = express.Router();

// POST /api/communications/send
// Body: { draft: { to, subject, body, from? }, confirmed: true }
router.post('/send', async (req, res) => {
  try {
    const { draft, confirmed } = req.body || {};
    if (!confirmed) return res.status(400).json({ error: 'confirm_required', message: 'Send must be explicitly confirmed.' });
    if (!draft || typeof draft !== 'object') return res.status(400).json({ error: 'invalid_draft' });

    const to = draft.to || draft.recipient || draft.to_address || null;
    const subject = draft.subject || '';
    const body = draft.body || draft.message || '';

    if (!to) return res.status(400).json({ error: 'missing_to', message: 'Recipient (to) is required.' });
    if (!subject) return res.status(400).json({ error: 'missing_subject', message: 'Subject is required.' });
    if (!body) return res.status(400).json({ error: 'missing_body', message: 'Body is required.' });

    // Log to console
    console.log('[communications.send] confirmed send request', { to, subject, bodySnippet: body.slice(0,200) });

    // Attempt to log to DB (optional — table "communications_log")
    try{
      await supabaseClient.from('communications_log').insert([{
        to, subject, body, status: 'confirmed', created_at: new Date().toISOString()
      }]);
    }catch(e){
      console.warn('communications: failed to write log to DB', e);
    }

    // Do not send mail yet — just acknowledge
    return res.json({ ok: true, message: 'Send confirmed and logged.' });
  } catch (e:any) {
    console.error('communications/send error', e);
    return res.status(500).json({ error: 'server_error', message: String(e.message || e) });
  }
});

export default router;

import express from 'express';
import { scoreOffer, compareOffers } from '../../lib/offer-scoring';
import { buildDraftFormBundle } from '../../lib/phase-machine';

const router = express.Router();

router.post('/score', async (req,res)=>{
  const input = req.body;
  if (!input) return res.status(400).json({ error:'missing body' });
  const out = scoreOffer(input);
  res.json(out);
});

router.post('/compare', async (req,res)=>{
  const offers = req.body.offers || [];
  const out = compareOffers(offers);
  res.json(out);
});

router.post('/draft', async (req,res)=>{
  const { intent } = req.body;
  const bundle = buildDraftFormBundle(intent, { deal_id: req.body.deal_id } as any, [], [] as any);
  res.json(bundle);
});

export default router;

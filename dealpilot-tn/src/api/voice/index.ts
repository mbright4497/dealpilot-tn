import express from 'express';
import { startSession, processInput, reviewSession, finalizeSession } from '../../lib/voice-session';

const router = express.Router();

router.post('/start', (req,res)=>{
  const { agentId } = req.body;
  const s = startSession(agentId || 'agent');
  res.json(s);
});

router.post('/:sessionId/input', (req,res)=>{
  const { sessionId } = req.params;
  const { transcript } = req.body;
  const out = processInput(sessionId, transcript);
  res.json(out);
});

router.get('/:sessionId/review', (req,res)=>{
  res.json(reviewSession(req.params.sessionId));
});

router.post('/:sessionId/finalize', (req,res)=>{
  res.json(finalizeSession(req.params.sessionId));
});

export default router;

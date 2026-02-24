import { OfferIntentBuilder } from './intent-builder';
import { parseTranscript } from './transcript-parser';
import { nextPrompt, VOICE_STEPS } from './voice-flow';

const SESSIONS: Record<string, any> = {};
let counter = 1;

export const startSession = (agentId:string) => {
  const id = `vs-${counter++}`;
  SESSIONS[id] = { agentId, builder: OfferIntentBuilder(), step:1, collected: {} };
  return { sessionId: id, prompt: VOICE_STEPS[0].prompt };
};

export const processInput = (sessionId:string, transcript:string) => {
  const s = SESSIONS[sessionId];
  if (!s) throw new Error('session not found');
  const parsed = parseTranscript(transcript, s.step);
  if (parsed.field) s.builder.addField(parsed.field, parsed.value, parsed.confidence);
  // advance
  if (s.step < VOICE_STEPS.length) {
    s.step +=1;
    const np = nextPrompt(s.step-1);
    return { nextPrompt: np?.prompt, parsedField: parsed, updatedIntent: s.builder.toOfferInput() };
  }
  return { nextPrompt: null, parsedField: parsed, updatedIntent: s.builder.toOfferInput() };
};

export const reviewSession = (sessionId:string) => {
  const s = SESSIONS[sessionId];
  if (!s) throw new Error('session not found');
  return { allFields: s.builder.toOfferInput(), completeness: s.builder.getCompleteness?.() || { complete:false, missing:[], lowConfidence:[] } };
};

export const finalizeSession = (sessionId:string) => {
  const s = SESSIONS[sessionId];
  if (!s) throw new Error('session not found');
  const offer = s.builder.toOfferInput();
  // map to drafter
  return { offer };
};

export default { startSession, processInput, reviewSession, finalizeSession };

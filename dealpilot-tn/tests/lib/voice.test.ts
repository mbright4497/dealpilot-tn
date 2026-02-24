import { startSession, processInput, reviewSession, finalizeSession } from '../../src/lib/voice-session';
import { parseTranscript } from '../../src/lib/transcript-parser';

describe('Voice pipeline', () => {
  it('walks through prompts and collects fields', () => {
    const s = startSession('agent1');
    expect(s.prompt).toContain('Which property');
    const p1 = processInput(s.sessionId, '123 Main St');
    expect(p1.nextPrompt).toBeTruthy();
    processInput(s.sessionId, 'John Doe');
    processInput(s.sessionId, '250k');
    processInput(s.sessionId, 'cash');
    processInput(s.sessionId, '$5000');
    processInput(s.sessionId, 'Title Co');
    processInput(s.sessionId, '10');
    processInput(s.sessionId, '5');
    processInput(s.sessionId, 'March 15 2026');
    processInput(s.sessionId, 'no concessions');
    processInput(s.sessionId, 'none');
    processInput(s.sessionId, 'March 20 2026 5pm');
    const review = reviewSession(s.sessionId);
    expect(review.allFields.price).toBeTruthy();
    const final = finalizeSession(s.sessionId);
    expect(final.offer).toBeTruthy();
  });

  it('parses currency variations', () => {
    const p = parseTranscript('two fifty thousand dollars', 3);
    expect(p.field).toEqual('price');
    expect(p.value).toBeGreaterThan(0);
  });
});

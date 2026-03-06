"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const voice_session_1 = require("../../src/lib/voice-session");
const transcript_parser_1 = require("../../src/lib/transcript-parser");
describe('Voice pipeline', () => {
    it('walks through prompts and collects fields', () => {
        const s = (0, voice_session_1.startSession)('agent1');
        expect(s.prompt).toContain('Which property');
        const p1 = (0, voice_session_1.processInput)(s.sessionId, '123 Main St');
        expect(p1.nextPrompt).toBeTruthy();
        (0, voice_session_1.processInput)(s.sessionId, 'John Doe');
        (0, voice_session_1.processInput)(s.sessionId, '250k');
        (0, voice_session_1.processInput)(s.sessionId, 'cash');
        (0, voice_session_1.processInput)(s.sessionId, '$5000');
        (0, voice_session_1.processInput)(s.sessionId, 'Title Co');
        (0, voice_session_1.processInput)(s.sessionId, '10');
        (0, voice_session_1.processInput)(s.sessionId, '5');
        (0, voice_session_1.processInput)(s.sessionId, 'March 15 2026');
        (0, voice_session_1.processInput)(s.sessionId, 'no concessions');
        (0, voice_session_1.processInput)(s.sessionId, 'none');
        (0, voice_session_1.processInput)(s.sessionId, 'March 20 2026 5pm');
        const review = (0, voice_session_1.reviewSession)(s.sessionId);
        expect(review.allFields.price).toBeTruthy();
        const final = (0, voice_session_1.finalizeSession)(s.sessionId);
        expect(final.offer).toBeTruthy();
    });
    it('parses currency variations', () => {
        const p = (0, transcript_parser_1.parseTranscript)('two fifty thousand dollars', 3);
        expect(p.field).toEqual('price');
        expect(p.value).toBeGreaterThan(0);
    });
});

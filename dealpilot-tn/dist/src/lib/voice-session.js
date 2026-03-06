"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeSession = exports.reviewSession = exports.processInput = exports.startSession = void 0;
const intent_builder_1 = require("./intent-builder");
const transcript_parser_1 = require("./transcript-parser");
const voice_flow_1 = require("./voice-flow");
const SESSIONS = {};
let counter = 1;
const startSession = (agentId) => {
    const id = `vs-${counter++}`;
    SESSIONS[id] = { agentId, builder: (0, intent_builder_1.OfferIntentBuilder)(), step: 1, collected: {} };
    return { sessionId: id, prompt: voice_flow_1.VOICE_STEPS[0].prompt };
};
exports.startSession = startSession;
const processInput = (sessionId, transcript) => {
    const s = SESSIONS[sessionId];
    if (!s)
        throw new Error('session not found');
    const parsed = (0, transcript_parser_1.parseTranscript)(transcript, s.step);
    if (parsed.field)
        s.builder.addField(parsed.field, parsed.value, parsed.confidence);
    // advance
    if (s.step < voice_flow_1.VOICE_STEPS.length) {
        s.step += 1;
        const np = (0, voice_flow_1.nextPrompt)(s.step - 1);
        return { nextPrompt: np?.prompt, parsedField: parsed, updatedIntent: s.builder.toOfferInput() };
    }
    return { nextPrompt: null, parsedField: parsed, updatedIntent: s.builder.toOfferInput() };
};
exports.processInput = processInput;
const reviewSession = (sessionId) => {
    const s = SESSIONS[sessionId];
    if (!s)
        throw new Error('session not found');
    return { allFields: s.builder.toOfferInput(), completeness: s.builder.getCompleteness?.() || { complete: false, missing: [], lowConfidence: [] } };
};
exports.reviewSession = reviewSession;
const finalizeSession = (sessionId) => {
    const s = SESSIONS[sessionId];
    if (!s)
        throw new Error('session not found');
    const offer = s.builder.toOfferInput();
    // map to drafter
    return { offer };
};
exports.finalizeSession = finalizeSession;
exports.default = { startSession: exports.startSession, processInput: exports.processInput, reviewSession: exports.reviewSession, finalizeSession: exports.finalizeSession };

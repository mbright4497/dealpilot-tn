"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const voice_session_1 = require("../../lib/voice-session");
const router = express_1.default.Router();
router.post('/start', (req, res) => {
    const { agentId } = req.body;
    const s = (0, voice_session_1.startSession)(agentId || 'agent');
    res.json(s);
});
router.post('/:sessionId/input', (req, res) => {
    const { sessionId } = req.params;
    const { transcript } = req.body;
    const out = (0, voice_session_1.processInput)(sessionId, transcript);
    res.json(out);
});
router.get('/:sessionId/review', (req, res) => {
    res.json((0, voice_session_1.reviewSession)(req.params.sessionId));
});
router.post('/:sessionId/finalize', (req, res) => {
    res.json((0, voice_session_1.finalizeSession)(req.params.sessionId));
});
exports.default = router;

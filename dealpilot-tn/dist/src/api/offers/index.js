"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const offer_scoring_1 = require("../../lib/offer-scoring");
const phase_machine_1 = require("../../lib/phase-machine");
const router = express_1.default.Router();
router.post('/score', async (req, res) => {
    const input = req.body;
    if (!input)
        return res.status(400).json({ error: 'missing body' });
    const out = (0, offer_scoring_1.scoreOffer)(input);
    res.json(out);
});
router.post('/compare', async (req, res) => {
    const offers = req.body.offers || [];
    const out = (0, offer_scoring_1.compareOffers)(offers);
    res.json(out);
});
router.post('/draft', async (req, res) => {
    const { intent } = req.body;
    const bundle = (0, phase_machine_1.buildDraftFormBundle)(intent, { deal_id: req.body.deal_id }, [], []);
    res.json(bundle);
});
exports.default = router;

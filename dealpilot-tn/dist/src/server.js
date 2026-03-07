"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const deals_1 = __importDefault(require("./api/deals"));
const offers_1 = __importDefault(require("./api/offers"));
const voice_1 = __importDefault(require("./api/voice"));
const webhook_1 = __importDefault(require("./api/webhook"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/deals', deals_1.default);
app.use('/api/offers', offers_1.default);
app.use('/api/voice', voice_1.default);
app.use('/whatsapp', webhook_1.default);
// error handler
app.use((err, req, res, next) => {
    console.error('server error', err);
    res.status(500).json({ error: 'server_error', details: [String(err.message || err)] });
});
const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log(`ClosingPilot API listening ${port}`));
const shutdown = () => { server.close(() => process.exit(0)); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
exports.default = app;

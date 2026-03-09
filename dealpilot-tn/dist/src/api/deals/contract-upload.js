"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const supabase_1 = require("../../lib/supabase");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.post('/:id/contract-upload', upload.single('file'), async (req, res) => {
    try {
        const dealId = req.params.id;
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: 'file required' });
        const filename = `deals/${dealId}/${Date.now()}_${file.originalname}`;
        const bucket = process.env.SUPABASE_BUCKET || 'documents';
        const { data, error } = await supabase_1.supabaseAdmin.storage.from(bucket).upload(filename, file.buffer, { upsert: false });
        if (error)
            return res.status(500).json({ error: error.message });
        const publicUrl = `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${encodeURIComponent(filename)}`;
        // store in deals.pdf_url field
        await supabase_1.supabaseAdmin.from('deals').update({ pdf_url: publicUrl }).eq('id', dealId);
        res.json({ pdfUrl: publicUrl });
    }
    catch (e) {
        res.status(500).json({ error: String(e.message) });
    }
});
exports.default = router;

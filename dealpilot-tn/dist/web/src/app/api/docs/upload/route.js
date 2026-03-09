"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = exports.dynamic = void 0;
exports.POST = POST;
exports.dynamic = 'force-dynamic';
const server_1 = require("next/server");
const auth_helpers_nextjs_1 = require("@supabase/auth-helpers-nextjs");
const headers_1 = require("next/headers");
const uuid_1 = require("uuid");
exports.runtime = 'nodejs';
async function POST(req) {
    try {
        const form = await req.formData();
        const file = form.get('file');
        const transaction_id = form.get('transaction_id');
        if (!file)
            return server_1.NextResponse.json({ error: 'no file' }, { status: 400 });
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${(0, uuid_1.v4)()}.pdf`;
        const path = `documents/${transaction_id || 'unlinked'}/${filename}`;
        const supabase = (0, auth_helpers_nextjs_1.createRouteHandlerClient)({ cookies: headers_1.cookies });
        const { data: { user } } = await supabase.auth.getUser();
        const { data: uploadRes, error: uploadErr } = await supabase.storage.from('documents').upload(path, buffer, { contentType: 'application/pdf' });
        if (uploadErr)
            return server_1.NextResponse.json({ error: uploadErr.message }, { status: 500 });
        // insert documents row
        const classification = form.get('classification');
        const { data, error } = await supabase.from('documents').insert([{ file_name: filename, path, status: 'uploaded', transaction_id: transaction_id || null, classification: classification || null, user_id: user?.id || null }]).select('*').single();
        if (error)
            return server_1.NextResponse.json({ error: error.message }, { status: 500 });
        return server_1.NextResponse.json({ document: data });
    }
    catch (e) {
        return server_1.NextResponse.json({ error: e.message || String(e) }, { status: 500 });
    }
}

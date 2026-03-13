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
        const originalName = file.name || `${(0, uuid_1.v4)()}.pdf`;
        const filename = originalName;
        const ext = (filename.split('.').pop() || 'pdf');
        const bucketName = 'deal-documents';
        const storagePath = `deal-${transaction_id || 'unlinked'}/${(0, uuid_1.v4)()}.${ext}`;
        const supabase = (0, auth_helpers_nextjs_1.createRouteHandlerClient)({ cookies: headers_1.cookies });
        const { data: { user } } = await supabase.auth.getUser();
        // ensure bucket exists (create if missing)
        try {
            const { data: bucketList } = await supabase.storage.listBuckets();
            const has = (bucketList || []).find((b) => b.name === bucketName);
            if (!has) {
                await supabase.storage.createBucket(bucketName, { public: true });
            }
        }
        catch (e) {
            // if listing/creation not supported in this SDK/env, continue — upload may still fail and return a clear error
        }
        const { error: uploadErr } = await supabase.storage.from(bucketName).upload(storagePath, buffer, { contentType: file.type || 'application/octet-stream' });
        if (uploadErr)
            return server_1.NextResponse.json({ error: uploadErr.message }, { status: 500 });
        // create a signed URL (private bucket) for immediate download preview (short-lived)
        let signedUrl = null;
        try {
            const { data: signed } = await supabase.storage.from(bucketName).createSignedUrl(storagePath, 60);
            signedUrl = signed?.signedUrl || null;
        }
        catch (e) { /* ignore signed url failures */ }
        // classification key
        const classification = form.get('classification');
        // insert into canonical documents table
        const { data, error } = await supabase.from('documents').insert([{
                deal_id: transaction_id ? Number(transaction_id) : null,
                transaction_id: transaction_id ? Number(transaction_id) : null,
                filename: filename,
                file_type: file.type || null,
                storage_path: storagePath,
                uploaded_at: new Date().toISOString(),
                uploaded_by: user?.id || null,
                status_label: 'uploaded',
                rf_number: classification || null,
            }]).select().single();
        if (error)
            return server_1.NextResponse.json({ error: error.message }, { status: 500 });
        return server_1.NextResponse.json({ document: data, signed_url: signedUrl });
    }
    catch (e) {
        return server_1.NextResponse.json({ error: e.message || String(e) }, { status: 500 });
    }
}

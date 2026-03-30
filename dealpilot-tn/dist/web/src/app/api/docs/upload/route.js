"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = exports.dynamic = void 0;
exports.POST = POST;
const ssr_1 = require("@supabase/ssr");
const headers_1 = require("next/headers");
const server_1 = require("next/server");
const uuid_1 = require("uuid");
const getSupabase = () => {
    const cookieStore = (0, headers_1.cookies)();
    return (0, ssr_1.createServerClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { get: (name) => cookieStore.get(name)?.value } });
};
exports.dynamic = 'force-dynamic';
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
        // ensure bucket exists (create if missing)
        try {
            const { data: bucketList } = await getSupabase().storage.listBuckets();
            const has = (bucketList || []).find((b) => b.name === bucketName);
            if (!has) {
                await getSupabase().storage.createBucket(bucketName, { public: false });
            }
        }
        catch (e) {
            // if listing/creation not supported in this SDK/env, continue — upload may still fail and return a clear error
        }
        const { error: uploadErr } = await getSupabase().storage.from(bucketName).upload(storagePath, buffer, { contentType: file.type || 'application/octet-stream' });
        if (uploadErr)
            return server_1.NextResponse.json({ error: uploadErr.message }, { status: 500 });
        // create a signed URL (private bucket) for immediate download preview (short-lived)
        let signedUrl = null;
        try {
            const { data: signed } = await getSupabase().storage.from(bucketName).createSignedUrl(storagePath, 60);
            signedUrl = signed?.signedUrl || null;
        }
        catch (e) { /* ignore signed url failures */ }
        // classification key
        const classification = form.get('classification');
        // insert into canonical documents table (server-side service role; user_id set to null)
        const { data, error } = await getSupabase().from('documents').insert([{
                deal_id: null,
                transaction_id: transaction_id ? Number(transaction_id) : null,
                name: filename,
                type: file.type || null,
                storage_path: storagePath,
                uploaded_at: new Date().toISOString(),
                user_id: null,
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

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wizardTable = void 0;
exports.getSupabase = getSupabase;
exports.fetchWizardRow = fetchWizardRow;
exports.ensureWizardRow = ensureWizardRow;
exports.buildWizardData = buildWizardData;
exports.updateSection = updateSection;
exports.completeWizard = completeWizard;
exports.getSectionNameByPath = getSectionNameByPath;
const server_1 = require("next/server");
const server_2 = require("@/lib/supabase/server");
const rookwizard_1 = require("@/lib/rookwizard");
exports.wizardTable = 'rookwizard_transactions';
async function getSupabase() {
    return (0, server_2.createServerSupabaseClient)();
}
async function fetchWizardRow(supabase, transactionId) {
    const { data, error } = await supabase.from(exports.wizardTable).select('*').eq('transaction_id', transactionId).maybeSingle();
    if (error) {
        throw new Error(error.message);
    }
    return data;
}
async function ensureWizardRow(supabase, transactionId) {
    const existing = await supabase.from(exports.wizardTable).select('*').eq('transaction_id', transactionId).maybeSingle();
    if (existing.error) {
        throw new Error(existing.error.message);
    }
    if (existing.data) {
        return existing.data;
    }
    const { data, error } = await supabase.from(exports.wizardTable).insert({ transaction_id: transactionId }).select('*').single();
    if (error) {
        throw new Error(error.message);
    }
    return data;
}
function buildWizardData(row) {
    const data = (0, rookwizard_1.mergeWizardRow)(row);
    return {
        transaction_id: row.transaction_id,
        step: row.wizard_step || 1,
        status: row.wizard_status || 'initialized',
        wizard_data: data,
    };
}
async function updateSection(supabase, transactionId, section, payload) {
    const { errors, sanitized } = (0, rookwizard_1.sanitizeSectionPayload)(section, payload);
    if (errors.length) {
        return { errors };
    }
    const now = new Date().toISOString();
    const patch = {
        transaction_id: transactionId,
        ...sanitized,
        wizard_step: rookwizard_1.sectionProgress[section].step,
        wizard_status: rookwizard_1.sectionProgress[section].status,
        updated_at: now,
    };
    const { error } = await supabase.from(exports.wizardTable).upsert(patch, { onConflict: 'transaction_id' });
    if (error) {
        return { errors: [error.message] };
    }
    const row = await fetchWizardRow(supabase, transactionId);
    return { row, step: rookwizard_1.sectionProgress[section].step, status: rookwizard_1.sectionProgress[section].status, sanitized };
}
async function completeWizard(req, transactionId) {
    const supabase = await getSupabase();
    const row = await fetchWizardRow(supabase, transactionId);
    if (!row) {
        return server_1.NextResponse.json({ error: 'RookWizard not initialized' }, { status: 404 });
    }
    if (row.wizard_status === 'complete') {
        const data = (0, rookwizard_1.mergeWizardRow)(row);
        const missing = (0, rookwizard_1.missingFields)(data);
        return server_1.NextResponse.json({
            transaction_id: transactionId,
            completed_at: row.completed_at || row.updated_at || new Date().toISOString(),
            summary: { missing_fields: missing, next_actions: (0, rookwizard_1.summaryText)(missing) },
            status: 'complete',
        });
    }
    const data = (0, rookwizard_1.mergeWizardRow)(row);
    const fields = (0, rookwizard_1.intakeApplyFields)(data);
    const intakeUrl = new URL('/api/intake-apply', req.url);
    const cookies = req.headers.get('cookie');
    const intakeRes = await fetch(intakeUrl.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(cookies ? { cookie: cookies } : {}),
        },
        body: JSON.stringify({ fields, timeline: [] }),
    });
    if (!intakeRes.ok) {
        const message = await intakeRes.text();
        return server_1.NextResponse.json({ error: `intake-apply failed: ${message}` }, { status: 500 });
    }
    const completionTime = new Date().toISOString();
    const { error } = await supabase
        .from(exports.wizardTable)
        .update({ wizard_status: 'complete', wizard_step: 5, completed_at: completionTime, updated_at: completionTime })
        .eq('transaction_id', transactionId);
    if (error) {
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
    const updatedRow = await fetchWizardRow(supabase, transactionId);
    const missing = (0, rookwizard_1.missingFields)((0, rookwizard_1.mergeWizardRow)(updatedRow));
    return server_1.NextResponse.json({
        transaction_id: transactionId,
        completed_at: completionTime,
        summary: { missing_fields: missing, next_actions: (0, rookwizard_1.summaryText)(missing) },
        status: 'complete',
    });
}
function getSectionNameByPath(path) {
    return Object.keys(rookwizard_1.sectionPaths).find((key) => rookwizard_1.sectionPaths[key] === path) ?? null;
}

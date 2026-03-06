"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = exports.supabaseClient = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase_fallback_1 = require("./supabase-fallback");
const getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const getAnonKey = () => process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const getServiceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
// Accept fallback as any to allow test mocks that don't fully implement SupabaseClient
const createSupabaseClient = (key, fallback) => {
    const url = getSupabaseUrl();
    if (!url || !key) {
        return fallback;
    }
    return (0, supabase_js_1.createClient)(url, key, {
        auth: {
            persistSession: false
        }
    });
};
exports.supabaseClient = createSupabaseClient(getAnonKey(), supabase_fallback_1.supabaseFallback.supabaseClient);
exports.supabaseAdmin = createSupabaseClient(getServiceRoleKey() || getAnonKey(), supabase_fallback_1.supabaseFallback.supabaseAdmin);

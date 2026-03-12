"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerSupabaseClient = createServerSupabaseClient;
exports.supabaseService = supabaseService;
const headers_1 = require("next/headers");
const ssr_1 = require("@supabase/ssr");
function createServerSupabaseClient() {
    const cookieStore = (0, headers_1.cookies)();
    const supabase = (0, ssr_1.createServerClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            get(name) {
                return cookieStore.get(name)?.value;
            },
            set(name, value, options) {
                try {
                    cookieStore.set({ name, value, ...options });
                }
                catch {
                    // Ignore in edge/runtime mismatch
                }
            },
            remove(name, options) {
                try {
                    cookieStore.set({ name, value: "", ...options });
                }
                catch {
                    // Ignore in edge/runtime mismatch
                }
            },
        },
    });
    return supabase;
}
// Backwards-compatible export for code that expects `supabaseService()` helper
function supabaseService() {
    return createServerSupabaseClient();
}

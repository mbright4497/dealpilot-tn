"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServerSupabaseClient = createServerSupabaseClient;
exports.supabaseService = supabaseService;
const ssr_1 = require("@supabase/ssr");
const headers_1 = require("next/headers");
/**
 * Supabase server client for Server Components, Server Actions, and Route Handlers.
 * Matches `examples/auth/nextjs/lib/supabase/server.ts` (uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
 */
function createServerSupabaseClient(_legacy) {
    void _legacy;
    const cookieStore = (0, headers_1.cookies)();
    return (0, ssr_1.createServerClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                }
                catch {
                    // The `setAll` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing user sessions.
                }
            },
        },
    });
}
function supabaseService() {
    return createServerSupabaseClient();
}

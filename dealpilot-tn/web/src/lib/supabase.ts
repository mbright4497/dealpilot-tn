import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';

export const createBrowserClient = () => createBrowserSupabaseClient();

export default createBrowserClient;

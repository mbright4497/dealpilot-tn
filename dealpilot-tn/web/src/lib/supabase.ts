import { createClient as _createClient, SupabaseClient } from '@supabase/supabase-js'

export function getSupabase(){
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if(!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
  }
  return _createClient(supabaseUrl, supabaseKey)
}

// lightweight helper to avoid throwing during import in build-time contexts
export function getSupabaseSafe(){
  try{ return getSupabase() }catch(e){
    // return a minimal stub that errors when used
    const stub:any = new Proxy({}, { get(){ return ()=>{ throw new Error('Supabase not configured') } } })
    return stub as SupabaseClient
  }
}


// Compatibility exports for existing code expecting these helpers
export const createClient = (url: string, key: string) => _createClient(url, key)

// Simple server helper alias (previous code used supabaseService)
export const supabaseService = () => getSupabaseSafe()

// Auth helper stubs used across the app - real implementations live elsewhere
export async function requireUserId(req: Request){
  // placeholder: in production this should verify auth and return user id
  throw new Error('requireUserId not implemented in local dev')
}

export const supabaseUser = () => ({ user: null })

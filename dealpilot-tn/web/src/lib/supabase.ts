import { createClient as _createClient, SupabaseClient } from '@supabase/supabase-js'

export function getSupabase(){
  const supabaseUrl = process.env.SUPABASE_URL || ''
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
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


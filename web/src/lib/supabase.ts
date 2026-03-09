import { createClient } from '@supabase/supabase-js'

export function getSupabaseSafe(){
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(url, key, {
    global: {
      fetch: (url: any, options: any = {}) => fetch(url, { ...options, cache: 'no-store' }),
    },
  })
}

export default getSupabaseSafe

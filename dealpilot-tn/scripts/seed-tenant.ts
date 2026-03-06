import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(url, key)

async function run(){
  console.log('Seeding tenant...')
  const tenant = {
    name: 'iHome-KW Kingsport',
    ghl_location_id: null,
    ghl_api_key: null,
    owner_user_id: null,
    comms_email_limit: 1000,
    comms_sms_limit: 200,
    comms_email_used: 0,
    comms_sms_used: 0,
    active: true,
  }

  // Attempt to find a current user in auth.users; fallback to none
  try{
    const { data: users } = await supabase.from('auth.users').select('id').limit(1)
    if(users && users.length) tenant.owner_user_id = users[0].id
  }catch(e){ /* ignore */ }

  const { data, error } = await supabase.from('tenants').insert(tenant).select().single()
  if (error) { console.error('Failed to create tenant', error); process.exit(1) }
  console.log('Created tenant', data.id)

  if (data && data.id && tenant.owner_user_id) {
    const { error: tuErr } = await supabase.from('tenant_users').insert({ tenant_id: data.id, user_id: tenant.owner_user_id }).select()
    if (tuErr) { console.error('Failed to link tenant user', tuErr) } else { console.log('Linked owner user to tenant') }
  } else {
    console.log('Owner user not found; tenant created without linked user')
  }
  process.exit(0)
}

run().catch(err=>{ console.error(err); process.exit(1) })

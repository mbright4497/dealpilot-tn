export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { resolveGhlConfig } from '@/lib/ghl'

export const runtime = 'nodejs'

type SyncResult = { synced:number, created:number, updated:number, errors:string[] }

export async function POST(req: Request){
  const supabase = createServerSupabaseClient({ request: req as any, response: undefined as any })
  try{
    const cfg = await resolveGhlConfig()
    if(!cfg || !cfg.apiKey || !cfg.baseUrl) return NextResponse.json({ error: 'GHL config missing' }, { status: 400 })

    const headers = { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' }
    let startAfterId: string | null = null
    let more = true

    let synced = 0, created = 0, updated = 0
    const errors: string[] = []

    while(more){
      const url = new URL(`${cfg.baseUrl.replace(/\/+$/, '')}/contacts/`)
      url.searchParams.set('locationId', String(cfg.locationId || ''))
      url.searchParams.set('limit', '100')
      if(startAfterId) url.searchParams.set('startAfterId', startAfterId)

      const resp = await fetch(url.toString(), { headers })
      if(!resp.ok){
        const txt = await resp.text().catch(()=>String(resp.status))
        errors.push(`GHL fetch failed: ${resp.status} ${txt}`)
        break
      }

      const body = await resp.json().catch(()=>({ data: [] }))
      const items = Array.isArray(body.data) ? body.data : (Array.isArray(body) ? body : [])
      if(items.length === 0){
        more = false
        break
      }

      for(const g of items){
        try{
          const ghlId = (g.id || g._id || g.ghl_id || g.contactId || '').toString()
          const firstName = g.firstName || g.first_name || ''
          const lastName = g.lastName || g.last_name || ''
          const email = (g.email || g.emails?.[0]?.email || '')
          const phone = (g.phone || g.phones?.[0]?.phone || g.mobile || '')
          const company = g.company || g.organization || ''

          const name = [firstName, lastName].filter(Boolean).join(' ').trim() || g.name || ''

          // upsert by ghl_contact_id
          const payload: any = {
            name: name || null,
            email: email || null,
            phone: phone || null,
            company: company || null,
            metadata: g || {},
            ghl_contact_id: ghlId || null,
          }

          // try update first
          const { data:existing } = await supabase.from('contacts').select('*').eq('ghl_contact_id', ghlId).limit(1).single().catch(()=>({ data: null }))
          if(existing && existing.id){
            const { data, error } = await supabase.from('contacts').update(payload).eq('id', existing.id).select().single()
            if(error){ errors.push(`Failed update contact ${ghlId}: ${error.message}`); continue }
            updated++
            synced++
          } else {
            const { data, error } = await supabase.from('contacts').insert([payload]).select().single()
            if(error){ errors.push(`Failed insert contact ${ghlId}: ${error.message}`); continue }
            created++
            synced++
          }
        }catch(err:any){ errors.push(String(err.message || err)) }
      }

      // prepare next cursor: GHL returns lastId or last?. We'll attempt to get last item id
      const last = items[items.length-1]
      startAfterId = last && (last.id || last._id || last.contactId) ? String(last.id || last._id || last.contactId) : null
      // stop if less than page size
      if(items.length < 100) more = false
    }

    // log sync into crm_sync_log table
    try{
      const summary = { synced, created, updated, errors }
      await supabase.from('crm_sync_log').insert([{ source: 'ghl_contacts', summary, created_at: new Date().toISOString() }])
    }catch(e){ /* swallow logging error */ }

    // update agent_profiles.last_ghl_sync for current user (use server client)
    try{
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user || null
      if(user){
        await supabase.from('agent_profiles').update({ last_ghl_sync: new Date().toISOString() }).eq('user_id', user.id)
      }
    }catch(e){ /* ignore */ }

    const result: SyncResult = { synced, created, updated, errors }
    return NextResponse.json(result)
  }catch(err:any){
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

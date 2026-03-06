import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function run() {
  console.log('Looking for ghost deal_state rows (address NULL/empty, client NULL/empty, binding_date NULL)')
  const { data, error } = await supabase
    .from('deal_state')
    .select('id,address,client,binding_date')
    .or("(address.is.null,client.is.null,binding_date.is.null,address.eq.'',client.eq.'')")

  if (error) {
    console.error('Select error:', error.message)
    process.exit(1)
  }

  const ghosts = (data || []).filter((r: any) => {
    const addrEmpty = !r.address || r.address === ''
    const clientEmpty = !r.client || r.client === ''
    const bindingNull = r.binding_date === null
    return addrEmpty && clientEmpty && bindingNull
  })

  if (!ghosts.length) {
    console.log('No ghost rows found. Exiting.')
    return
  }

  console.log('Found ghost rows:', ghosts.map((g:any) => g.id))

  const ids = ghosts.map((g:any) => g.id)
  const { error: delErr } = await supabase.from('deal_state').delete().in('id', ids)
  if (delErr) {
    console.error('Delete error:', delErr.message)
    process.exit(1)
  }

  console.log('Deleted ghost rows:', ids)
}

run().catch(err => {
  console.error('Script error', err)
  process.exit(1)
})

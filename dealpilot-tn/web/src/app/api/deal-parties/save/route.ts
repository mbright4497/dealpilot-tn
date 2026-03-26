import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server';

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )
}
;

export async function POST(req: Request){
  try{
    const body = await req.json();
    const { transactionId, contacts } = body || {};
    if(!transactionId || !Array.isArray(contacts)) return NextResponse.json({ error: 'invalid payload' }, { status: 400 });

    const sb = getSupabase();

    // insert contacts and link to deal via deal_contacts
    const insertedContacts: any[] = [];
    for(const c of contacts){
      // basic validation
      if(!c.name || !c.role) continue;
      const contact = { name: c.name, email: c.email || null, phone: c.phone || null, company: c.company || null };
      const { data: d1, error: e1 } = await sb.from('contacts').insert(contact).select().single();
      if(e1) {
        console.error('contact insert error', e1);
        return NextResponse.json({ error: String(e1) }, { status: 500 });
      }
      insertedContacts.push(d1);
      const link = { deal_id: transactionId, contact_id: d1.id, role: c.role };
      const { error: e2 } = await sb.from('deal_contacts').insert(link);
      if(e2){
        console.error('deal_contacts insert error', e2);
        return NextResponse.json({ error: String(e2) }, { status: 500 });
      }
    }

    return NextResponse.json({ saved: true, contacts: insertedContacts });
  }catch(e){
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

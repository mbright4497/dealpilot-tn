import { NextResponse } from 'next/server';

export async function POST(req: Request){
  try{
    const { query } = await req.json();
    // In production this would call GHL client.searchContacts; here return mocked results
    const results = [
      { id: 'ghl_1', name: 'John Buyer', email: 'john@example.com', phone: '555-1111' },
      { id: 'ghl_2', name: 'Jane Seller', email: 'jane@example.com', phone: '555-2222' }
    ].filter(r => !query || r.name.toLowerCase().includes(query.toLowerCase()));
    return NextResponse.json({ results });
  }catch(e){
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

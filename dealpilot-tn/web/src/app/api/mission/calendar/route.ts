import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('start_time', { ascending: true })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data || [] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, description, start_time, end_time, all_day, assigned_agent, color, source } = body;
  if (!title || !start_time) return NextResponse.json({ error: 'title and start_time required' }, { status: 400 });
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({ title, description, start_time, end_time, all_day: all_day || false, assigned_agent, color: color || '#3b82f6', source: source || 'manual' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

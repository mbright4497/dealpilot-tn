export const dynamic = 'force-dynamic'

'use client'
import { useChecklists } from '../../../lib/hooks';

export default function ChecklistsPage(){
  const { data } = useChecklists();
  const rows = data?.data || [];
  return (<div>
    <h1 className="text-xl">Checklists</h1>
    <ul>{rows.map((r:any)=>(<li key={r.id}>{r.name} — {r.progress||0}%</li>))}</ul>
  </div>);
}

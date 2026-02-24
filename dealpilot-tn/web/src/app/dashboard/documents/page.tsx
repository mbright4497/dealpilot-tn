'use client'
import { useDocuments } from '../../../lib/hooks';

export default function DocumentsPage(){
  const { data } = useDocuments();
  const rows = data?.data || [];
  return (<div>
    <h1 className="text-xl">Documents</h1>
    <ul>{rows.map((r:any)=>(<li key={r.id}>{r.name} — {r.status}</li>))}</ul>
  </div>);
}

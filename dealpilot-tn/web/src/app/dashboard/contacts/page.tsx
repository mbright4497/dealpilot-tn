export const dynamic = 'force-dynamic'

'use client'
import { useContacts } from '../../../lib/hooks';

export default function ContactsPage(){
  const { data } = useContacts();
  const rows = data?.data || [];
  return (<div>
    <h1 className="text-xl">Contacts</h1>
    <table className="w-full mt-4"><thead><tr><th>Name</th><th>Phone</th><th>Email</th></tr></thead>
    <tbody>{rows.map((r:any)=>(<tr key={r.id}><td>{r.name}</td><td>{r.phone}</td><td>{r.email}</td></tr>))}</tbody></table>
  </div>);
}

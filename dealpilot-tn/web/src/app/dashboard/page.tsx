export const dynamic = 'force-dynamic'

'use client'
import { useDeals, useContacts } from '../../lib/hooks';

export default function DashboardPage(){
  const { data:deals } = useDeals();
  const { data:contacts } = useContacts();
  return (<div>
    <h1 className="text-2xl font-bold">Dashboard</h1>
    <div className="grid grid-cols-3 gap-4 mt-4">
      <div className="p-4 bg-white shadow">Contacts<br/>{contacts?.length||0}</div>
      <div className="p-4 bg-white shadow">Deals<br/>{deals?.length||0}</div>
      <div className="p-4 bg-white shadow">Pending<br/>0</div>
    </div>
  </div>);
}

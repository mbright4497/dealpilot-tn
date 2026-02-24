export const dynamic = 'force-dynamic'

'use client'
import { useDeals } from '../../../lib/hooks';

export default function DealsPage(){
  const { data } = useDeals();
  const rows = data?.data || [];
  return (<div>
    <h1 className="text-xl">Deals</h1>
    <table className="w-full mt-4"><thead><tr><th>Title</th><th>Buyer</th><th>Seller</th><th>Phase</th></tr></thead>
    <tbody>{rows.map((r:any)=>(<tr key={r.id}><td>{r.title}</td><td>{r.buyer_contact}</td><td>{r.seller_contact}</td><td>{r.status}</td></tr>))}</tbody></table>
  </div>);
}

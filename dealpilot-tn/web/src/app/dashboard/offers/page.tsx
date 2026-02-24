'use client'
import { useOffers } from '../../../lib/hooks';

export default function OffersPage(){
  const { data } = useOffers();
  const rows = data?.data || [];
  return (<div>
    <h1 className="text-xl">Offers</h1>
    <table className="w-full mt-4"><thead><tr><th>Property</th><th>Buyer</th><th>Amount</th><th>Score</th></tr></thead>
    <tbody>{rows.map((r:any)=>(<tr key={r.id}><td>{r.property}</td><td>{r.buyer}</td><td>{r.amount}</td><td>{r.score}</td></tr>))}</tbody></table>
  </div>);
}

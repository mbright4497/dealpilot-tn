'use client'
import React from 'react'

export default function PricingPage(){
  const tiers = [
    { name:'Solo Agent', price:'$29/mo', desc:'10 transactions, EVA, Deal Playbook' },
    { name:'Power Agent', price:'$59/mo', desc:'Unlimited, priority EVA, PDF upload' },
    { name:'Team', price:'$99/mo', desc:'5 seats, team dashboard' }
  ]
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Pricing</h1>
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        {tiers.map(t=> (
          <div key={t.name} className="p-4 bg-white rounded shadow">
            <div className="font-semibold">{t.name}</div>
            <div className="text-3xl font-bold mt-2">{t.price}</div>
            <div className="text-sm text-gray-600 mt-2">{t.desc}</div>
            <div className="mt-4"><button className="px-4 py-2 bg-orange-500 text-white rounded">Start Free Trial</button></div>
          </div>
        ))}
      </div>
    </div>
  )
}

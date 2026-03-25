"use client"
import React from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'

export default function StatsCards(){
  const supabase = createBrowserClient()
  const [stats,setStats] = React.useState<any>({})

  React.useEffect(()=>{async function load(){
    const { data:active } = await supabase.from('deals').select('id').neq('status','closed')
    const { data:closing } = await supabase.rpc('deals_closing_this_week') .catch(()=>({data:[]}))
    const { data:overdue } = await supabase.from('deal_deadlines').select('id').lt('due_date', new Date().toISOString().slice(0,10)).eq('status','pending')
    setStats({active: active?.length||0, closing: closing?.length||0, overdue: overdue?.length||0})
  } load()},[])

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-gray-800 p-3 rounded">Active Deals<div className="text-2xl font-bold">{stats.active}</div></div>
      <div className="bg-gray-800 p-3 rounded">Closing This Week<div className="text-2xl font-bold">{stats.closing}</div></div>
      <div className="bg-gray-800 p-3 rounded">Overdue Deadlines<div className="text-2xl font-bold text-red-400">{stats.overdue}</div></div>
    </div>
  )
}

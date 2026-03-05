import React from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 0

export default async function SettingsPage(){
  const supabase = createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  const user = data?.user || null
  if(!user) return (<div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] text-white">Unauthorized</div>)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="min-h-screen p-6 bg-[#0B0F1A] text-white">
      <div className="max-w-3xl mx-auto rounded-2xl bg-gray-900 p-6">
        <h2 className="text-2xl font-semibold mb-4">Profile Settings</h2>
        <form id="profile-form" method="post" action="/api/profile">
          <input type="hidden" name="_method" value="put" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300">Full name</label>
              <input name="full_name" defaultValue={profile?.full_name||''} className="w-full mt-1 p-2 rounded bg-gray-800 text-white border border-gray-700" />
            </div>
            <div>
              <label className="text-sm text-gray-300">Email</label>
              <input name="email" defaultValue={profile?.email||user.email||''} readOnly className="w-full mt-1 p-2 rounded bg-gray-800 text-white border border-gray-700 opacity-70" />
            </div>
            <div>
              <label className="text-sm text-gray-300">Brokerage</label>
              <input name="brokerage" defaultValue={profile?.brokerage||''} className="w-full mt-1 p-2 rounded bg-gray-800 text-white border border-gray-700" />
            </div>
            <div>
              <label className="text-sm text-gray-300">Phone</label>
              <input name="phone" defaultValue={profile?.phone||''} className="w-full mt-1 p-2 rounded bg-gray-800 text-white border border-gray-700" />
            </div>
            <div>
              <label className="text-sm text-gray-300">License Number</label>
              <input name="license_number" defaultValue={profile?.license_number||''} className="w-full mt-1 p-2 rounded bg-gray-800 text-white border border-gray-700" />
            </div>
          </div>

          <div className="mt-4">
            <button type="submit" className="px-4 py-2 bg-[#F97316] rounded text-white font-semibold">Save changes</button>
          </div>
        </form>
      </div>
    </div>
  )
}

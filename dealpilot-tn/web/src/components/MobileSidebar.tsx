'use client'
import React from 'react'
import { ClipboardList } from 'lucide-react'
import { signOutAndRedirectToLogin } from '@/lib/auth-client'

export default function MobileSidebar({ items, unreadCount, onNavigate, onClose }:{ items:{id:string,label:string}[], unreadCount:number, onNavigate:(id:string)=>void, onClose:()=>void }){
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-64 bg-dp-sidebar p-4 transform transition-transform duration-300">
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">CP</div>
          <div>
            <h2 className="text-white font-semibold text-sm leading-tight">Closing Jet TN</h2>
            <p className="text-gray-400 text-xs">Tri-Cities Transaction Coordinator</p>
          </div>
        </div>
        <nav className="mt-4 space-y-2">
          {items.map(it=> (
            <button key={it.id} onClick={()=>{ onNavigate(it.id); onClose() }} className="w-full text-left px-3 py-2 rounded text-gray-300 hover:bg-gray-800 hover:text-white">{it.label}</button>
          ))}
          <a
            href="/service-providers"
            onClick={onClose}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <ClipboardList size={18} strokeWidth={2} />
            Service Providers
          </a>
          <button onClick={()=>{ onNavigate('communications'); onClose() }} className="w-full text-left px-3 py-2 rounded text-gray-300 hover:bg-gray-800 hover:text-white">Communications {unreadCount>0 && <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-semibold">{unreadCount}</span>}</button>
          <button onClick={()=>{ onNavigate('settings'); onClose() }} className="w-full text-left px-3 py-2 rounded text-gray-300 hover:bg-gray-800 hover:text-white">Settings</button>
        </nav>
        <div className="mt-6 border-t border-gray-800 pt-4">
          <button type="button" onClick={() => { void signOutAndRedirectToLogin() }} className="w-full flex items-center gap-3 px-3 py-2 rounded text-red-400 hover:bg-gray-800">Logout</button>
        </div>
      </div>
    </div>
  )
}

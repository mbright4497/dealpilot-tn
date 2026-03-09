import React from 'react'
import DealCommandCenter from '@/components/DealCommandCenter'
import PartiesPanel from '@/components/PartiesPanel'

export default function Page(){
  return (
    <div className="p-4">
      <DealCommandCenter />
      <div className="mt-6 stack-md">
        <PartiesPanel />
      </div>
    </div>
  )
}

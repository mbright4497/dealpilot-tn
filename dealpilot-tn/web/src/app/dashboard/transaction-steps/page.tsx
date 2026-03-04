'use client'

import React from 'react'
import TransactionStepper from '@/components/TransactionStepper'
import ContractViewer from '@/components/ContractViewer'

export default function TransactionStepsPage() {

  const contractData = {
    propertyAddress: "123 Maple St, Johnson City TN",
    buyers: "John Smith, Jane Smith",
    sellers: "Bob Johnson",
    purchasePrice: 425000,
    earnestMoney: 5000,
    closingDate: "2026-05-30",
    inspectionStart: "2026-03-01",
    inspectionEnd: "2026-03-10",
    financingDate: "2026-04-15",
    specialStipulations: "Seller to repair roof prior to closing."
  }

  const steps = [
    {
      id: 1,
      title: 'Contract Upload',
      status: 'complete',
      dueDate: '2026-03-01',
      notes: 'RF401 uploaded and executed'
    },
    {
      id: 2,
      title: 'Earnest Money',
      status: 'active',
      dueDate: '2026-03-03',
      notes: 'Awaiting confirmation from title company'
    },
    {
      id: 3,
      title: 'Inspection Period',
      status: 'pending',
      dueDate: '2026-03-10'
    },
    {
      id: 4,
      title: 'Title Search',
      status: 'pending'
    },
    {
      id: 5,
      title: 'Financing Contingency',
      status: 'pending',
      dueDate: '2026-04-15'
    },
    {
      id: 6,
      title: 'Appraisal',
      status: 'pending'
    },
    {
      id: 7,
      title: 'Final Walkthrough',
      status: 'pending'
    },
    {
      id: 8,
      title: 'Closing',
      status: 'pending',
      dueDate: '2026-05-30'
    }
  ]

  return (
    <div className="min-h-screen bg-[#0a1929] text-white p-6">

      {/* Page Header */}

      <div className="mb-8">

        <h1 className="text-2xl font-semibold">
          Transaction Steps
        </h1>

        <p className="text-gray-400 text-sm mt-1">
          Guided RF401 transaction workflow
        </p>

      </div>

      {/* Layout */}

      <div className="grid lg:grid-cols-2 gap-6">

        <TransactionStepper steps={steps} />

        <ContractViewer contract={contractData} />

      </div>

    </div>
  )
}

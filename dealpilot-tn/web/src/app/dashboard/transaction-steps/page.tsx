'use client'

import dynamic from 'next/dynamic'

const TransactionStepper = dynamic(() => import('@/components/TransactionStepper'), { ssr: false })
const ContractViewer = dynamic(() => import('@/components/ContractViewer'), { ssr: false })

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

  return (
    <div className="min-h-screen bg-[#0a1929] text-white p-6">

      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Transaction Steps</h1>
        <p className="text-gray-400 text-sm mt-1">Guided RF401 transaction workflow</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <TransactionStepper />
        <ContractViewer contract={contractData} />
      </div>

    </div>
  )
}

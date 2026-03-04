'use client'

import React, { useState } from 'react'
import { Pencil, CheckCircle, Circle } from 'lucide-react'
import ContractUploader from './ContractUploader'

type TimelineEvent = {
  label: string
  date: string
  status: string
}

type ContractData = {
  propertyAddress: string
  buyerNames: string[]
  sellerNames: string[]
  purchasePrice: number
  earnestMoney: number
  bindingDate: string
  closingDate: string
  inspectionEndDate: string
  financingContingencyDate: string
  specialStipulations: string
  contractType: string
  timeline: TimelineEvent[]
}

type Props = {
  onConfirm: (data: ContractData) => void
  onCancel: () => void
}

const steps = [
  'Upload',
  'Review Details',
  'Timeline',
  'Confirm'
]

export default function ContractIntake({ onConfirm, onCancel }: Props) {

  const [step, setStep] = useState(1)
  const [data, setData] = useState<ContractData | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  function updateField(field: string, value: any) {
    if (!data) return
    setData({ ...data, [field]: value })
  }

  function renderStepper() {
    return (
      <div className="flex items-center justify-between mb-6">

        {steps.map((label, i) => {

          const index = i + 1
          const active = step === index
          const complete = step > index

          return (
            <div key={label} className="flex-1 flex items-center">

              <div className="flex items-center gap-2">

                {complete && <CheckCircle className="text-orange-500" size={18} />}
                {!complete && <Circle className={`${active ? 'text-orange-500' : 'text-gray-500'}`} size={18} />}

                <span className={`${active ? 'text-white' : 'text-gray-400'} text-sm`}>
                  {label}
                </span>

              </div>

              {index < steps.length && (
                <div className="flex-1 h-[1px] bg-white/10 mx-4" />
              )}

            </div>
          )
        })}

      </div>
    )
  }

  function FieldCard(label: string, field: keyof ContractData) {

    if (!data) return null

    const value = data[field]

    return (
      <div className="bg-[#16213e] border border-white/10 rounded-lg p-4">

        <div className="flex justify-between items-center mb-2">

          <span className="text-gray-300 text-sm">{label}</span>

          <Pencil
            size={14}
            className="text-gray-400 cursor-pointer"
            onClick={() => setEditing(field)}
          />

        </div>

        {editing === field ? (
          <input
            className="w-full bg-[#0a1929] border border-white/10 rounded p-2 text-white"
            value={Array.isArray(value) ? value.join(', ') : value || ''}
            onChange={(e) => updateField(field, e.target.value)}
            onBlur={() => setEditing(null)}
          />
        ) : (
          <div className="text-white">
            {Array.isArray(value) ? value.join(', ') : value || '—'}
          </div>
        )}

      </div>
    )
  }

  return (

    <div className="bg-[#0a1929] border border-white/10 rounded-xl p-6 text-white">

      {/* Eva Header */}

      <div className="mb-6 flex items-center gap-3">

        <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-black font-bold">
          E
        </div>

        <div className="text-gray-300 text-sm">

          {step === 1 && 'Upload your contract and I will extract the details.'}
          {step === 2 && 'I found the following details in your contract.'}
          {step === 3 && 'Here are the important contract deadlines.'}
          {step === 4 && 'Everything looks good. Ready to create the transaction?'}

        </div>

      </div>

      {renderStepper()}

      {/* STEP 1 */}

      {step === 1 && (
        <ContractUploader
          onParsed={(parsed) => {
            setData(parsed)
            setStep(2)
          }}
        />
      )}

      {/* STEP 2 */}

      {step === 2 && data && (

        <div className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {FieldCard('Property Address', 'propertyAddress')}
            {FieldCard('Buyer Names', 'buyerNames')}
            {FieldCard('Seller Names', 'sellerNames')}
            {FieldCard('Purchase Price', 'purchasePrice')}
            {FieldCard('Earnest Money', 'earnestMoney')}
            {FieldCard('Binding Date', 'bindingDate')}
            {FieldCard('Closing Date', 'closingDate')}
            {FieldCard('Inspection Period End', 'inspectionEndDate')}
            {FieldCard('Financing Contingency', 'financingContingencyDate')}
            {FieldCard('Contract Type', 'contractType')}

          </div>

          <div className="bg-[#16213e] border border-white/10 rounded-lg p-4">

            <div className="flex justify-between mb-2">
              <span className="text-gray-300 text-sm">Special Stipulations</span>
              <Pencil
                size={14}
                className="text-gray-400 cursor-pointer"
                onClick={() => setEditing('specialStipulations')}
              />
            </div>

            {editing === 'specialStipulations' ? (
              <textarea
                className="w-full bg-[#0a1929] border border-white/10 rounded p-2 text-white"
                value={data.specialStipulations || ''}
                onChange={(e) => updateField('specialStipulations', e.target.value)}
                onBlur={() => setEditing(null)}
              />
            ) : (
              <div className="text-white whitespace-pre-line">
                {data.specialStipulations || '—'}
              </div>
            )}

          </div>

          <div className="flex justify-between pt-4">

            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-white"
            >
              Cancel
            </button>

            <button
              onClick={() => setStep(3)}
              className="bg-orange-500 px-4 py-2 rounded text-black font-medium"
            >
              Continue
            </button>

          </div>

        </div>
      )}

      {/* STEP 3 */}

      {step === 3 && data && (

        <div>

          <div className="space-y-3">

            {data.timeline?.map((event, i) => (

              <div
                key={i}
                className="bg-[#16213e] border border-white/10 rounded-lg p-4 flex justify-between"
              >

                <div>
                  <div className="text-white font-medium">
                    {event.label}
                  </div>

                  <div className="text-gray-400 text-sm">
                    {event.date}
                  </div>
                </div>

                <div className="text-xs text-gray-400 capitalize">
                  {event.status}
                </div>

              </div>

            ))}

          </div>

          <div className="flex justify-between pt-6">

            <button
              onClick={() => setStep(2)}
              className="text-gray-400 hover:text-white"
            >
              Back
            </button>

            <button
              onClick={() => setStep(4)}
              className="bg-orange-500 px-4 py-2 rounded text-black font-medium"
            >
              Continue
            </button>

          </div>

        </div>
      )}

      {/* STEP 4 */}

      {step === 4 && data && (

        <div className="space-y-4">

          <div className="bg-[#16213e] border border-white/10 rounded-lg p-4">

            <div className="text-gray-400 text-sm mb-2">
              Property
            </div>

            <div className="text-white text-lg font-medium">
              {data.propertyAddress}
            </div>

          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">

            <div className="bg-[#16213e] p-4 rounded border border-white/10">
              <div className="text-gray-400">Buyer</div>
              <div className="text-white">{data.buyerNames?.join(', ')}</div>
            </div>

            <div className="bg-[#16213e] p-4 rounded border border-white/10">
              <div className="text-gray-400">Seller</div>
              <div className="text-white">{data.sellerNames?.join(', ')}</div>
            </div>

            <div className="bg-[#16213e] p-4 rounded border border-white/10">
              <div className="text-gray-400">Price</div>
              <div className="text-white">${data.purchasePrice}</div>
            </div>

            <div className="bg-[#16213e] p-4 rounded border border-white/10">
              <div className="text-gray-400">Closing</div>
              <div className="text-white">{data.closingDate}</div>
            </div>

          </div>

          <div className="flex justify-between pt-6">

            <button
              onClick={() => setStep(3)}
              className="text-gray-400 hover:text-white"
            >
              Back
            </button>

            <button
              onClick={() => onConfirm(data)}
              className="bg-orange-500 px-6 py-2 rounded text-black font-medium"
            >
              Create Transaction
            </button>

          </div>

        </div>
      )}

    </div>
  )
}

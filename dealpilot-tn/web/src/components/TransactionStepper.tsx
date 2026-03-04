'use client'

import React, { useMemo } from 'react'
import {
  Upload,
  DollarSign,
  Search,
  FileCheck,
  Banknote,
  ClipboardCheck,
  Home,
  CheckCircle
} from 'lucide-react'

type StepStatus = 'pending' | 'active' | 'complete'

type Step = {
  id: number
  title: string
  icon: React.ElementType
  status: StepStatus
  dueDate?: string
  notes?: string
}

type Props = {
  steps?: Step[]
}

const DEFAULT_STEPS: Step[] = [
  { id: 1, title: 'Contract Upload', icon: Upload, status: 'complete' },
  { id: 2, title: 'Earnest Money', icon: DollarSign, status: 'active' },
  { id: 3, title: 'Inspection Period', icon: Search, status: 'pending' },
  { id: 4, title: 'Title Search', icon: FileCheck, status: 'pending' },
  { id: 5, title: 'Financing Contingency', icon: Banknote, status: 'pending' },
  { id: 6, title: 'Appraisal', icon: ClipboardCheck, status: 'pending' },
  { id: 7, title: 'Final Walkthrough', icon: Home, status: 'pending' },
  { id: 8, title: 'Closing', icon: CheckCircle, status: 'pending' }
]

function statusColor(status: StepStatus) {
  switch (status) {
    case 'complete':
      return 'bg-green-500'
    case 'active':
      return 'bg-orange-500'
    default:
      return 'bg-gray-500'
  }
}

function borderColor(status: StepStatus) {
  switch (status) {
    case 'complete':
      return 'border-green-500'
    case 'active':
      return 'border-orange-500'
    default:
      return 'border-white/10'
  }
}

export default function TransactionStepper({ steps = DEFAULT_STEPS }: Props) {

  const progress = useMemo(() => {
    const completed = steps.filter(s => s.status === 'complete').length
    return Math.round((completed / steps.length) * 100)
  }, [steps])

  return (
    <div className="bg-[#0a1929] border border-white/10 rounded-xl p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-lg font-semibold">
          Transaction Progress
        </h2>

        <span className="text-sm text-gray-300">
          {progress}% Complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 h-2 rounded mb-8 overflow-hidden">
        <div
          className="h-full bg-orange-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">

        {steps.map(step => {
          const Icon = step.icon

          return (
            <div
              key={step.id}
              className={`border rounded-lg p-4 ${borderColor(step.status)} bg-[#0f223a]`}
            >

              {/* Step Header */}
              <div className="flex items-center gap-3 mb-2">

                <div className={`p-2 rounded ${statusColor(step.status)}`}>
                  <Icon size={16} className="text-black" />
                </div>

                <span className="text-white font-medium text-sm">
                  {step.title}
                </span>

              </div>

              {/* Status */}
              <div className="text-xs text-gray-400 mb-1">
                Status: <span className="text-white">{step.status}</span>
              </div>

              {/* Due Date */}
              {step.dueDate && (
                <div className="text-xs text-gray-400 mb-1">
                  Due: <span className="text-white">{step.dueDate}</span>
                </div>
              )}

              {/* Notes */}
              {step.notes && (
                <div className="text-xs text-gray-400 mt-2">
                  {step.notes}
                </div>
              )}

            </div>
          )
        })}

      </div>
    </div>
  )
}

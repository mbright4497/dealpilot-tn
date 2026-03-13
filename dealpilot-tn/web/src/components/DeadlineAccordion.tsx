"use client"
import React, { useState } from 'react'

interface DeadlineItem {
  id: string;
  label: string;
  due_date: string;
  status: string;
}

interface DeadlineAccordionProps {
  items: DeadlineItem[];
}

export default function DeadlineAccordion({ items }: DeadlineAccordionProps) {
  const [openTier, setOpenTier] = useState<number | null>(1);
  const now = new Date();

  const tier1 = items.filter(i => i.status !== 'done' && new Date(i.due_date) < now)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const tier2 = items.filter(i => i.status !== 'done' && new Date(i.due_date) >= now)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const tier3 = items.filter(i => i.status === 'done')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  return (
    <div className="space-y-2">
      {/* Tier 1: Critical / Past Due (red) */}
      <div className="border border-red-300 rounded-lg">
        <button
          onClick={() => setOpenTier(openTier === 1 ? null : 1)}
          className="w-full flex justify-between items-center p-3 text-left font-semibold text-red-700 bg-red-50 rounded-t-lg"
        >
          <span>Critical / Past Due</span>
          <span className="text-sm">{tier1.length} items</span>
        </button>
        {openTier === 1 && (
          <div className="p-3 space-y-2">
            {tier1.length === 0 ? (
              <p className="text-gray-500 text-sm">No items</p>
            ) : tier1.map(item => (
              <div key={item.id} className="flex justify-between text-sm border-b pb-1">
                <span>{item.label}</span>
                <span className="text-gray-500">{item.due_date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tier 2: Upcoming (orange) */}
      <div className="border border-orange-300 rounded-lg">
        <button
          onClick={() => setOpenTier(openTier === 2 ? null : 2)}
          className="w-full flex justify-between items-center p-3 text-left font-semibold text-orange-700 bg-orange-50 rounded-t-lg"
        >
          <span>Action Items / Upcoming</span>
          <span className="text-sm">{tier2.length} items</span>
        </button>
        {openTier === 2 && (
          <div className="p-3 space-y-2">
            {tier2.length === 0 ? (
              <p className="text-gray-500 text-sm">No items</p>
            ) : tier2.map(item => (
              <div key={item.id} className="flex justify-between text-sm border-b pb-1">
                <span>{item.label}</span>
                <span className="text-gray-500">{item.due_date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tier 3: Completed (green) */}
      <div className="border border-green-300 rounded-lg">
        <button
          onClick={() => setOpenTier(openTier === 3 ? null : 3)}
          className="w-full flex justify-between items-center p-3 text-left font-semibold text-green-700 bg-green-50 rounded-t-lg"
        >
          <span>Completed</span>
          <span className="text-sm">{tier3.length} items</span>
        </button>
        {openTier === 3 && (
          <div className="p-3 space-y-2">
            {tier3.length === 0 ? (
              <p className="text-gray-500 text-sm">No items</p>
            ) : tier3.map(item => (
              <div key={item.id} className="flex justify-between text-sm border-b pb-1">
                <span>{item.label}</span>
                <span className="text-gray-500">{item.due_date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

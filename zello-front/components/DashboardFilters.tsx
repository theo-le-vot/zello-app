'use client'

import { useState } from 'react'

interface DashboardFiltersProps {
  onPeriodChange?: (period: string) => void
  onStoreChange?: (storeId: string) => void
}

export default function DashboardFilters({ onPeriodChange, onStoreChange }: DashboardFiltersProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('7d')

  const periods = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7j' },
    { value: '30d', label: '30j' },
    { value: '90d', label: '90j' },
    { value: 'year', label: 'Année' },
  ]

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
    onPeriodChange?.(period)
  }

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200/60 rounded-lg p-1">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => handlePeriodChange(period.value)}
          className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
            selectedPeriod === period.value
              ? 'bg-[#093A23] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  )
}

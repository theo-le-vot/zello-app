'use client'

import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: LucideIcon
  iconColor?: string
  iconBgColor?: string
  trend?: 'up' | 'down' | 'neutral'
}

export default function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-[#093A23]',
  iconBgColor = 'bg-[#093A23]/10',
  trend = 'neutral'
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-5 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`${iconBgColor} ${iconColor} p-2.5 rounded-lg`}>
          <Icon size={20} strokeWidth={2} />
        </div>
        {change !== undefined && (
          <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
            trend === 'up' 
              ? 'bg-emerald-50 text-emerald-700' 
              : trend === 'down' 
                ? 'bg-red-50 text-red-700'
                : 'bg-gray-100 text-gray-700'
          }`}>
            {trend === 'up' && '↑'} {trend === 'down' && '↓'} {Math.abs(change)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
          {title}
        </p>
        <p className="text-2xl font-semibold text-gray-900 tracking-tight">
          {value}
        </p>
      </div>
    </div>
  )
}

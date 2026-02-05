'use client'

import { ReactNode } from 'react'

interface ChartContainerProps {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}

export default function ChartContainer({ 
  title, 
  subtitle, 
  children, 
  action,
  className = '' 
}: ChartContainerProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200/60 p-6 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-200 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900 tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="min-h-[200px]">
        {children}
      </div>
    </div>
  )
}

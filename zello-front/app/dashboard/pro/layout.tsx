'use client'

import HeaderPro from '@/components/HeaderPro'

export default function DashboardProLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <HeaderPro />
      <main className="flex-1 p-6 bg-gray-50">
        {children}
      </main>
    </div>
  )
}

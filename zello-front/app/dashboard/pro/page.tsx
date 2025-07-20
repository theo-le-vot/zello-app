'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardPro() {
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
    }

    fetchUser()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold mb-6 text-[#093A23]">Tableau de bord</h1>

        {/* Cards KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-600 mb-1">Chiffre d’affaires total</p>
            <p className="text-2xl font-semibold text-[#093A23]">€56 432</p>
            <p className="text-green-600 text-sm mt-1">▲ +12,3%</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-600 mb-1">Fréquentation</p>
            <p className="text-2xl font-semibold text-[#093A23]">4 291 visites</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-600 mb-1">Fidélisation</p>
            <p className="text-2xl font-semibold text-[#093A23]">60%</p>
            <p className="text-sm text-gray-500">de transactions fidèles</p>
          </div>
        </div>

        {/* Graphiques et listes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded shadow h-60">
            <p className="text-sm font-medium mb-2">Fréquentation</p>
            <div className="h-full flex items-center justify-center text-gray-400">[Graphique à venir]</div>
          </div>
          <div className="bg-white p-4 rounded shadow h-60">
            <p className="text-sm font-medium mb-2">Top clients</p>
            <ul className="text-sm text-gray-700 mt-2 space-y-1">
              <li>Jacques Dupont – 5 visites</li>
              <li>Sophie Laurent – 3 visites</li>
              <li>SNCF – 3 visites</li>
              <li>Emma Robert – 3 visites</li>
            </ul>
          </div>
        </div>

        <div className="bg-white mt-10 p-4 rounded shadow h-60">
          <p className="text-sm font-medium mb-2">Chiffre d’affaires</p>
          <div className="h-full flex items-center justify-center text-gray-400">[Graphique à venir]</div>
        </div>
      </main>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

interface ClientStat {
  id: string
  customer: {
    first_name: string
    last_name: string
  }
  nb_visits: number
}

export default function DashboardPro() {
  const router = useRouter()
  const [totalCA, setTotalCA] = useState(0)
  const [totalVisits, setTotalVisits] = useState(0)
  const [fidelisation, setFidelisation] = useState(0)
  const [topClients, setTopClients] = useState<ClientStat[]>([])

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: userData } = await supabase
        .from('users')
        .select('active_store_id')
        .eq('id', user.id)
        .single()

      const storeId = userData?.active_store_id
      if (!storeId) return

      // Chiffre d'affaires
      const { data: caData } = await supabase
        .from('transactions')
        .select('total_amount')
        .eq('store_id', storeId)

      const totalCA = caData?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0
      setTotalCA(totalCA)

      // Fréquentation = total visites clients
      const { data: visitsData } = await supabase
        .from('customers_stores')
        .select('nb_visits')
        .eq('store_id', storeId)

      const totalVisits = visitsData?.reduce((sum, c) => sum + (c.nb_visits || 0), 0) || 0
      setTotalVisits(totalVisits)

      // Fidélisation : % transactions avec un client connu
      const { data: txData } = await supabase
        .from('transactions')
        .select('customer_id')
        .eq('store_id', storeId)

      const totalTx = txData?.length || 0
      const fidelised = txData?.filter(t => t.customer_id !== null).length || 0
      const fidelisationRate = totalTx > 0 ? Math.round((fidelised / totalTx) * 100) : 0
      setFidelisation(fidelisationRate)

      // Top clients
      const { data: top } = await supabase
        .from('customers_stores')
        .select(`
          id,
          nb_visits,
          customer:customers (
            first_name,
            last_name
          )
        `)
        .eq('store_id', storeId)
        .order('nb_visits', { ascending: false })
        .limit(5)

      const topClean: ClientStat[] = (top || []).map((item: any) => ({
        id: item.id,
        nb_visits: item.nb_visits || 0,
        customer: Array.isArray(item.customer) ? item.customer[0] : item.customer
      }))

      setTopClients(topClean)
    }

    fetchStats()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold mb-6 text-[#093A23]">Tableau de bord</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-600 mb-1">Chiffre d’affaires total</p>
            <p className="text-2xl font-semibold text-[#093A23]">
              €{totalCA.toLocaleString('fr-FR')}
            </p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-600 mb-1">Fréquentation</p>
            <p className="text-2xl font-semibold text-[#093A23]">
              {totalVisits.toLocaleString('fr-FR')} visites
            </p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-600 mb-1">Fidélisation</p>
            <p className="text-2xl font-semibold text-[#093A23]">
              {fidelisation}%
            </p>
            <p className="text-sm text-gray-500">de transactions fidélisées</p>
          </div>
        </div>

        {/* Graphique et Top Clients */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded shadow h-60">
            <p className="text-sm font-medium mb-2">Fréquentation</p>
            <div className="h-full flex items-center justify-center text-gray-400">[Graphique à venir]</div>
          </div>

          <div className="bg-white p-4 rounded shadow h-60 overflow-auto">
            <p className="text-sm font-medium mb-2">Top clients</p>
            <ul className="text-sm text-gray-700 mt-2 space-y-1">
              {topClients.map((c) => (
                <li key={c.id}>
                  {c.customer?.first_name} {c.customer?.last_name} – {c.nb_visits} visite{c.nb_visits > 1 ? 's' : ''}
                </li>
              ))}
              {topClients.length === 0 && (
                <li className="text-gray-400 italic">Aucun client pour l’instant.</li>
              )}
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

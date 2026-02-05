'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import HeaderPro from '@/components/HeaderPro'
import MetricCard from '@/components/charts/MetricCard'
import ChartContainer from '@/components/charts/ChartContainer'
import DashboardFilters from '@/components/DashboardFilters'
import { TrendingUp, Users, ShoppingCart, Heart, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface ClientStat {
  id: string
  customer: {
    first_name: string
    last_name: string
  }
  visits: number
  totalAmount: number
  avgBasket: number
}

export default function DashboardPro() {
  const router = useRouter()
  const [totalCA, setTotalCA] = useState(0)
  const [totalVisits, setTotalVisits] = useState(0)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [fidelisation, setFidelisation] = useState(0)
  const [topClients, setTopClients] = useState<ClientStat[]>([])
  const [topCriteria, setTopCriteria] = useState<'tickets' | 'average' | 'total'>('tickets')
  const [frequentationData, setFrequentationData] = useState<any[]>([])
  const [caData, setCAData] = useState<any[]>([])

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
        .select('visits')
        .eq('store_id', storeId)

      const totalVisits = visitsData?.reduce((sum, c) => sum + (c.visits || 0), 0) || 0
      setTotalVisits(totalVisits)

      // Fidélisation : % transactions avec un client connu
      const { data: txData } = await supabase
        .from('transactions')
        .select('customer_id')
        .eq('store_id', storeId)

      const totalTx = txData?.length || 0
      setTotalTransactions(totalTx)
      const fidelised = txData?.filter(t => t.customer_id !== null).length || 0
      const fidelisationRate = totalTx > 0 ? Math.round((fidelised / totalTx) * 100) : 0
      setFidelisation(fidelisationRate)

      // Top clients avec toutes les métriques
      const { data: clientsData } = await supabase
        .from('customers_stores')
        .select(`
          id,
          customer_id,
          customer:customers (
            first_name,
            last_name
          )
        `)
        .eq('store_id', storeId)

      // Calculer les métriques pour chaque client
      const clientsWithStats = await Promise.all(
        (clientsData || []).map(async (client: any) => {
          // Récupérer toutes les transactions du client
          const { data: transactions } = await supabase
            .from('transactions')
            .select('total_amount')
            .eq('store_id', storeId)
            .eq('customer_id', client.customer_id)

          const ticketCount = transactions?.length || 0
          const totalAmount = transactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0
          const avgBasket = ticketCount > 0 ? totalAmount / ticketCount : 0

          return {
            id: client.id,
            visits: ticketCount,
            totalAmount: totalAmount,
            avgBasket: avgBasket,
            customer: Array.isArray(client.customer) ? client.customer[0] : client.customer
          }
        })
      )

      // Filtrer les clients sans transactions et trier selon le critère
      const clientsFiltered = clientsWithStats.filter(c => c.visits > 0)
      
      setTopClients(clientsFiltered)

      // Données pour les graphiques - 30 derniers jours
      const today = new Date()
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(today)
        date.setDate(date.getDate() - (29 - i))
        return date.toISOString().split('T')[0]
      })

      // Récupérer toutes les transactions des 30 derniers jours
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('date, total_amount, customer_id')
        .eq('store_id', storeId)
        .gte('date', last30Days[0])
        .lte('date', last30Days[29])

      // Grouper par date pour le graphique
      const dataByDate = last30Days.map(date => {
        const dayTransactions = (recentTransactions || []).filter(t => t.date === date)
        const totalCA = dayTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0)
        const ticketCount = dayTransactions.length
        const clientCount = new Set(dayTransactions.map(t => t.customer_id).filter(Boolean)).size

        return {
          date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          tickets: ticketCount,
          clients: clientCount,
          ca: parseFloat(totalCA.toFixed(2))
        }
      })

      setFrequentationData(dataByDate)
      setCAData(dataByDate)
    }

    fetchStats()
  }, [router])

  const getSortedTopClients = () => {
    const sorted = [...topClients]
    switch (topCriteria) {
      case 'tickets':
        return sorted.sort((a, b) => b.visits - a.visits).slice(0, 5)
      case 'average':
        return sorted.sort((a, b) => b.avgBasket - a.avgBasket).slice(0, 5)
      case 'total':
        return sorted.sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5)
      default:
        return sorted.slice(0, 5)
    }
  }

  const getClientMetricLabel = (client: ClientStat) => {
    switch (topCriteria) {
      case 'tickets':
        return `${client.visits} ticket${client.visits > 1 ? 's' : ''}`
      case 'average':
        return `${client.avgBasket.toFixed(2)} €/ticket`
      case 'total':
        return `${client.totalAmount.toFixed(2)} € total`
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderPro />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header with Filters */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">Vue d'ensemble</h1>
            <p className="text-sm text-gray-600">Suiv ez les performances de votre activité</p>
          </div>
          <DashboardFilters />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Chiffre d'affaires"
            value={`${totalCA.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€`}
            change={12.5}
            trend="up"
            icon={TrendingUp}
            iconColor="text-emerald-600"
            iconBgColor="bg-emerald-50"
          />
          <MetricCard
            title="Fréquentation"
            value={totalVisits.toLocaleString('fr-FR')}
            change={8.3}
            trend="up"
            icon={Users}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
          />
          <MetricCard
            title="Transactions"
            value={totalTransactions.toLocaleString('fr-FR')}
            change={5.2}
            trend="up"
            icon={ShoppingCart}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-50"
          />
          <MetricCard
            title="Fidélisation"
            value={`${fidelisation}%`}
            change={fidelisation > 50 ? 2.1 : -1.5}
            trend={fidelisation > 50 ? 'up' : 'down'}
            icon={Heart}
            iconColor="text-rose-600"
            iconBgColor="bg-rose-50"
          />
        </div>

        {/* Graphiques et Top Clients */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Graphique Fréquentation */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📈</span>
                <h2 className="text-base font-semibold text-gray-800">Fréquentation (30 derniers jours)</h2>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={frequentationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    stroke="#888"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    stroke="#888"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="tickets" 
                    stroke="#093A23" 
                    strokeWidth={2}
                    name="Tickets"
                    dot={{ fill: '#093A23', r: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clients" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Clients"
                    dot={{ fill: '#10b981', r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Clients */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <h2 className="text-base font-semibold text-gray-800">Top clients</h2>
              </div>
            </div>
            <select
              value={topCriteria}
              onChange={(e) => setTopCriteria(e.target.value as 'tickets' | 'average' | 'total')}
              className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 mb-3 focus:outline-none focus:ring-2 focus:ring-[#093A23]"
            >
              <option value="tickets">🎫 Nombre de tickets</option>
              <option value="average">📊 Panier moyen</option>
              <option value="total">💰 Total ventes</option>
            </select>
            <div className="space-y-2">
              {getSortedTopClients().map((c, index) => (
                <div key={c.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#093A23] to-[#0d5534] flex items-center justify-center text-white font-bold text-xs">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-xs">
                      {c.customer?.first_name} {c.customer?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getClientMetricLabel(c)}
                    </p>
                  </div>
                </div>
              ))}
              {getSortedTopClients().length === 0 && (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">👥</div>
                  <p className="text-gray-400 italic text-xs">Aucun client</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Graphique CA */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💰</span>
            <h2 className="text-base font-semibold text-gray-800">Chiffre d'affaires (30 derniers jours)</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={caData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  stroke="#888"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  stroke="#888"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${value} €`, 'CA']}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar 
                  dataKey="ca" 
                  fill="#093A23" 
                  name="Chiffre d'affaires"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  )
}

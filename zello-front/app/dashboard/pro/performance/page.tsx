'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useStore } from '@/lib/contexts/StoreContext'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface PeriodStats {
  ca: number
  transactions: number
  panierMoyen: number
  clients: number
  produits: number
}

interface ProductStat {
  name: string
  quantity: number
  revenue: number
}

export default function PerformancePage() {
  const { refreshTrigger } = useStore()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d' | '3m' | '6m' | '1y' | 'custom'>('30d')
  const [compareMode, setCompareMode] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Stats actuelles et précédentes
  const [currentStats, setCurrentStats] = useState<PeriodStats>({ ca: 0, transactions: 0, panierMoyen: 0, clients: 0, produits: 0 })
  const [previousStats, setPreviousStats] = useState<PeriodStats>({ ca: 0, transactions: 0, panierMoyen: 0, clients: 0, produits: 0 })

  // Données graphiques
  const [caEvolution, setCAEvolution] = useState<any[]>([])
  const [transactionTypes, setTransactionTypes] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<ProductStat[]>([])
  const [weekdayData, setWeekdayData] = useState<any[]>([])
  const [clientEvolution, setClientEvolution] = useState<any[]>([])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

  const getDates = () => {
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()
    let prevStartDate = new Date()
    let prevEndDate = new Date()

    if (period === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate)
      endDate = new Date(customEndDate)
      const diff = endDate.getTime() - startDate.getTime()
      prevEndDate = new Date(startDate.getTime() - 1)
      prevStartDate = new Date(prevEndDate.getTime() - diff)
    } else {
      switch (period) {
        case '7d':
          startDate.setDate(now.getDate() - 7)
          prevStartDate.setDate(now.getDate() - 14)
          prevEndDate.setDate(now.getDate() - 8)
          break
        case '30d':
          startDate.setDate(now.getDate() - 30)
          prevStartDate.setDate(now.getDate() - 60)
          prevEndDate.setDate(now.getDate() - 31)
          break
        case '3m':
          startDate.setMonth(now.getMonth() - 3)
          prevStartDate.setMonth(now.getMonth() - 6)
          prevEndDate = new Date(startDate.getTime() - 1)
          break
        case '6m':
          startDate.setMonth(now.getMonth() - 6)
          prevStartDate.setMonth(now.getMonth() - 12)
          prevEndDate = new Date(startDate.getTime() - 1)
          break
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1)
          prevStartDate.setFullYear(now.getFullYear() - 2)
          prevEndDate = new Date(startDate.getTime() - 1)
          break
      }
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      prevStartDate: prevStartDate.toISOString(),
      prevEndDate: prevEndDate.toISOString()
    }
  }

  const calculateStats = async (startDate: string, endDate: string): Promise<PeriodStats> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ca: 0, transactions: 0, panierMoyen: 0, clients: 0, produits: 0 }

    const { data: userData } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.id)
      .single()

    const storeId = userData?.active_store_id
    if (!storeId) return { ca: 0, transactions: 0, panierMoyen: 0, clients: 0, produits: 0 }

    // Transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('total_amount, customer_id')
      .eq('store_id', storeId)
      .gte('date', startDate)
      .lte('date', endDate)

    const ca = transactions?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0
    const txCount = transactions?.length || 0
    const panierMoyen = txCount > 0 ? ca / txCount : 0
    const uniqueClients = new Set(transactions?.filter(t => t.customer_id).map(t => t.customer_id)).size

    // Produits vendus
    const { data: products } = await supabase
      .from('transaction_products')
      .select('product_id, transactions!inner(store_id, date)')
      .eq('transactions.store_id', storeId)
      .gte('transactions.date', startDate)
      .lte('transactions.date', endDate)

    const uniqueProducts = new Set(products?.map(p => p.product_id)).size

    return {
      ca,
      transactions: txCount,
      panierMoyen,
      clients: uniqueClients,
      produits: uniqueProducts
    }
  }

  const fetchPerformanceData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.id)
      .single()

    const storeId = userData?.active_store_id
    if (!storeId) {
      setLoading(false)
      return
    }

    const { startDate, endDate, prevStartDate, prevEndDate } = getDates()

    // Stats période actuelle
    const current = await calculateStats(startDate, endDate)
    setCurrentStats(current)

    // Stats période précédente (pour comparaison)
    if (compareMode) {
      const previous = await calculateStats(prevStartDate, prevEndDate)
      setPreviousStats(previous)
    }

    // Évolution CA par jour
    const { data: dailyCA } = await supabase
      .from('transactions')
      .select('date, total_amount')
      .eq('store_id', storeId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    const caByDay = dailyCA?.reduce((acc: any, tx) => {
      const date = new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      if (!acc[date]) acc[date] = 0
      acc[date] += tx.total_amount || 0
      return acc
    }, {})

    setCAEvolution(Object.entries(caByDay || {}).map(([date, ca]) => ({ date, ca })))

    // Répartition par type de transaction
    const { data: txTypes } = await supabase
      .from('transactions')
      .select('transaction_type_code, total_amount, transaction_type:transaction_type_code(label)')
      .eq('store_id', storeId)
      .gte('date', startDate)
      .lte('date', endDate)

    const typeStats = txTypes?.reduce((acc: any, tx: any) => {
      const label = tx.transaction_type?.label || 'Autre'
      if (!acc[label]) acc[label] = 0
      acc[label] += tx.total_amount || 0
      return acc
    }, {})

    setTransactionTypes(Object.entries(typeStats || {}).map(([name, value]) => ({ name, value })))

    // Top produits
    const { data: productStats } = await supabase
      .from('transaction_products')
      .select(`
        quantity,
        unit_price,
        product:products(name),
        transactions!inner(store_id, date)
      `)
      .eq('transactions.store_id', storeId)
      .gte('transactions.date', startDate)
      .lte('transactions.date', endDate)

    const productAgg = productStats?.reduce((acc: any, item: any) => {
      const name = item.product?.name || 'Produit inconnu'
      if (!acc[name]) acc[name] = { quantity: 0, revenue: 0 }
      acc[name].quantity += item.quantity || 0
      acc[name].revenue += (item.quantity || 0) * (item.unit_price || 0)
      return acc
    }, {})

    const topProds = Object.entries(productAgg || {})
      .map(([name, stats]: [string, any]) => ({ name, quantity: stats.quantity, revenue: stats.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    setTopProducts(topProds)

    // Affluence par jour de la semaine
    const { data: allTx } = await supabase
      .from('transactions')
      .select('date')
      .eq('store_id', storeId)
      .gte('date', startDate)
      .lte('date', endDate)

    const weekdayStats = allTx?.reduce((acc: any, tx) => {
      const day = new Date(tx.date).toLocaleDateString('fr-FR', { weekday: 'long' })
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {})

    const weekdays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    setWeekdayData(weekdays.map(day => ({ day: day.charAt(0).toUpperCase() + day.slice(1), transactions: weekdayStats?.[day] || 0 })))

    // Évolution clients uniques
    const { data: clientData } = await supabase
      .from('transactions')
      .select('date, customer_id')
      .eq('store_id', storeId)
      .gte('date', startDate)
      .lte('date', endDate)
      .not('customer_id', 'is', null)
      .order('date')

    const clientsByDay = clientData?.reduce((acc: any, tx) => {
      const date = new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      if (!acc[date]) acc[date] = new Set()
      acc[date].add(tx.customer_id)
      return acc
    }, {})

    setClientEvolution(Object.entries(clientsByDay || {}).map(([date, clients]: [string, any]) => ({ date, clients: clients.size })))

    setLoading(false)
  }

  useEffect(() => {
    fetchPerformanceData()
  }, [refreshTrigger, period, compareMode, customStartDate, customEndDate])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const calculateVariation = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Chargement des performances...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Performance</h1>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Sélecteur de période */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="3m">3 derniers mois</option>
              <option value="6m">6 derniers mois</option>
              <option value="1y">1 an</option>
              <option value="custom">Période personnalisée</option>
            </select>

            {/* Dates personnalisées */}
            {period === 'custom' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
            )}

            {/* Mode comparaison */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={compareMode}
                onChange={(e) => setCompareMode(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Comparer période précédente</span>
            </label>
          </div>
        </div>
      </div>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* CA */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Chiffre d'affaires</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(currentStats.ca)}</div>
          {compareMode && previousStats.ca > 0 && (
            <div className={`text-sm mt-2 ${calculateVariation(currentStats.ca, previousStats.ca) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculateVariation(currentStats.ca, previousStats.ca) >= 0 ? '↗' : '↘'} {calculateVariation(currentStats.ca, previousStats.ca).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Transactions</div>
          <div className="text-2xl font-bold text-gray-900">{currentStats.transactions}</div>
          {compareMode && previousStats.transactions > 0 && (
            <div className={`text-sm mt-2 ${calculateVariation(currentStats.transactions, previousStats.transactions) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculateVariation(currentStats.transactions, previousStats.transactions) >= 0 ? '↗' : '↘'} {calculateVariation(currentStats.transactions, previousStats.transactions).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Panier moyen */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Panier moyen</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(currentStats.panierMoyen)}</div>
          {compareMode && previousStats.panierMoyen > 0 && (
            <div className={`text-sm mt-2 ${calculateVariation(currentStats.panierMoyen, previousStats.panierMoyen) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculateVariation(currentStats.panierMoyen, previousStats.panierMoyen) >= 0 ? '↗' : '↘'} {calculateVariation(currentStats.panierMoyen, previousStats.panierMoyen).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Clients */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Clients uniques</div>
          <div className="text-2xl font-bold text-gray-900">{currentStats.clients}</div>
          {compareMode && previousStats.clients > 0 && (
            <div className={`text-sm mt-2 ${calculateVariation(currentStats.clients, previousStats.clients) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculateVariation(currentStats.clients, previousStats.clients) >= 0 ? '↗' : '↘'} {calculateVariation(currentStats.clients, previousStats.clients).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Produits */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Produits vendus</div>
          <div className="text-2xl font-bold text-gray-900">{currentStats.produits}</div>
          {compareMode && previousStats.produits > 0 && (
            <div className={`text-sm mt-2 ${calculateVariation(currentStats.produits, previousStats.produits) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculateVariation(currentStats.produits, previousStats.produits) >= 0 ? '↗' : '↘'} {calculateVariation(currentStats.produits, previousStats.produits).toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution CA */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Évolution du CA</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={caEvolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="ca" stroke="#3b82f6" strokeWidth={2} name="CA" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par type */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Répartition par type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={transactionTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {transactionTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top produits */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Top 10 produits</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="CA" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Affluence par jour */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Affluence par jour</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weekdayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="transactions" fill="#f59e0b" name="Transactions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Évolution clients */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Évolution clients uniques</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={clientEvolution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="clients" stroke="#8b5cf6" strokeWidth={2} name="Clients uniques" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

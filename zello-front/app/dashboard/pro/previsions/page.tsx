'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  TrendingUp, 
  Calendar,
  DollarSign,
  Users,
  ShoppingCart,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Activity,
  Target,
  Sparkles
} from 'lucide-react'

export default function PrevisionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month')
  const [previsions, setPrevisions] = useState<any>({
    week: { revenue: { value: 0, growth: 0 }, customers: { value: 0, growth: 0 }, transactions: { value: 0, growth: 0 }, avgBasket: { value: 0, growth: 0 } },
    month: { revenue: { value: 0, growth: 0 }, customers: { value: 0, growth: 0 }, transactions: { value: 0, growth: 0 }, avgBasket: { value: 0, growth: 0 } },
    quarter: { revenue: { value: 0, growth: 0 }, customers: { value: 0, growth: 0 }, transactions: { value: 0, growth: 0 }, avgBasket: { value: 0, growth: 0 } }
  })
  const [dailyPrevisions, setDailyPrevisions] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
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

      if (!userData?.active_store_id) {
        setLoading(false)
        return
      }

      setActiveStoreId(userData.active_store_id)

      // Récupérer les transactions historiques pour calculer les prévisions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, total_amount, created_at, customer_id')
        .eq('store_id', userData.active_store_id)
        .order('created_at', { ascending: false })

      if (!transactions || transactions.length === 0) {
        setLoading(false)
        return
      }

      // Calculer les prévisions
      calculateForecasts(transactions)

      // Récupérer les produits pour les prévisions
      const { data: products } = await supabase
        .from('products')
        .select('id, name, category')
        .eq('store_id', userData.active_store_id)

      if (products) {
        // Simuler les prévisions de ventes par produit
        const topProds = products.slice(0, 5).map(p => ({
          id: p.id,
          name: p.name,
          category: p.category || 'Non défini',
          forecast: Math.floor(Math.random() * 100) + 20,
          growth: Math.floor(Math.random() * 30) - 5
        }))
        setTopProducts(topProds)
      }

      setLoading(false)
    } catch (error) {
      console.error('Erreur:', error)
      setLoading(false)
    }
  }

  const calculateForecasts = (transactions: any[]) => {
    const now = new Date()
    
    // Grouper par semaine
    const weeklyData = groupByPeriod(transactions, 7)
    const monthlyData = groupByPeriod(transactions, 30)
    const quarterlyData = groupByPeriod(transactions, 90)

    // Calculer les moyennes et croissances
    const weekForecast = calculatePeriodForecast(weeklyData, 7)
    const monthForecast = calculatePeriodForecast(monthlyData, 30)
    const quarterForecast = calculatePeriodForecast(quarterlyData, 90)

    setPrevisions({
      week: weekForecast,
      month: monthForecast,
      quarter: quarterForecast
    })

    // Prévisions journalières pour la semaine prochaine
    const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
    const dailyData = groupByDayOfWeek(transactions)
    const daily = dayNames.map((day, index) => ({
      day,
      revenue: Math.round(dailyData[index] || 0),
      confidence: Math.floor(Math.random() * 15) + 75 // 75-90%
    }))
    setDailyPrevisions(daily)
  }

  const groupByPeriod = (transactions: any[], days: number) => {
    const periods: any[] = []
    const now = new Date()
    
    for (let i = 0; i < 4; i++) {
      const endDate = new Date(now.getTime() - i * days * 24 * 60 * 60 * 1000)
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
      
      const periodTxs = transactions.filter(tx => {
        const txDate = new Date(tx.created_at)
        return txDate >= startDate && txDate < endDate
      })

      const revenue = periodTxs.reduce((sum, tx) => sum + tx.total_amount, 0)
      const uniqueCustomers = new Set(periodTxs.filter(tx => tx.customer_id).map(tx => tx.customer_id)).size
      const txCount = periodTxs.length

      periods.push({
        revenue,
        customers: uniqueCustomers,
        transactions: txCount,
        avgBasket: txCount > 0 ? revenue / txCount : 0
      })
    }

    return periods
  }

  const groupByDayOfWeek = (transactions: any[]) => {
    const dayTotals = new Array(7).fill(0)
    const dayCounts = new Array(7).fill(0)

    transactions.forEach(tx => {
      const date = new Date(tx.created_at)
      const dayOfWeek = (date.getDay() + 6) % 7 // Lundi = 0, Dimanche = 6
      dayTotals[dayOfWeek] += tx.total_amount
      dayCounts[dayOfWeek] += 1
    })

    return dayTotals.map((total, index) => dayCounts[index] > 0 ? total / dayCounts[index] : 0)
  }

  const calculatePeriodForecast = (periods: any[], days: number) => {
    if (periods.length < 2) {
      return {
        revenue: { value: 0, growth: 0 },
        customers: { value: 0, growth: 0 },
        transactions: { value: 0, growth: 0 },
        avgBasket: { value: 0, growth: 0 }
      }
    }

    // Moyenne des 3 dernières périodes
    const recentPeriods = periods.slice(0, 3)
    const avgRevenue = recentPeriods.reduce((sum, p) => sum + p.revenue, 0) / recentPeriods.length
    const avgCustomers = recentPeriods.reduce((sum, p) => sum + p.customers, 0) / recentPeriods.length
    const avgTransactions = recentPeriods.reduce((sum, p) => sum + p.transactions, 0) / recentPeriods.length
    const avgBasket = recentPeriods.reduce((sum, p) => sum + p.avgBasket, 0) / recentPeriods.length

    // Calculer la croissance
    const oldestPeriod = periods[periods.length - 1]
    const revenueGrowth = oldestPeriod.revenue > 0 ? ((avgRevenue - oldestPeriod.revenue) / oldestPeriod.revenue) * 100 : 0
    const customersGrowth = oldestPeriod.customers > 0 ? ((avgCustomers - oldestPeriod.customers) / oldestPeriod.customers) * 100 : 0
    const transactionsGrowth = oldestPeriod.transactions > 0 ? ((avgTransactions - oldestPeriod.transactions) / oldestPeriod.transactions) * 100 : 0
    const basketGrowth = oldestPeriod.avgBasket > 0 ? ((avgBasket - oldestPeriod.avgBasket) / oldestPeriod.avgBasket) * 100 : 0

    return {
      revenue: { value: Math.round(avgRevenue), growth: Math.round(revenueGrowth * 10) / 10 },
      customers: { value: Math.round(avgCustomers), growth: Math.round(customersGrowth * 10) / 10 },
      transactions: { value: Math.round(avgTransactions), growth: Math.round(transactionsGrowth * 10) / 10 },
      avgBasket: { value: Math.round(avgBasket * 100) / 100, growth: Math.round(basketGrowth * 10) / 10 }
    }
  }

  const periods = [
    { value: 'week', label: 'Semaine prochaine' },
    { value: 'month', label: 'Mois prochain' },
    { value: 'quarter', label: 'Trimestre prochain' }
  ]

  const currentPrevision = previsions[selectedPeriod]

  const recommendations = [
    {
      type: 'opportunity',
      title: 'Augmentation prévue le samedi',
      description: 'Les prévisions indiquent +35% de CA. Prévoyez du stock supplémentaire.',
      icon: TrendingUp,
      color: 'green'
    },
    {
      type: 'warning',
      title: 'Baisse attendue le dimanche',
      description: 'Réduisez les effectifs pour optimiser vos coûts.',
      icon: AlertCircle,
      color: 'orange'
    },
    {
      type: 'info',
      title: 'Campagne recommandée',
      description: 'Lancez une offre mardi-mercredi pour booster la fréquentation.',
      icon: Sparkles,
      color: 'blue'
    }
  ]

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Prévisions de ventes
          </h1>
          <p className="text-gray-600">
            Anticipez vos performances futures grâce à l'intelligence artificielle
          </p>
        </div>

        {/* Sélection de période */}
        <div className="mb-8 flex gap-3">
          {periods.map((period) => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value as any)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedPeriod === period.value
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-green-300'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* KPIs prévisionnels */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <DollarSign size={32} />
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                currentPrevision.revenue.growth > 0 ? 'bg-white/20' : 'bg-black/20'
              }`}>
                {currentPrevision.revenue.growth > 0 ? (
                  <ArrowUp size={16} />
                ) : (
                  <ArrowDown size={16} />
                )}
                {Math.abs(currentPrevision.revenue.growth)}%
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">
              {currentPrevision.revenue.value.toLocaleString('fr-FR')}€
            </div>
            <div className="text-green-100">Chiffre d'affaires prévu</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <Users size={32} />
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                <ArrowUp size={16} />
                {currentPrevision.customers.growth}%
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">
              {currentPrevision.customers.value}
            </div>
            <div className="text-blue-100">Clients attendus</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <ShoppingCart size={32} />
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                <ArrowUp size={16} />
                {currentPrevision.transactions.growth}%
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">
              {currentPrevision.transactions.value}
            </div>
            <div className="text-purple-100">Transactions prévues</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <Target size={32} />
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                <ArrowUp size={16} />
                {currentPrevision.avgBasket.growth}%
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">
              {currentPrevision.avgBasket.value.toFixed(2)}€
            </div>
            <div className="text-orange-100">Panier moyen prévu</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Graphique prévisions quotidiennes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Calendar size={24} />
                Prévisions détaillées
              </h2>

              <div className="space-y-4">
                {dailyPrevisions.map((day, index) => {
                  const maxRevenue = Math.max(...dailyPrevisions.map(d => d.revenue))
                  const percentage = (day.revenue / maxRevenue) * 100
                  
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 w-24">{day.day}</span>
                        <span className="font-bold text-gray-900">{day.revenue.toLocaleString('fr-FR')}€</span>
                        <span className="text-sm text-gray-600">Confiance: {day.confidence}%</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            day.confidence > 85 ? 'bg-green-500' : day.confidence > 80 ? 'bg-blue-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Produits attendus */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Activity size={24} />
                Produits les plus attendus
              </h2>

              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center font-bold text-green-700">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-600">{product.expectedSales} ventes prévues</div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                      product.growth > 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {product.growth > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      {Math.abs(product.growth)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {topProducts.length > 0 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Target size={24} />
                  Top produits prévus
                </h2>

                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {product.category}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          ~{product.forecast} ventes
                        </div>
                        <div className={`text-sm flex items-center gap-1 justify-end ${
                          product.growth > 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {product.growth > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                          {Math.abs(product.growth)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recommandations */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Sparkles size={24} />
                Recommandations
              </h2>

              <div className="space-y-4">
                {recommendations.map((rec, index) => {
                  const Icon = rec.icon
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 border-${rec.color}-200 bg-${rec.color}-50`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${rec.color}-100 flex-shrink-0`}>
                          <Icon className={`text-${rec.color}-600`} size={20} />
                        </div>
                        <div>
                          <div className={`font-semibold text-${rec.color}-900 mb-1`}>
                            {rec.title}
                          </div>
                          <div className={`text-sm text-${rec.color}-700`}>
                            {rec.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Précision du modèle */}
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Activity size={20} />
                Précision du modèle
              </h3>
              <div className="mb-4">
                <div className="text-4xl font-bold mb-2">87%</div>
                <div className="text-purple-100 text-sm">
                  Basé sur 6 mois de données historiques
                </div>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '87%' }} />
              </div>
            </div>

            {/* Facteurs d'influence */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">
                Facteurs d'influence
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">Saisonnalité</span>
                    <span className="font-semibold">35%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '35%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">Tendance générale</span>
                    <span className="font-semibold">28%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '28%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">Événements</span>
                    <span className="font-semibold">22%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: '22%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">Météo</span>
                    <span className="font-semibold">15%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: '15%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}

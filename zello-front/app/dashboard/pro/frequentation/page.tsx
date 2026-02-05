'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useStore } from '@/lib/contexts/StoreContext'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'

interface FrequentationStats {
  totalVisites: number
  visitesUniques: number
  tauxConversion: number
  moyenneParJour: number
  picJour: { jour: string; visites: number }
  picHeure: { heure: string; visites: number }
}

export default function FrequentationPage() {
  const { refreshTrigger } = useStore()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d' | '3m' | '6m' | '1y' | 'custom'>('30d')
  const [compareMode, setCompareMode] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const [currentStats, setCurrentStats] = useState<FrequentationStats>({
    totalVisites: 0,
    visitesUniques: 0,
    tauxConversion: 0,
    moyenneParJour: 0,
    picJour: { jour: '', visites: 0 },
    picHeure: { heure: '', visites: 0 }
  })

  const [previousStats, setPreviousStats] = useState<FrequentationStats>({
    totalVisites: 0,
    visitesUniques: 0,
    tauxConversion: 0,
    moyenneParJour: 0,
    picJour: { jour: '', visites: 0 },
    picHeure: { heure: '', visites: 0 }
  })

  // Données graphiques
  const [dailyData, setDailyData] = useState<any[]>([])
  const [hourlyData, setHourlyData] = useState<any[]>([])
  const [weekdayData, setWeekdayData] = useState<any[]>([])
  const [monthDayData, setMonthDayData] = useState<any[]>([])
  const [heatmapData, setHeatmapData] = useState<any[]>([])
  const [trendData, setTrendData] = useState<any[]>([])

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

  const calculateFrequentationStats = async (startDate: string, endDate: string): Promise<FrequentationStats> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return {
      totalVisites: 0,
      visitesUniques: 0,
      tauxConversion: 0,
      moyenneParJour: 0,
      picJour: { jour: '', visites: 0 },
      picHeure: { heure: '', visites: 0 }
    }

    const { data: userData } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.id)
      .single()

    const storeId = userData?.active_store_id
    if (!storeId) return {
      totalVisites: 0,
      visitesUniques: 0,
      tauxConversion: 0,
      moyenneParJour: 0,
      picJour: { jour: '', visites: 0 },
      picHeure: { heure: '', visites: 0 }
    }

    // Total des transactions (proxy pour visites)
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, date, customer_id')
      .eq('store_id', storeId)
      .gte('date', startDate)
      .lte('date', endDate)

    const totalVisites = transactions?.length || 0
    const visitesUniques = new Set(transactions?.filter(t => t.customer_id).map(t => t.customer_id)).size
    const tauxConversion = totalVisites > 0 ? (visitesUniques / totalVisites) * 100 : 0

    // Calculer nombre de jours
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const moyenneParJour = diffDays > 0 ? totalVisites / diffDays : 0

    // Pic par jour de la semaine
    const visitsByWeekday = transactions?.reduce((acc: any, tx) => {
      const day = new Date(tx.date).toLocaleDateString('fr-FR', { weekday: 'long' })
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {})

    const picJour = Object.entries(visitsByWeekday || {})
      .sort(([, a]: any, [, b]: any) => b - a)[0] || ['', 0]

    // Pic par heure
    const visitsByHour = transactions?.reduce((acc: any, tx) => {
      const hour = new Date(tx.date).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {})

    const picHeure = Object.entries(visitsByHour || {})
      .sort(([, a]: any, [, b]: any) => b - a)[0] || ['', 0]

    return {
      totalVisites,
      visitesUniques,
      tauxConversion,
      moyenneParJour,
      picJour: { jour: picJour[0] as string, visites: picJour[1] as number },
      picHeure: { heure: `${picHeure[0]}h`, visites: picHeure[1] as number }
    }
  }

  const fetchFrequentationData = async () => {
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
    const current = await calculateFrequentationStats(startDate, endDate)
    setCurrentStats(current)

    // Stats période précédente
    if (compareMode) {
      const previous = await calculateFrequentationStats(prevStartDate, prevEndDate)
      setPreviousStats(previous)
    }

    // Récupérer toutes les transactions pour analyses
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, date, customer_id')
      .eq('store_id', storeId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    if (!transactions) {
      setLoading(false)
      return
    }

    // Fréquentation par jour
    const visitsByDay = transactions.reduce((acc: any, tx) => {
      const date = new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      if (!acc[date]) acc[date] = { total: 0, uniques: new Set() }
      acc[date].total += 1
      if (tx.customer_id) acc[date].uniques.add(tx.customer_id)
      return acc
    }, {})

    const dailyDataFormatted = Object.entries(visitsByDay).map(([date, data]: [string, any]) => ({
      date,
      visites: data.total,
      uniques: data.uniques.size
    }))
    setDailyData(dailyDataFormatted)

    // Fréquentation par heure
    const visitsByHour = transactions.reduce((acc: any, tx) => {
      const hour = new Date(tx.date).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {})

    const hourlyDataFormatted = Array.from({ length: 24 }, (_, i) => ({
      heure: `${i}h`,
      visites: visitsByHour[i] || 0
    }))
    setHourlyData(hourlyDataFormatted)

    // Fréquentation par jour de la semaine
    const weekdays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    const visitsByWeekday = transactions.reduce((acc: any, tx) => {
      const day = new Date(tx.date).toLocaleDateString('fr-FR', { weekday: 'long' })
      if (!acc[day]) acc[day] = { total: 0, uniques: new Set() }
      acc[day].total += 1
      if (tx.customer_id) acc[day].uniques.add(tx.customer_id)
      return acc
    }, {})

    const weekdayDataFormatted = weekdays.map(day => ({
      jour: day.charAt(0).toUpperCase() + day.slice(1),
      visites: visitsByWeekday[day]?.total || 0,
      uniques: visitsByWeekday[day]?.uniques.size || 0
    }))
    setWeekdayData(weekdayDataFormatted)

    // Fréquentation par jour du mois (1-31)
    const visitsByMonthDay = transactions.reduce((acc: any, tx) => {
      const day = new Date(tx.date).getDate()
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {})

    const monthDayDataFormatted = Array.from({ length: 31 }, (_, i) => ({
      jour: i + 1,
      visites: visitsByMonthDay[i + 1] || 0
    }))
    setMonthDayData(monthDayDataFormatted)

    // Heatmap jour/heure
    const heatmap = transactions.reduce((acc: any, tx) => {
      const date = new Date(tx.date)
      const day = date.toLocaleDateString('fr-FR', { weekday: 'short' })
      const hour = date.getHours()
      const key = `${day}-${hour}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const heatmapFormatted = Object.entries(heatmap).map(([key, count]) => {
      const [day, hour] = key.split('-')
      return { day, hour: `${hour}h`, count }
    })
    setHeatmapData(heatmapFormatted)

    // Tendance (moyenne mobile sur 7 jours)
    const sortedDailyData = dailyDataFormatted.sort((a, b) => {
      const [dayA, monthA] = a.date.split('/')
      const [dayB, monthB] = b.date.split('/')
      return new Date(`2024-${monthA}-${dayA}`).getTime() - new Date(`2024-${monthB}-${dayB}`).getTime()
    })

    const trendDataFormatted = sortedDailyData.map((item, index) => {
      const start = Math.max(0, index - 3)
      const end = Math.min(sortedDailyData.length, index + 4)
      const slice = sortedDailyData.slice(start, end)
      const avg = slice.reduce((sum, d) => sum + d.visites, 0) / slice.length
      return {
        date: item.date,
        visites: item.visites,
        tendance: Math.round(avg)
      }
    })
    setTrendData(trendDataFormatted)

    setLoading(false)
  }

  useEffect(() => {
    fetchFrequentationData()
  }, [refreshTrigger, period, compareMode, customStartDate, customEndDate])

  const calculateVariation = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const getColorByIntensity = (value: number, max: number) => {
    const intensity = value / max
    if (intensity > 0.8) return '#ef4444' // Rouge foncé
    if (intensity > 0.6) return '#f59e0b' // Orange
    if (intensity > 0.4) return '#fbbf24' // Jaune
    if (intensity > 0.2) return '#84cc16' // Vert clair
    return '#d1d5db' // Gris
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Chargement de la fréquentation...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Fréquentation</h1>
          
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {/* Total visites */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Total visites</div>
          <div className="text-2xl font-bold text-gray-900">{currentStats.totalVisites}</div>
          {compareMode && previousStats.totalVisites > 0 && (
            <div className={`text-sm mt-2 ${calculateVariation(currentStats.totalVisites, previousStats.totalVisites) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculateVariation(currentStats.totalVisites, previousStats.totalVisites) >= 0 ? '↗' : '↘'} {calculateVariation(currentStats.totalVisites, previousStats.totalVisites).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Visites uniques */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Clients uniques</div>
          <div className="text-2xl font-bold text-gray-900">{currentStats.visitesUniques}</div>
          {compareMode && previousStats.visitesUniques > 0 && (
            <div className={`text-sm mt-2 ${calculateVariation(currentStats.visitesUniques, previousStats.visitesUniques) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculateVariation(currentStats.visitesUniques, previousStats.visitesUniques) >= 0 ? '↗' : '↘'} {calculateVariation(currentStats.visitesUniques, previousStats.visitesUniques).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Taux conversion */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Taux fidélisation</div>
          <div className="text-2xl font-bold text-gray-900">{currentStats.tauxConversion.toFixed(1)}%</div>
          {compareMode && previousStats.tauxConversion > 0 && (
            <div className={`text-sm mt-2 ${calculateVariation(currentStats.tauxConversion, previousStats.tauxConversion) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculateVariation(currentStats.tauxConversion, previousStats.tauxConversion) >= 0 ? '↗' : '↘'} {calculateVariation(currentStats.tauxConversion, previousStats.tauxConversion).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Moyenne par jour */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Moyenne / jour</div>
          <div className="text-2xl font-bold text-gray-900">{currentStats.moyenneParJour.toFixed(1)}</div>
          {compareMode && previousStats.moyenneParJour > 0 && (
            <div className={`text-sm mt-2 ${calculateVariation(currentStats.moyenneParJour, previousStats.moyenneParJour) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {calculateVariation(currentStats.moyenneParJour, previousStats.moyenneParJour) >= 0 ? '↗' : '↘'} {calculateVariation(currentStats.moyenneParJour, previousStats.moyenneParJour).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Pic jour */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Jour le plus fréquenté</div>
          <div className="text-lg font-bold text-gray-900 capitalize">{currentStats.picJour.jour}</div>
          <div className="text-sm text-gray-600 mt-1">{currentStats.picJour.visites} visites</div>
        </div>

        {/* Pic heure */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Heure de pointe</div>
          <div className="text-lg font-bold text-gray-900">{currentStats.picHeure.heure}</div>
          <div className="text-sm text-gray-600 mt-1">{currentStats.picHeure.visites} visites</div>
        </div>
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution quotidienne */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Évolution quotidienne</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="visites" stroke="#3b82f6" strokeWidth={2} name="Total visites" />
              <Line type="monotone" dataKey="uniques" stroke="#10b981" strokeWidth={2} name="Clients uniques" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Fréquentation par heure */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Fréquentation par heure</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="heure" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visites" name="Visites">
                {hourlyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColorByIntensity(entry.visites, Math.max(...hourlyData.map(d => d.visites)))} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fréquentation par jour de la semaine */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Fréquentation par jour de la semaine</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weekdayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="jour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visites" fill="#f59e0b" name="Total visites" />
              <Bar dataKey="uniques" fill="#8b5cf6" name="Clients uniques" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tendance avec moyenne mobile */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Tendance (moyenne mobile 7j)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="visites" stroke="#d1d5db" strokeWidth={1} name="Visites" dot={false} />
              <Line type="monotone" dataKey="tendance" stroke="#ef4444" strokeWidth={3} name="Tendance" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fréquentation par jour du mois */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Fréquentation par jour du mois</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthDayData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="jour" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="visites" fill="#06b6d4" name="Visites" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insights et recommandations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">📊 Meilleur moment</h3>
          <p className="text-blue-800">
            Le <span className="font-bold capitalize">{currentStats.picJour.jour}</span> à <span className="font-bold">{currentStats.picHeure.heure}</span> est votre pic d'affluence.
            Optimisez votre personnel et vos stocks pour ce créneau.
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">🎯 Fidélisation</h3>
          <p className="text-green-800">
            Taux de fidélisation de <span className="font-bold">{currentStats.tauxConversion.toFixed(1)}%</span>.
            {currentStats.tauxConversion < 30 ? ' Pensez à un programme de fidélité.' : ' Excellent taux de fidélisation !'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">📈 Tendance</h3>
          <p className="text-purple-800">
            Moyenne de <span className="font-bold">{currentStats.moyenneParJour.toFixed(1)} visites/jour</span>.
            {compareMode && calculateVariation(currentStats.totalVisites, previousStats.totalVisites) > 0 
              ? ' Croissance positive par rapport à la période précédente !' 
              : compareMode ? ' En baisse par rapport à la période précédente.' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

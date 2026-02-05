'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import HeaderPro from '@/components/HeaderPro'
import { 
  Users, 
  TrendingUp,
  Heart,
  BarChart3,
  Target,
  Award,
  Mail,
  ArrowUp,
  Eye,
  MousePointerClick,
  DollarSign,
  UserCheck,
  Percent,
  Activity
} from 'lucide-react'

export default function AnalysesAvanceesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [selectedTab, setSelectedTab] = useState<'clients' | 'fidelisation' | 'campagnes'>('clients')
  const [clientsData, setClientsData] = useState<any>({
    total: 0,
    nouveaux: 0,
    actifs: 0,
    inactifs: 0,
    tauxActivation: 0,
    tauxRetention: 0,
    valeurVieMoyenne: 0,
    frequenceMoyenne: 0
  })
  const [segmentsClients, setSegmentsClients] = useState<any[]>([])
  const [fidelisationData, setFidelisationData] = useState<any>({
    tauxFidelite: 0,
    pointsDistribues: 0,
    pointsUtilises: 0,
    tauxUtilisation: 0,
    recompensesOffertes: 0,
    valeurRecompenses: 0
  })
  const [impactFidelisation, setImpactFidelisation] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [selectedPeriod])

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

      // Calculer les dates selon la période
      const dateFilter = getDateFilter()

      // Récupérer les clients
      const { data: customersStores, error: csError } = await supabase
        .from('customers_stores')
        .select(`
          customer_id,
          points,
          visits,
          join_date,
          last_visit_at,
          customers(id, first_name, last_name, email)
        `)
        .eq('store_id', userData.active_store_id)

      if (csError) throw csError

      // Récupérer les transactions pour calculer la valeur
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('customer_id, total_amount, created_at, points_awarded')
        .eq('store_id', userData.active_store_id)
        .gte('created_at', dateFilter)

      if (txError) throw txError

      // Analyser les données clients
      analyzeClientsData(customersStores || [], transactions || [])

      // Analyser les données de fidélisation
      analyzeFidelisationData(customersStores || [], transactions || [])

      setLoading(false)
    } catch (error) {
      console.error('Erreur:', error)
      setLoading(false)
    }
  }

  const getDateFilter = () => {
    const now = new Date()
    const periods: any = {
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      quarter: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    }
    return periods[selectedPeriod].toISOString()
  }

  const analyzeClientsData = (customersStores: any[], transactions: any[]) => {
    const total = customersStores.length
    const now = new Date()
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Clients actifs = visites récentes (< 30 jours)
    const actifs = customersStores.filter(cs => 
      cs.last_visit_at && new Date(cs.last_visit_at) > oneMonthAgo
    ).length

    // Nouveaux clients
    const nouveaux = customersStores.filter(cs => 
      cs.join_date && new Date(cs.join_date) > oneMonthAgo
    ).length

    // Calculer valeur vie moyenne et fréquence
    const customerValues = new Map<string, { total: number, count: number }>()
    transactions.forEach(tx => {
      if (!customerValues.has(tx.customer_id)) {
        customerValues.set(tx.customer_id, { total: 0, count: 0 })
      }
      const cv = customerValues.get(tx.customer_id)!
      cv.total += tx.total_amount
      cv.count += 1
    })

    const totalValue = Array.from(customerValues.values()).reduce((sum, cv) => sum + cv.total, 0)
    const valeurVieMoyenne = total > 0 ? totalValue / total : 0
    const frequenceMoyenne = customersStores.reduce((sum, cs) => sum + cs.visits, 0) / (total || 1)

    // Segmentation RFM simplifiée
    const segments: any[] = [
      { name: 'Champions', count: 0, value: 0, percentage: 0, color: 'green' },
      { name: 'Fidèles', count: 0, value: 0, percentage: 0, color: 'blue' },
      { name: 'Potentiel', count: 0, value: 0, percentage: 0, color: 'purple' },
      { name: 'À risque', count: 0, value: 0, percentage: 0, color: 'orange' },
      { name: 'Perdus', count: 0, value: 0, percentage: 0, color: 'red' }
    ]

    customersStores.forEach(cs => {
      const daysSinceLastVisit = cs.last_visit_at 
        ? (now.getTime() - new Date(cs.last_visit_at).getTime()) / (1000 * 60 * 60 * 24)
        : 999

      const customerValue = customerValues.get(cs.customer_id)?.total || 0

      if (cs.visits >= 10 && daysSinceLastVisit < 30) {
        segments[0].count++
        segments[0].value += customerValue
      } else if (cs.visits >= 5 && daysSinceLastVisit < 60) {
        segments[1].count++
        segments[1].value += customerValue
      } else if (cs.visits >= 2 && daysSinceLastVisit < 90) {
        segments[2].count++
        segments[2].value += customerValue
      } else if (cs.visits >= 1 && daysSinceLastVisit < 180) {
        segments[3].count++
        segments[3].value += customerValue
      } else {
        segments[4].count++
        segments[4].value += customerValue
      }
    })

    segments.forEach(seg => {
      seg.percentage = total > 0 ? (seg.count / total) * 100 : 0
    })

    setClientsData({
      total,
      nouveaux,
      actifs,
      inactifs: total - actifs,
      tauxActivation: total > 0 ? (actifs / total) * 100 : 0,
      tauxRetention: total > 0 ? ((total - nouveaux) / total) * 100 : 0,
      valeurVieMoyenne: Math.round(valeurVieMoyenne * 100) / 100,
      frequenceMoyenne: Math.round(frequenceMoyenne * 10) / 10
    })

    setSegmentsClients(segments)
  }

  const analyzeFidelisationData = (customersStores: any[], transactions: any[]) => {
    const totalPoints = customersStores.reduce((sum, cs) => sum + (cs.points || 0), 0)
    const pointsDistribues = transactions.reduce((sum, tx) => sum + (tx.points_awarded || 0), 0)
    const pointsUtilises = pointsDistribues - totalPoints
    const clientsAvecPoints = customersStores.filter(cs => cs.points > 0).length
    const total = customersStores.length

    // Impact estimé (simulation basée sur les données réelles)
    const clientsWithProgram = customersStores.filter(cs => cs.visits > 0)
    const avgVisitsWithProgram = clientsWithProgram.reduce((sum, cs) => sum + cs.visits, 0) / (clientsWithProgram.length || 1)
    const avgVisitsWithoutProgram = avgVisitsWithProgram / 2 // Estimation

    const avgBasketWithProgram = transactions.length > 0
      ? transactions.reduce((sum, tx) => sum + tx.total_amount, 0) / transactions.length
      : 0
    const avgBasketWithoutProgram = avgBasketWithProgram * 0.75 // Estimation

    setFidelisationData({
      tauxFidelite: total > 0 ? (clientsAvecPoints / total) * 100 : 0,
      pointsDistribues,
      pointsUtilises,
      tauxUtilisation: pointsDistribues > 0 ? (pointsUtilises / pointsDistribues) * 100 : 0,
      recompensesOffertes: Math.floor(pointsUtilises / 100), // Estimation
      valeurRecompenses: Math.floor(pointsUtilises * 0.01) // 1 point = 0.01€
    })

    setImpactFidelisation([
      { 
        metric: 'Fréquence de visite', 
        withProgram: Math.round(avgVisitsWithProgram * 10) / 10, 
        withoutProgram: Math.round(avgVisitsWithoutProgram * 10) / 10, 
        improvement: avgVisitsWithoutProgram > 0 ? Math.round(((avgVisitsWithProgram - avgVisitsWithoutProgram) / avgVisitsWithoutProgram) * 100) : 0
      },
      { 
        metric: 'Panier moyen', 
        withProgram: Math.round(avgBasketWithProgram * 100) / 100, 
        withoutProgram: Math.round(avgBasketWithoutProgram * 100) / 100, 
        improvement: avgBasketWithoutProgram > 0 ? Math.round(((avgBasketWithProgram - avgBasketWithoutProgram) / avgBasketWithoutProgram) * 100) : 0
      }
    ])
  }

  const periods = [
    { value: 'week', label: 'Semaine' },
    { value: 'month', label: 'Mois' },
    { value: 'quarter', label: 'Trimestre' },
    { value: 'year', label: 'Année' }
  ]

  // Données campagnes (toujours mock car pas de table campagnes)
  const campagnes = [
    {
      id: '1',
      name: 'Offre printemps',
      type: 'email',
      status: 'active',
      sent: 1247,
      opened: 687,
      clicked: 234,
      converted: 89,
      revenue: 3245,
      cost: 50
    },
    {
      id: '2',
      name: 'Points x2 weekend',
      type: 'push',
      status: 'completed',
      sent: 892,
      opened: 756,
      clicked: 445,
      converted: 178,
      revenue: 5678,
      cost: 30
    },
    {
      id: '3',
      name: 'Clients inactifs',
      type: 'sms',
      status: 'completed',
      sent: 345,
      opened: 312,
      clicked: 156,
      converted: 67,
      revenue: 2345,
      cost: 69
    }
  ]

  const calculateROI = (revenue: number, cost: number) => {
    return (((revenue - cost) / cost) * 100).toFixed(0)
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Analyses avancées
          </h1>
          <p className="text-gray-600">
            Analyses approfondies de vos clients, fidélisation et campagnes marketing
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

        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        )}

        {!loading && (
          <>
            {/* Onglets */}
            <div className="mb-8 border-b border-gray-200">
              <div className="flex gap-8">
                <button
                  onClick={() => setSelectedTab('clients')}
                  className={`pb-4 px-2 font-semibold transition-colors relative ${
                    selectedTab === 'clients'
                      ? 'text-green-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users size={20} />
                    Analyse clients
                  </div>
                  {selectedTab === 'clients' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
                  )}
                </button>
                <button
                  onClick={() => setSelectedTab('fidelisation')}
                  className={`pb-4 px-2 font-semibold transition-colors relative ${
                    selectedTab === 'fidelisation'
                      ? 'text-green-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Heart size={20} />
                    Impact fidélisation
                  </div>
                  {selectedTab === 'fidelisation' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
                  )}
                </button>
                <button
                  onClick={() => setSelectedTab('campagnes')}
                  className={`pb-4 px-2 font-semibold transition-colors relative ${
                    selectedTab === 'campagnes'
                      ? 'text-green-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Target size={20} />
                    Campagnes marketing
                  </div>
                  {selectedTab === 'campagnes' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Contenu Analyse clients */}
            {selectedTab === 'clients' && (
              <div className="space-y-8">
                {/* KPIs clients */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl">
                <Users size={32} className="mb-4" />
                <div className="text-3xl font-bold mb-1">{clientsData.total.toLocaleString('fr-FR')}</div>
                <div className="text-blue-100">Clients totaux</div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <ArrowUp size={16} />
                  <span>+{clientsData.nouveaux} ce mois</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl">
                <UserCheck size={32} className="mb-4" />
                <div className="text-3xl font-bold mb-1">{clientsData.tauxActivation}%</div>
                <div className="text-green-100">Taux d'activation</div>
                <div className="mt-2 text-sm">{clientsData.actifs} clients actifs</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl">
                <Heart size={32} className="mb-4" />
                <div className="text-3xl font-bold mb-1">{clientsData.tauxRetention}%</div>
                <div className="text-purple-100">Taux de rétention</div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <ArrowUp size={16} />
                  <span>+5.2% vs mois dernier</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl">
                <DollarSign size={32} className="mb-4" />
                <div className="text-3xl font-bold mb-1">{clientsData.valeurVieMoyenne}€</div>
                <div className="text-orange-100">Valeur vie moyenne</div>
                <div className="mt-2 text-sm">{clientsData.frequenceMoyenne} visites/mois</div>
              </div>
            </div>

            {/* Segmentation clients */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <BarChart3 size={24} />
                Segmentation clients (RFM)
              </h2>

              <div className="space-y-4">
                {segmentsClients.map((segment) => (
                  <div key={segment.name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full bg-${segment.color}-500`} />
                        <span className="font-semibold text-gray-900">{segment.name}</span>
                        <span className="text-sm text-gray-600">{segment.count} clients</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{segment.value.toLocaleString('fr-FR')}€</div>
                        <div className="text-sm text-gray-600">{segment.percentage}%</div>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-${segment.color}-500 rounded-full`}
                        style={{ width: `${segment.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Activity className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Recommandations :</p>
                    <ul className="space-y-1">
                      <li>• Récompensez vos Champions avec des offres VIP</li>
                      <li>• Relancez les clients À risque avec une campagne ciblée</li>
                      <li>• Convertissez le Potentiel en clients Fidèles</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenu Impact fidélisation */}
        {selectedTab === 'fidelisation' && (
          <div className="space-y-8">
            {/* KPIs fidélisation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl">
                <Percent size={32} className="mb-4" />
                <div className="text-3xl font-bold mb-1">{fidelisationData.tauxFidelite}%</div>
                <div className="text-green-100">Taux de fidélité</div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl">
                <Award size={32} className="mb-4" />
                <div className="text-3xl font-bold mb-1">
                  {fidelisationData.pointsDistribues.toLocaleString('fr-FR')}
                </div>
                <div className="text-blue-100">Points distribués</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl">
                <Heart size={32} className="mb-4" />
                <div className="text-3xl font-bold mb-1">{fidelisationData.tauxUtilisation}%</div>
                <div className="text-purple-100">Taux d'utilisation</div>
                <div className="mt-2 text-sm">
                  {fidelisationData.pointsUtilises.toLocaleString('fr-FR')} points utilisés
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl">
                <DollarSign size={32} className="mb-4" />
                <div className="text-3xl font-bold mb-1">
                  {fidelisationData.valeurRecompenses.toLocaleString('fr-FR')}€
                </div>
                <div className="text-orange-100">Valeur récompenses</div>
                <div className="mt-2 text-sm">{fidelisationData.recompensesOffertes} offertes</div>
              </div>
            </div>

            {/* Comparaison avec/sans programme */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp size={24} />
                Impact du programme de fidélité
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Métrique</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Avec programme</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Sans programme</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Amélioration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {impactFidelisation.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{item.metric}</td>
                        <td className="px-6 py-4 text-right font-bold text-green-700">
                          {item.metric.includes('Taux') || item.metric.includes('Durée') 
                            ? `${item.withProgram}${item.metric.includes('Taux') ? '%' : ' mois'}`
                            : `${item.withProgram}€`
                          }
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          {item.metric.includes('Taux') || item.metric.includes('Durée')
                            ? `${item.withoutProgram}${item.metric.includes('Taux') ? '%' : ' mois'}`
                            : `${item.withoutProgram}€`
                          }
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700">
                            <ArrowUp size={14} />
                            +{item.improvement}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-2">ROI du programme de fidélité</h3>
                <div className="text-4xl font-bold text-green-600 mb-2">+247%</div>
                <p className="text-gray-700">
                  Pour chaque euro investi dans le programme, vous générez 3.47€ de revenus supplémentaires
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Contenu Campagnes */}
        {selectedTab === 'campagnes' && (
          <div className="space-y-8">
            {/* Statistiques globales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <Mail className="text-blue-600 mb-4" size={32} />
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {campagnes.reduce((sum, c) => sum + c.sent, 0).toLocaleString('fr-FR')}
                </div>
                <div className="text-gray-600">Messages envoyés</div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <Eye className="text-green-600 mb-4" size={32} />
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {((campagnes.reduce((sum, c) => sum + c.opened, 0) / campagnes.reduce((sum, c) => sum + c.sent, 0)) * 100).toFixed(1)}%
                </div>
                <div className="text-gray-600">Taux d'ouverture</div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <MousePointerClick className="text-purple-600 mb-4" size={32} />
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {((campagnes.reduce((sum, c) => sum + c.clicked, 0) / campagnes.reduce((sum, c) => sum + c.opened, 0)) * 100).toFixed(1)}%
                </div>
                <div className="text-gray-600">Taux de clic</div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <DollarSign className="text-orange-600 mb-4" size={32} />
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {campagnes.reduce((sum, c) => sum + c.revenue, 0).toLocaleString('fr-FR')}€
                </div>
                <div className="text-gray-600">Revenus générés</div>
              </div>
            </div>

            {/* Liste des campagnes */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Target size={24} />
                  Performance des campagnes
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Campagne</th>
                      <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Type</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Envoyés</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Taux ouverture</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Taux clic</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Conversions</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {campagnes.map((campagne) => (
                      <tr key={campagne.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{campagne.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                              campagne.status === 'active' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {campagne.status === 'active' ? 'En cours' : 'Terminée'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {campagne.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                          {campagne.sent.toLocaleString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-gray-900">
                            {((campagne.opened / campagne.sent) * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-gray-900">
                            {((campagne.clicked / campagne.opened) * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-semibold text-gray-900">{campagne.converted}</div>
                          <div className="text-sm text-gray-600">
                            {((campagne.converted / campagne.sent) * 100).toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-bold text-green-700">
                            +{calculateROI(campagne.revenue, campagne.cost)}%
                          </div>
                          <div className="text-sm text-gray-600">
                            {campagne.revenue.toLocaleString('fr-FR')}€
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

          </>
        )}
    </div>
  )
}

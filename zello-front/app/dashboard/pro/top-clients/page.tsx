'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface ClientStat {
  id: string
  customerId: string
  firstName: string
  lastName: string
  email: string
  totalCA: number
  totalTransactions: number
  panierMoyen: number
  lastVisit: string
  daysSinceLastVisit: number
  segment: 'VIP' | 'Fidèle' | 'Régulier' | 'Occasionnel' | 'Inactif'
}

export default function TopClientsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<ClientStat[]>([])
  const [filteredClients, setFilteredClients] = useState<ClientStat[]>([])
  const [period, setPeriod] = useState<'7d' | '30d' | '3m' | '6m' | '1y' | 'all'>('all')
  const [sortBy, setSortBy] = useState<'ca' | 'transactions' | 'panier' | 'recence'>('ca')
  const [segmentFilter, setSegmentFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [displayCount, setDisplayCount] = useState(20)

  // Stats globales
  const [totalClients, setTotalClients] = useState(0)
  const [avgCA, setAvgCA] = useState(0)
  const [avgTransactions, setAvgTransactions] = useState(0)
  const [avgPanier, setAvgPanier] = useState(0)

  // Données graphiques
  const [segmentData, setSegmentData] = useState<any[]>([])
  const [top10Data, setTop10Data] = useState<any[]>([])
  const [distributionData, setDistributionData] = useState<any[]>([])

  const SEGMENT_COLORS = {
    'VIP': '#ef4444',
    'Fidèle': '#f59e0b',
    'Régulier': '#10b981',
    'Occasionnel': '#3b82f6',
    'Inactif': '#6b7280'
  }

  const getSegment = (totalCA: number, transactions: number, daysSinceLastVisit: number): ClientStat['segment'] => {
    // VIP : CA > 1000€ ET plus de 10 transactions
    if (totalCA > 1000 && transactions > 10) return 'VIP'
    
    // Fidèle : Plus de 5 transactions ET dernière visite < 30 jours
    if (transactions > 5 && daysSinceLastVisit < 30) return 'Fidèle'
    
    // Régulier : Plus de 3 transactions ET dernière visite < 60 jours
    if (transactions > 3 && daysSinceLastVisit < 60) return 'Régulier'
    
    // Inactif : Dernière visite > 90 jours
    if (daysSinceLastVisit > 90) return 'Inactif'
    
    // Occasionnel : le reste
    return 'Occasionnel'
  }

  const getDates = () => {
    const now = new Date()
    let startDate = new Date()

    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '3m':
        startDate.setMonth(now.getMonth() - 3)
        break
      case '6m':
        startDate.setMonth(now.getMonth() - 6)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case 'all':
        startDate = new Date('2000-01-01')
        break
    }

    return startDate.toISOString()
  }

  const fetchClientsData = async () => {
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

    const startDate = getDates()

    // Récupérer toutes les transactions avec clients
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        id,
        date,
        total_amount,
        customer_id,
        customer:customers (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('store_id', storeId)
      .gte('date', startDate)
      .not('customer_id', 'is', null)

    if (!transactions) {
      setLoading(false)
      return
    }

    // Agréger par client
    const clientsMap = new Map<string, ClientStat>()
    const now = new Date()

    transactions.forEach((tx: any) => {
      const customerId = tx.customer_id
      if (!customerId || !tx.customer) return

      if (!clientsMap.has(customerId)) {
        clientsMap.set(customerId, {
          id: customerId,
          customerId: customerId,
          firstName: tx.customer.first_name || '',
          lastName: tx.customer.last_name || '',
          email: tx.customer.email || '',
          totalCA: 0,
          totalTransactions: 0,
          panierMoyen: 0,
          lastVisit: tx.date,
          daysSinceLastVisit: 0,
          segment: 'Occasionnel'
        })
      }

      const client = clientsMap.get(customerId)!
      client.totalCA += tx.total_amount || 0
      client.totalTransactions += 1
      
      // Mettre à jour la dernière visite
      if (new Date(tx.date) > new Date(client.lastVisit)) {
        client.lastVisit = tx.date
      }
    })

    // Finaliser les calculs
    const clientsList = Array.from(clientsMap.values()).map(client => {
      client.panierMoyen = client.totalCA / client.totalTransactions
      client.daysSinceLastVisit = Math.floor((now.getTime() - new Date(client.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
      client.segment = getSegment(client.totalCA, client.totalTransactions, client.daysSinceLastVisit)
      return client
    })

    setClients(clientsList)
    setFilteredClients(clientsList)
    setTotalClients(clientsList.length)

    // Calculer stats globales
    const totalCA = clientsList.reduce((sum, c) => sum + c.totalCA, 0)
    const totalTx = clientsList.reduce((sum, c) => sum + c.totalTransactions, 0)
    setAvgCA(totalCA / clientsList.length || 0)
    setAvgTransactions(totalTx / clientsList.length || 0)
    setAvgPanier(totalCA / totalTx || 0)

    // Répartition par segment
    const segmentCounts = clientsList.reduce((acc: any, c) => {
      acc[c.segment] = (acc[c.segment] || 0) + 1
      return acc
    }, {})

    setSegmentData(Object.entries(segmentCounts).map(([name, value]) => ({ name, value })))

    // Distribution CA par tranche
    const tranches = [
      { label: '0-50€', min: 0, max: 50, count: 0 },
      { label: '50-100€', min: 50, max: 100, count: 0 },
      { label: '100-250€', min: 100, max: 250, count: 0 },
      { label: '250-500€', min: 250, max: 500, count: 0 },
      { label: '500-1000€', min: 500, max: 1000, count: 0 },
      { label: '+1000€', min: 1000, max: Infinity, count: 0 }
    ]

    clientsList.forEach(c => {
      const tranche = tranches.find(t => c.totalCA >= t.min && c.totalCA < t.max)
      if (tranche) tranche.count++
    })

    setDistributionData(tranches.map(t => ({ tranche: t.label, clients: t.count })))

    setLoading(false)
  }

  useEffect(() => {
    fetchClientsData()
  }, [period])

  useEffect(() => {
    // Filtrer et trier
    let filtered = [...clients]

    // Filtre par segment
    if (segmentFilter !== 'all') {
      filtered = filtered.filter(c => c.segment === segmentFilter)
    }

    // Filtre par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c => 
        c.firstName.toLowerCase().includes(term) ||
        c.lastName.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)
      )
    }

    // Trier
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'ca':
          return b.totalCA - a.totalCA
        case 'transactions':
          return b.totalTransactions - a.totalTransactions
        case 'panier':
          return b.panierMoyen - a.panierMoyen
        case 'recence':
          return a.daysSinceLastVisit - b.daysSinceLastVisit
        default:
          return 0
      }
    })

    setFilteredClients(filtered)

    // Top 10 pour graphique
    setTop10Data(filtered.slice(0, 10).map(c => ({
      name: `${c.firstName} ${c.lastName}`,
      ca: c.totalCA,
      transactions: c.totalTransactions
    })))
  }, [clients, sortBy, segmentFilter, searchTerm])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Chargement des clients...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-800">Top Clients</h1>
      </div>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Total clients</div>
          <div className="text-2xl font-bold text-gray-900">{totalClients}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">CA moyen / client</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(avgCA)}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Transactions moy. / client</div>
          <div className="text-2xl font-bold text-gray-900">{avgTransactions.toFixed(1)}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Panier moyen</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(avgPanier)}</div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par segment */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Répartition par segment</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={segmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {segmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[entry.name as keyof typeof SEGMENT_COLORS]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Légende segments */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: SEGMENT_COLORS.VIP }}></div>
              <span>VIP : CA &gt; 1000€ + 10 tx</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: SEGMENT_COLORS.Fidèle }}></div>
              <span>Fidèle : 5 tx + actif</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: SEGMENT_COLORS.Régulier }}></div>
              <span>Régulier : 3 tx + récent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: SEGMENT_COLORS.Occasionnel }}></div>
              <span>Occasionnel : Autres</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: SEGMENT_COLORS.Inactif }}></div>
              <span>Inactif : &gt; 90j</span>
            </div>
          </div>
        </div>

        {/* Top 10 clients */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Top 10 clients (CA)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10Data} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="ca" fill="#10b981" name="CA" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution CA */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Distribution CA par tranche</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={distributionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tranche" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="clients" fill="#3b82f6" name="Nombre de clients" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filtres et tableau */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h2 className="text-xl font-semibold text-gray-800">Liste des clients</h2>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Recherche */}
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {/* Filtre période */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="3m">3 derniers mois</option>
              <option value="6m">6 derniers mois</option>
              <option value="1y">1 an</option>
              <option value="all">Depuis toujours</option>
            </select>

            {/* Filtre segment */}
            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les segments</option>
              <option value="VIP">VIP</option>
              <option value="Fidèle">Fidèle</option>
              <option value="Régulier">Régulier</option>
              <option value="Occasionnel">Occasionnel</option>
              <option value="Inactif">Inactif</option>
            </select>

            {/* Tri */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="ca">Trier par CA</option>
              <option value="transactions">Trier par transactions</option>
              <option value="panier">Trier par panier moyen</option>
              <option value="recence">Trier par récence</option>
            </select>
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Rang</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Client</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Segment</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">CA Total</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Transactions</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Panier Moyen</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Dernière visite</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.slice(0, displayCount).map((client, index) => (
                <tr key={client.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`font-bold ${index < 3 ? 'text-yellow-600' : 'text-gray-600'}`}>
                      #{index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {client.firstName} {client.lastName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{client.email}</td>
                  <td className="px-4 py-3">
                    <span 
                      className="px-2 py-1 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: SEGMENT_COLORS[client.segment] }}
                    >
                      {client.segment}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(client.totalCA)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{client.totalTransactions}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatCurrency(client.panierMoyen)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    <div>{formatDate(client.lastVisit)}</div>
                    <div className="text-xs text-gray-500">Il y a {client.daysSinceLastVisit}j</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bouton voir plus */}
        {filteredClients.length > displayCount && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setDisplayCount(displayCount + 20)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Afficher plus ({filteredClients.length - displayCount} restants)
            </button>
          </div>
        )}

        {filteredClients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun client trouvé avec ces critères
          </div>
        )}
      </div>

      {/* Insights et recommandations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">👑 Clients VIP</h3>
          <p className="text-yellow-800">
            <span className="font-bold">{segmentData.find(s => s.name === 'VIP')?.value || 0}</span> clients VIP 
            représentent votre meilleur potentiel. Offrez-leur des avantages exclusifs pour les fidéliser.
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">⚠️ Clients inactifs</h3>
          <p className="text-orange-800">
            <span className="font-bold">{segmentData.find(s => s.name === 'Inactif')?.value || 0}</span> clients 
            inactifs depuis +90 jours. Lancez une campagne de réactivation pour les reconquérir.
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">🎯 Potentiel</h3>
          <p className="text-green-800">
            Les clients <span className="font-bold">Réguliers</span> et <span className="font-bold">Fidèles</span> sont 
            proches de devenir VIP. Encouragez-les avec des offres ciblées.
          </p>
        </div>
      </div>
    </div>
  )
}

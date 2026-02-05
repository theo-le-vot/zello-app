'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Range } from 'react-range'
import AddClientModal from '@/components/AddClientModal'
import { Users, Plus, Search, Filter, UserCheck, Star, Calendar, TrendingUp, Mail, Phone, Eye } from 'lucide-react'

interface Client {
  id: string
  points: number
  join_date: string
  last_visit_at: string | null
  visits: number
  is_vip: boolean
  notes: string | null
  customer: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone_number: string
    created_at: string
    status?: string
  }
}

interface ClientStats {
  total: number
  active: number
  vip: number
  inactive: number
  totalPoints: number
  averagePoints: number
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState('')
  const [minPoints, setMinPoints] = useState(0)
  const [maxPoints, setMaxPoints] = useState(100)
  const [pointsRange, setPointsRange] = useState<[number, number]>([0, 100])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'vip'>('all')
  const [hasActiveStore, setHasActiveStore] = useState(true)
  
  const [stats, setStats] = useState<ClientStats>({
    total: 0,
    active: 0,
    vip: 0,
    inactive: 0,
    totalPoints: 0,
    averagePoints: 0
  })

  const fetchClients = async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('Erreur authentification :', authError)
      return
    }
    if (!user) {
      console.error('Utilisateur non connecté')
      return
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('Erreur récupération user :', userError)
      return
    }

    if (!userData?.active_store_id) {
      setHasActiveStore(false)
      setClients([])
      return
    }

    setHasActiveStore(true)

    const { data, error } = await supabase
      .from('customers_stores')
      .select(`
        id,
        points,
        join_date,
        last_visit_at,
        visits,
        is_vip,
        notes,
        customer:customers (
          id,
          first_name,
          last_name,
          email,
          phone_number,
          created_at
        )
      `)
      .eq('store_id', userData.active_store_id)
      .order('join_date', { ascending: false })

    if (error) {
      console.error('Erreur chargement clients :', error)
      return
    }

    const cleanData: Client[] = (data || []).map((item: any) => ({
      ...item,
      customer: Array.isArray(item.customer) ? item.customer[0] : item.customer
    }))

    const points = cleanData.map(c => c.points || 0)
    const min = points.length > 0 ? Math.min(...points) : 0
    const max = points.length > 0 ? Math.max(...points) : 100

    setMinPoints(min)
    setMaxPoints(max)
    setPointsRange([min, max])
    setClients(cleanData)
    
    // Calculer les statistiques
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const activeCount = cleanData.filter(c => 
      c.last_visit_at && new Date(c.last_visit_at) >= thirtyDaysAgo
    ).length
    
    const vipCount = cleanData.filter(c => c.is_vip).length
    const inactiveCount = cleanData.filter(c => 
      !c.last_visit_at || new Date(c.last_visit_at) < thirtyDaysAgo
    ).length
    
    const totalPoints = cleanData.reduce((sum, c) => sum + (c.points || 0), 0)
    const avgPoints = cleanData.length > 0 ? Math.round(totalPoints / cleanData.length) : 0
    
    setStats({
      total: cleanData.length,
      active: activeCount,
      vip: vipCount,
      inactive: inactiveCount,
      totalPoints,
      averagePoints: avgPoints
    })
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const getClientStatus = (client: Client): 'active' | 'inactive' => {
    if (!client.last_visit_at) return 'inactive'
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return new Date(client.last_visit_at) >= thirtyDaysAgo ? 'active' : 'inactive'
  }

  const filteredClients = clients
    .filter(c =>
      (c.customer?.first_name + ' ' + c.customer?.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(c => {
      if (startDate && new Date(c.customer?.created_at) < new Date(startDate)) return false
      if (endDate && new Date(c.customer?.created_at) > new Date(endDate)) return false
      return true
    })
    .filter(c => (c.points ?? 0) >= pointsRange[0] && (c.points ?? 0) <= pointsRange[1])
    .filter(c => {
      if (filterStatus === 'all') return true
      if (filterStatus === 'vip') return c.is_vip
      if (filterStatus === 'active') return getClientStatus(c) === 'active'
      if (filterStatus === 'inactive') return getClientStatus(c) === 'inactive'
      return true
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'name-asc': return a.customer.first_name.localeCompare(b.customer.first_name)
        case 'name-desc': return b.customer.first_name.localeCompare(a.customer.first_name)
        case 'points-asc': return (a.points ?? 0) - (b.points ?? 0)
        case 'points-desc': return (b.points ?? 0) - (a.points ?? 0)
        case 'date-asc': return new Date(a.customer.created_at).getTime() - new Date(b.customer.created_at).getTime()
        case 'date-desc': return new Date(b.customer.created_at).getTime() - new Date(a.customer.created_at).getTime()
        default: return 0
      }
    })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="text-[#093A23]" size={32} />
            Mes clients
          </h1>
          <p className="text-gray-600 mt-1">Gérez votre base clients et leur fidélité</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          disabled={!hasActiveStore}
          className="bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Nouveau client
        </button>
      </div>

      {/* Message si pas de boutique active */}
      {!hasActiveStore ? (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg border-2 border-blue-200 p-12 text-center">
          <Users size={64} className="mx-auto mb-4 text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Aucune boutique active</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Vous devez d'abord créer et activer une boutique pour gérer vos clients.
          </p>
          <a 
            href="/dashboard/pro"
            className="inline-block px-6 py-3 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
          >
            Retour au tableau de bord
          </a>
        </div>
      ) : (
        <>
      
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-[#093A23] to-[#0d5534] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Users size={24} />
            <span className="text-sm opacity-90">Total</span>
          </div>
          <div className="text-3xl font-bold">{stats.total}</div>
          <div className="text-sm opacity-90 mt-1">Clients</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <UserCheck size={24} />
            <span className="text-sm opacity-90">Actifs</span>
          </div>
          <div className="text-3xl font-bold">{stats.active}</div>
          <div className="text-sm opacity-90 mt-1">Visite &lt; 30j</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Star size={24} />
            <span className="text-sm opacity-90">Points</span>
          </div>
          <div className="text-3xl font-bold">{stats.totalPoints.toLocaleString()}</div>
          <div className="text-sm opacity-90 mt-1">Moy: {stats.averagePoints} pts</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={24} />
            <span className="text-sm opacity-90">VIP</span>
          </div>
          <div className="text-3xl font-bold">{stats.vip}</div>
          <div className="text-sm opacity-90 mt-1">{stats.total > 0 ? Math.round((stats.vip / stats.total) * 100) : 0}% des clients</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Filter size={20} />
          Filtres et recherche
        </h2>
        
        {/* Filtres rapides par statut */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterStatus === 'all'
                ? 'bg-gradient-to-r from-[#093A23] to-[#0d5534] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tous ({stats.total})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterStatus === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Actifs ({stats.active})
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterStatus === 'inactive'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Inactifs ({stats.inactive})
          </button>
          <button
            onClick={() => setFilterStatus('vip')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterStatus === 'vip'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            VIP ({stats.vip})
          </button>
        </div>
        
        <div className="grid md:grid-cols-12 gap-4 text-sm">
          <div className="col-span-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un nom ou email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
            />
          </div>

          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            placeholder="Date début"
            className="col-span-2 border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
          />

          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            placeholder="Date fin"
            className="col-span-2 border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
          />

          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value)}
            className="col-span-2 border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23] bg-white"
          >
            <option value="">Tri par...</option>
            <option value="name-asc">Nom A → Z</option>
            <option value="name-desc">Nom Z → A</option>
            <option value="points-asc">Points ↑</option>
            <option value="points-desc">Points ↓</option>
            <option value="date-asc">Anciens</option>
            <option value="date-desc">Récents</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('')
              setSortOption('')
              setPointsRange([minPoints, maxPoints])
              setStartDate('')
              setEndDate('')
              setFilterStatus('all')
            }}
            className="col-span-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Réinitialiser
          </button>

          <div className="col-span-12 mt-2">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Points fidélité : {pointsRange[0]} – {pointsRange[1]}
            </label>
            <Range
              step={1}
              min={minPoints}
              max={maxPoints}
              values={pointsRange}
              onChange={(values) => setPointsRange([values[0], values[1]])}
              renderTrack={({ props, children }) => (
                <div {...props} className="h-2 bg-gray-200 rounded mt-1 relative">
                  <div
                    style={{
                      position: 'absolute',
                      height: '100%',
                      backgroundColor: '#093A23',
                      borderRadius: '4px',
                      left: `${((pointsRange[0] - minPoints) / (maxPoints - minPoints)) * 100}%`,
                      width: `${((pointsRange[1] - pointsRange[0]) / (maxPoints - minPoints)) * 100}%`,
                      zIndex: 1,
                    }}
                  />
                  {children}
                </div>
              )}
              renderThumb={({ props }) => {
                const { key, ...rest } = props
                return <div key={key} {...rest} className="h-4 w-4 bg-[#093A23] rounded-full shadow" />
              }}
            />
          </div>
        </div>
      </div>

      {/* Tableau */}
      {filteredClients.length > 0 ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Inscription</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dernière visite</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Points</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((c) => {
                  const status = getClientStatus(c)
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#093A23] to-[#0d5534] flex items-center justify-center text-white font-semibold text-sm">
                            {c.customer?.first_name?.[0]}{c.customer?.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {c.customer?.first_name} {c.customer?.last_name}
                              {c.is_vip && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-semibold">
                                  <Star size={12} className="mr-1" />
                                  VIP
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{c.visits || 0} visite{(c.visits || 0) > 1 ? 's' : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {c.customer?.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail size={14} className="text-gray-400" />
                              {c.customer.email}
                            </div>
                          )}
                          {c.customer?.phone_number && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone size={14} className="text-gray-400" />
                              {c.customer.phone_number}
                            </div>
                          )}
                          {!c.customer?.email && !c.customer?.phone_number && (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <span className={`w-2 h-2 rounded-full mr-1 ${
                            status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                          }`}></span>
                          {status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar size={14} className="text-gray-400" />
                          {new Date(c.customer?.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {c.last_visit_at
                          ? new Date(c.last_visit_at).toLocaleDateString('fr-FR')
                          : <span className="text-gray-400">Jamais</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
                          {c.points ?? 0} pts
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                          title="Voir les détails"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
          <Users size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">Aucun client trouvé</p>
          <p className="text-sm text-gray-400 mt-2">Ajustez vos filtres ou ajoutez un nouveau client</p>
          <button 
            onClick={() => {
              setSearchTerm('')
              setSortOption('')
              setPointsRange([minPoints, maxPoints])
              setStartDate('')
              setEndDate('')
              setFilterStatus('all')
            }}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      </>
      )}

      <AddClientModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchClients}
      />
    </div>
  )
}

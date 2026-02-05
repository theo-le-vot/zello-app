'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Mail, Send, Users, TrendingUp, Calendar, Plus, Edit2, Trash2, Eye, Search, Filter, X, Save } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  subject: string
  message: string
  segment: 'all' | 'vip' | 'fidele' | 'regulier' | 'occasionnel' | 'inactif'
  status: 'draft' | 'scheduled' | 'sent'
  scheduled_at?: string
  sent_at?: string
  recipients_count?: number
  opened_count?: number
  clicked_count?: number
  created_at: string
}

interface CampaignStats {
  totalCampaigns: number
  sentCampaigns: number
  totalRecipients: number
  averageOpenRate: number
}

const SEGMENT_LABELS = {
  all: 'Tous les clients',
  vip: 'Clients VIP',
  fidele: 'Clients fidèles',
  regulier: 'Clients réguliers',
  occasionnel: 'Clients occasionnels',
  inactif: 'Clients inactifs'
}

const SEGMENT_COLORS = {
  all: 'bg-gray-100 text-gray-800',
  vip: 'bg-red-100 text-red-800',
  fidele: 'bg-orange-100 text-orange-800',
  regulier: 'bg-green-100 text-green-800',
  occasionnel: 'bg-cyan-100 text-cyan-800',
  inactif: 'bg-gray-100 text-gray-600'
}

const STATUS_LABELS = {
  draft: 'Brouillon',
  scheduled: 'Programmée',
  sent: 'Envoyée'
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-green-100 text-green-800'
}

const MESSAGE_TEMPLATES = [
  {
    name: 'Bienvenue nouveau client',
    subject: 'Bienvenue chez {store_name} !',
    message: 'Bonjour {customer_name},\n\nNous sommes ravis de vous compter parmi nos clients !\n\nPour vous remercier, découvrez nos produits et profitez de votre programme de fidélité.\n\nÀ très bientôt !\nL\'équipe {store_name}'
  },
  {
    name: 'Rappel solde points',
    subject: 'Vous avez {points} points de fidélité !',
    message: 'Bonjour {customer_name},\n\nVous avez actuellement {points} points sur votre compte fidélité.\n\nN\'oubliez pas de les utiliser pour profiter de nos récompenses exclusives !\n\nÀ bientôt,\nL\'équipe {store_name}'
  },
  {
    name: 'Relance client inactif',
    subject: 'Vous nous manquez chez {store_name}',
    message: 'Bonjour {customer_name},\n\nCela fait un moment que nous ne vous avons pas vu.\n\nRevenez nous voir et découvrez nos nouveautés !\n\nÀ très bientôt,\nL\'équipe {store_name}'
  },
  {
    name: 'Promotion spéciale',
    subject: 'Offre spéciale rien que pour vous !',
    message: 'Bonjour {customer_name},\n\nEn tant que client {segment}, nous vous offrons une promotion exclusive !\n\n[Détails de la promotion]\n\nValable jusqu\'au [date]\n\nL\'équipe {store_name}'
  },
  {
    name: 'Anti-gaspillage du jour',
    subject: 'Produits anti-gaspi disponibles aujourd\'hui',
    message: 'Bonjour {customer_name},\n\nNous avons des produits invendus disponibles à prix réduit aujourd\'hui !\n\nVenez vite les découvrir avant qu\'il ne soit trop tard.\n\nL\'équipe {store_name}'
  }
]

export default function MarketingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeName, setStoreName] = useState<string>('')
  
  // Campagnes (simulées pour l'instant - à connecter à une vraie table plus tard)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  
  const [stats, setStats] = useState<CampaignStats>({
    totalCampaigns: 0,
    sentCampaigns: 0,
    totalRecipients: 0,
    averageOpenRate: 0
  })

  // Segments de clients
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({
    all: 0,
    vip: 0,
    fidele: 0,
    regulier: 0,
    occasionnel: 0,
    inactif: 0
  })

  // Modal création campagne
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    message: '',
    segment: 'all' as Campaign['segment'],
    status: 'draft' as Campaign['status']
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterCampaigns()
  }, [campaigns, searchTerm, filterStatus])

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

      if (!userData?.active_store_id) return

      setStoreId(userData.active_store_id)

      // Récupérer le nom du store
      const { data: storeData } = await supabase
        .from('stores')
        .select('name')
        .eq('id', userData.active_store_id)
        .single()

      if (storeData) {
        setStoreName(storeData.name)
      }

      // Récupérer les segments de clients
      await fetchSegmentCounts(userData.active_store_id)

      // Charger les campagnes depuis localStorage (temporaire)
      const savedCampaigns = localStorage.getItem(`campaigns_${userData.active_store_id}`)
      if (savedCampaigns) {
        const parsedCampaigns = JSON.parse(savedCampaigns)
        setCampaigns(parsedCampaigns)
        calculateStats(parsedCampaigns)
      }
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSegmentCounts = async (storeId: string) => {
    try {
      // Tous les clients
      const { count: allCount } = await supabase
        .from('customers_stores')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)

      // Clients VIP
      const { count: vipCount } = await supabase
        .from('customers_stores')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('is_vip', true)

      // Clients avec points (actifs)
      const { count: activeCount } = await supabase
        .from('customers_stores')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .gt('points', 0)

      // Clients inactifs (pas de visite depuis 90 jours)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      
      const { count: inactifCount } = await supabase
        .from('customers_stores')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .lt('last_visit_at', ninetyDaysAgo.toISOString().split('T')[0])

      setSegmentCounts({
        all: allCount || 0,
        vip: vipCount || 0,
        fidele: activeCount || 0,
        regulier: Math.max((allCount || 0) - (activeCount || 0) - (inactifCount || 0), 0),
        occasionnel: Math.floor((allCount || 0) * 0.2), // Estimation
        inactif: inactifCount || 0
      })
    } catch (err) {
      console.error('Erreur segments:', err)
    }
  }

  const calculateStats = (campaignsList: Campaign[]) => {
    const sent = campaignsList.filter(c => c.status === 'sent')
    const totalRecipients = sent.reduce((sum, c) => sum + (c.recipients_count || 0), 0)
    const totalOpened = sent.reduce((sum, c) => sum + (c.opened_count || 0), 0)
    const averageOpenRate = totalRecipients > 0 ? Math.round((totalOpened / totalRecipients) * 100) : 0

    setStats({
      totalCampaigns: campaignsList.length,
      sentCampaigns: sent.length,
      totalRecipients,
      averageOpenRate
    })
  }

  const filterCampaigns = () => {
    let filtered = [...campaigns]

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus)
    }

    setFilteredCampaigns(filtered)
  }

  const openModal = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign)
      setFormData({
        name: campaign.name,
        subject: campaign.subject,
        message: campaign.message,
        segment: campaign.segment,
        status: campaign.status
      })
    } else {
      setEditingCampaign(null)
      setFormData({
        name: '',
        subject: '',
        message: '',
        segment: 'all',
        status: 'draft'
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCampaign(null)
  }

  const applyTemplate = (template: typeof MESSAGE_TEMPLATES[0]) => {
    setFormData({
      ...formData,
      name: template.name,
      subject: template.subject,
      message: template.message
    })
  }

  const handleSave = () => {
    if (!storeId || !formData.name || !formData.subject || !formData.message) {
      alert('Veuillez remplir tous les champs')
      return
    }

    const now = new Date().toISOString()
    let updatedCampaigns: Campaign[]

    if (editingCampaign) {
      updatedCampaigns = campaigns.map(c => 
        c.id === editingCampaign.id 
          ? { ...c, ...formData }
          : c
      )
    } else {
      const newCampaign: Campaign = {
        id: `camp_${Date.now()}`,
        ...formData,
        created_at: now,
        recipients_count: segmentCounts[formData.segment]
      }
      updatedCampaigns = [newCampaign, ...campaigns]
    }

    setCampaigns(updatedCampaigns)
    localStorage.setItem(`campaigns_${storeId}`, JSON.stringify(updatedCampaigns))
    calculateStats(updatedCampaigns)
    closeModal()
  }

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return

    const updatedCampaigns = campaigns.filter(c => c.id !== id)
    setCampaigns(updatedCampaigns)
    if (storeId) {
      localStorage.setItem(`campaigns_${storeId}`, JSON.stringify(updatedCampaigns))
    }
    calculateStats(updatedCampaigns)
  }

  const handleSendCampaign = (campaign: Campaign) => {
    if (!confirm(`Envoyer la campagne "${campaign.name}" à ${segmentCounts[campaign.segment]} clients ?`)) return

    // Simulation d'envoi
    const updatedCampaigns = campaigns.map(c => 
      c.id === campaign.id 
        ? { 
            ...c, 
            status: 'sent' as const,
            sent_at: new Date().toISOString(),
            recipients_count: segmentCounts[campaign.segment],
            opened_count: Math.floor(segmentCounts[campaign.segment] * (Math.random() * 0.3 + 0.2)) // Simulation
          }
        : c
    )

    setCampaigns(updatedCampaigns)
    if (storeId) {
      localStorage.setItem(`campaigns_${storeId}`, JSON.stringify(updatedCampaigns))
    }
    calculateStats(updatedCampaigns)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#093A23] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Mail className="text-[#093A23]" size={32} />
            Marketing & Communication
          </h1>
          <p className="text-gray-600 mt-1">Gérez vos campagnes et communiquez avec vos clients</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white rounded-lg transition shadow-md hover:shadow-lg"
        >
          <Plus size={18} />
          Nouvelle campagne
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-[#093A23] to-[#0d5534] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Mail size={24} />
            <span className="text-sm opacity-90">Campagnes</span>
          </div>
          <div className="text-3xl font-bold">{stats.totalCampaigns}</div>
          <div className="text-sm opacity-90 mt-1">
            {stats.sentCampaigns} envoyées
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Users size={24} />
            <span className="text-sm opacity-90">Destinataires</span>
          </div>
          <div className="text-3xl font-bold">{stats.totalRecipients}</div>
          <div className="text-sm opacity-90 mt-1">
            Total touchés
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={24} />
            <span className="text-sm opacity-90">Taux d'ouverture</span>
          </div>
          <div className="text-3xl font-bold">{stats.averageOpenRate}%</div>
          <div className="text-sm opacity-90 mt-1">
            Moyenne
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Calendar size={24} />
            <span className="text-sm opacity-90">Ce mois</span>
          </div>
          <div className="text-3xl font-bold">
            {campaigns.filter(c => {
              const date = new Date(c.created_at)
              const now = new Date()
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
            }).length}
          </div>
          <div className="text-sm opacity-90 mt-1">
            Campagnes
          </div>
        </div>
      </div>

      {/* Segments de clients */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={20} />
          Segments de clients disponibles
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(segmentCounts).map(([segment, count]) => (
            <div key={segment} className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold mb-2 ${SEGMENT_COLORS[segment as keyof typeof SEGMENT_COLORS]}`}>
                {SEGMENT_LABELS[segment as keyof typeof SEGMENT_LABELS]}
              </div>
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-500">clients</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher une campagne..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillons</option>
            <option value="scheduled">Programmées</option>
            <option value="sent">Envoyées</option>
          </select>
        </div>
      </div>

      {/* Liste des campagnes */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Mail size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Aucune campagne</p>
            <p className="text-sm mt-2">Créez votre première campagne pour communiquer avec vos clients</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Campagne</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Segment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Destinataires</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Performance</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-sm text-gray-500">{campaign.subject}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${SEGMENT_COLORS[campaign.segment]}`}>
                        {SEGMENT_LABELS[campaign.segment]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {campaign.recipients_count || segmentCounts[campaign.segment]}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[campaign.status]}`}>
                        {STATUS_LABELS[campaign.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {campaign.sent_at 
                        ? new Date(campaign.sent_at).toLocaleDateString('fr-FR')
                        : new Date(campaign.created_at).toLocaleDateString('fr-FR')
                      }
                    </td>
                    <td className="px-6 py-4">
                      {campaign.status === 'sent' && (
                        <div className="text-sm">
                          <div className="text-gray-900 font-medium">
                            {campaign.opened_count || 0} ouvertures
                          </div>
                          <div className="text-gray-500">
                            {campaign.recipients_count ? Math.round((campaign.opened_count || 0) / campaign.recipients_count * 100) : 0}%
                          </div>
                        </div>
                      )}
                      {campaign.status !== 'sent' && (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {campaign.status !== 'sent' && (
                          <>
                            <button
                              onClick={() => openModal(campaign)}
                              className="p-2 text-[#093A23] hover:bg-green-50 rounded-lg transition"
                              title="Modifier"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleSendCampaign(campaign)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Envoyer"
                            >
                              <Send size={16} />
                            </button>
                          </>
                        )}
                        {campaign.status === 'sent' && (
                          <button
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                            title="Voir les détails"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(campaign.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal création/édition */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCampaign ? 'Modifier la campagne' : 'Nouvelle campagne'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Templates */}
              {!editingCampaign && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Modèles de messages
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {MESSAGE_TEMPLATES.map((template, idx) => (
                      <button
                        key={idx}
                        onClick={() => applyTemplate(template)}
                        className="p-3 text-left border-2 border-gray-200 rounded-lg hover:border-[#093A23] hover:bg-green-50 transition"
                      >
                        <div className="font-medium text-gray-900 text-sm">{template.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{template.subject}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nom de la campagne */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Nom de la campagne *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Newsletter janvier, Relance clients inactifs..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                />
              </div>

              {/* Segment cible */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Segment cible *
                </label>
                <select
                  value={formData.segment}
                  onChange={(e) => setFormData({ ...formData, segment: e.target.value as Campaign['segment'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                >
                  {Object.entries(SEGMENT_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label} ({segmentCounts[key]} clients)
                    </option>
                  ))}
                </select>
              </div>

              {/* Sujet */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Sujet de l'email *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: Offre spéciale pour vous !"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Variables disponibles: {'{store_name}'}, {'{customer_name}'}, {'{points}'}, {'{segment}'}
                </p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Message *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Votre message ici..."
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Variables disponibles: {'{store_name}'}, {'{customer_name}'}, {'{points}'}, {'{segment}'}
                </p>
              </div>

              {/* Aperçu */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm font-semibold text-gray-700 mb-2">Aperçu</div>
                <div className="bg-white rounded border border-gray-300 p-4">
                  <div className="font-semibold text-gray-900 mb-2">
                    {formData.subject.replace('{store_name}', storeName).replace('{customer_name}', 'Jean Dupont').replace('{points}', '150')}
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {formData.message.replace('{store_name}', storeName).replace('{customer_name}', 'Jean Dupont').replace('{points}', '150').replace('{segment}', SEGMENT_LABELS[formData.segment])}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white rounded-lg transition shadow-md hover:shadow-lg"
              >
                <Save size={18} />
                Enregistrer le brouillon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

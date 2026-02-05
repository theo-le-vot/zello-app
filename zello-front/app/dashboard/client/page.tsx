'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  Heart, 
  Store, 
  Trophy, 
  Gift, 
  MapPin, 
  Star, 
  TrendingUp,
  Navigation,
  Award,
  Sparkles,
  ChevronRight,
  Search,
  LogOut
} from 'lucide-react'

interface ClientProfile {
  id: string
  first_name: string
  last_name: string
  profile_photo?: string
  total_points: number
}

interface StoreData {
  id: string
  name: string
  logo_url?: string
  address?: string
  city?: string
  phone?: string
  is_favorite: boolean
  total_visits: number
  points_earned: number
  last_visit?: string
}

interface Reward {
  id: string
  store_name: string
  store_logo?: string
  title: string
  description: string
  points_required: number
  valid_until?: string
  category: 'discount' | 'freebie' | 'exclusive'
}

// Helper functions pour transformer les types de récompenses
const getCategoryFromType = (type: string): 'discount' | 'freebie' | 'exclusive' => {
  const typeMap: Record<string, 'discount' | 'freebie' | 'exclusive'> = {
    'discount': 'discount',
    'free_product': 'freebie',
    'product_selection': 'freebie',
    'anti_waste': 'exclusive',
    'cart_discount': 'discount'
  }
  return typeMap[type] || 'exclusive'
}

const getCategoryDescription = (type: string): string => {
  const descriptions: Record<string, string> = {
    'discount': 'Réduction sur vos achats',
    'free_product': 'Produit offert',
    'product_selection': 'Choix de produits gratuits',
    'anti_waste': 'Offre anti-gaspillage exclusive',
    'cart_discount': 'Remise sur le montant total'
  }
  return descriptions[type] || 'Récompense exclusive'
}

export default function DashboardClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [stores, setStores] = useState<StoreData[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'favorites'>('all')

  useEffect(() => {
    fetchClientData()
  }, [])

  const fetchClientData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Récupérer le profil client - essayer d'abord customers puis users
      let clientData = null
      const { data: customerData } = await supabase
        .from('customers')
        .select('id, first_name, last_name, profile_photo')
        .eq('auth_user_id', user.id)
        .single()

      if (customerData) {
        clientData = customerData
      } else {
        // Fallback sur users si customers n'existe pas
        const { data: userData } = await supabase
          .from('users')
          .select('id, first_name, last_name, profile_photo')
          .eq('id', user.id)
          .single()
        
        clientData = userData
      }

      if (!clientData) {
        console.error('Impossible de récupérer les données client')
        return
      }

      // Récupérer les magasins et points du client depuis customers_stores
      console.log('🔍 Recherche magasins pour customer_id:', clientData.id)
      
      const { data: customerStoresData, error: storesError } = await supabase
        .from('customers_stores')
        .select('id, points, visits, last_visit_at, is_vip, store_id')
        .eq('customer_id', clientData.id)

      console.log('📊 Données customers_stores:', customerStoresData)
      console.log('❌ Erreur customers_stores:', storesError)

      if (storesError) {
        console.error('Erreur récupération magasins:', storesError)
      }

      // Récupérer les infos des magasins séparément
      let storesInfo: any[] = []
      if (customerStoresData && customerStoresData.length > 0) {
        const storeIds = customerStoresData.map(cs => cs.store_id)
        const { data: storesData, error: storesInfoError } = await supabase
          .from('stores')
          .select('id, name, logo_url, address_street, address_city, phone_number')
          .in('id', storeIds)
        
        console.log('🏢 Infos magasins:', storesData)
        console.log('❌ Erreur infos magasins:', storesInfoError)
        
        if (storesData) {
          storesInfo = storesData
        }
      }

      // Calculer le total de points (somme de tous les magasins)
      const totalPoints = customerStoresData?.reduce((sum, cs) => sum + (cs.points || 0), 0) || 0
      console.log('💰 Total points calculé:', totalPoints)

      setClient({
        ...clientData,
        total_points: totalPoints
      })

      // Transformer les données pour l'affichage
      const storesData: StoreData[] = (customerStoresData || []).map(cs => {
        const storeInfo = storesInfo.find(s => s.id === cs.store_id)
        
        console.log('🔄 Transformation:', {
          customer_store: cs,
          store_info: storeInfo,
          points: cs.points,
          visits: cs.visits
        })
        
        return {
          id: cs.store_id,
          name: storeInfo?.name || 'Magasin',
          logo_url: storeInfo?.logo_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
          address: storeInfo?.address_street || '',
          city: storeInfo?.address_city || '',
          phone: storeInfo?.phone_number || '',
          is_favorite: cs.is_vip || false,
          total_visits: cs.visits || 0,
          points_earned: cs.points || 0,
          last_visit: cs.last_visit_at || ''
        }
      })

      console.log('🏪 Magasins transformés:', storesData)
      setStores(storesData)

      // Récupérer les récompenses disponibles depuis loyalty_rewards
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('loyalty_rewards')
        .select(`
          id,
          name,
          points_cost,
          type,
          is_active,
          store_id,
          stores (
            name,
            logo_url
          )
        `)
        .eq('is_active', true)
        .order('points_cost', { ascending: true })

      if (rewardsError) {
        console.error('Erreur récupération récompenses:', rewardsError)
      }

      // Transformer les récompenses pour l'affichage
      const rewardsTransformed: Reward[] = (rewardsData || []).map(reward => {
        const stores = reward.stores as any
        const store = Array.isArray(stores) ? stores[0] : stores
        return {
          id: reward.id,
          store_name: store?.name || 'Magasin',
          store_logo: store?.logo_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop',
          title: reward.name,
          description: getCategoryDescription(reward.type),
          points_required: reward.points_cost,
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 jours
          category: getCategoryFromType(reward.type)
        }
      })

      setRewards(rewardsTransformed)

    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (storeId: string) => {
    if (!client) return
    
    // Mise à jour optimiste de l'UI
    const updatedStores = stores.map(store => 
      store.id === storeId 
        ? { ...store, is_favorite: !store.is_favorite }
        : store
    )
    setStores(updatedStores)

    try {
      // Mettre à jour is_vip dans customers_stores
      const store = stores.find(s => s.id === storeId)
      await supabase
        .from('customers_stores')
        .update({ is_vip: !store?.is_favorite })
        .eq('customer_id', client.id)
        .eq('store_id', storeId)
    } catch (error) {
      console.error('Erreur mise à jour favori:', error)
      // Annuler le changement en cas d'erreur
      setStores(stores)
    }
  }

  const handleLogout = async () => {
    if (!confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) return
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Erreur déconnexion:', error)
    }
  }

  const filteredStores = stores
    .filter(store => {
      if (filterTab === 'favorites' && !store.is_favorite) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return store.name.toLowerCase().includes(query) ||
               store.city?.toLowerCase().includes(query)
      }
      return true
    })
    .sort((a, b) => b.points_earned - a.points_earned)

  const favoriteStores = stores.filter(s => s.is_favorite)
  const availableRewards = rewards.filter(r => r.points_required <= (client?.total_points || 0))

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

  if (!client) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec profil */}
      <div className="bg-gradient-to-r from-[#093A23] to-[#0d5534] text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {client.profile_photo ? (
                <img
                  src={client.profile_photo}
                  alt={client.first_name}
                  className="w-16 h-16 rounded-full border-4 border-white/20 object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full border-4 border-white/20 bg-white/10 flex items-center justify-center">
                  <Star size={32} className="text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">Bonjour {client.first_name} !</h1>
                <p className="text-white/80 text-sm">Profitez de vos avantages fidélité</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg font-medium transition backdrop-blur-sm border border-white/20 flex items-center gap-2"
            >
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="max-w-7xl mx-auto px-4 -mt-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-gradient-to-br from-[#093A23] to-[#0d5534] rounded-lg">
                <Trophy className="text-white" size={24} />
              </div>
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{client.total_points}</div>
            <div className="text-sm text-gray-600">Points totaux</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
                <Heart className="text-white" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{favoriteStores.length}</div>
            <div className="text-sm text-gray-600">Magasins favoris</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                <Gift className="text-white" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{availableRewards.length}</div>
            <div className="text-sm text-gray-600">Récompenses disponibles</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Store className="text-white" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stores.length}</div>
            <div className="text-sm text-gray-600">Magasins visités</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Section principale - Magasins */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mes récompenses disponibles */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-amber-500" size={24} />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Récompenses disponibles</h2>
                    <p className="text-sm text-gray-600">Utilisez vos points pour obtenir des avantages</p>
                  </div>
                </div>
              </div>

              {availableRewards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableRewards.map(reward => (
                    <div
                      key={reward.id}
                      className="border-2 border-gray-200 rounded-xl p-4 hover:border-[#093A23] transition cursor-pointer group"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {reward.store_logo && (
                          <img
                            src={reward.store_logo}
                            alt={reward.store_name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 mb-1">{reward.store_name}</div>
                          <div className="font-bold text-gray-900">{reward.title}</div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="text-amber-500" size={16} />
                          <span className="font-bold text-[#093A23]">{reward.points_required} pts</span>
                        </div>
                        <button className="bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white px-4 py-1.5 rounded-lg text-sm font-medium transition group-hover:shadow-lg">
                          Échanger
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Gift size={48} className="mx-auto mb-3 text-gray-300" />
                  <p>Aucune récompense disponible pour le moment</p>
                  <p className="text-sm">Continuez à cumuler des points !</p>
                </div>
              )}
            </div>

            {/* Magasins */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Store className="text-[#093A23]" size={24} />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Magasins partenaires</h2>
                    <p className="text-sm text-gray-600">Découvrez tous les commerces utilisant Zello</p>
                  </div>
                </div>
              </div>

              {/* Filtres et recherche */}
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Rechercher un magasin, une ville..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterTab('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      filterTab === 'all'
                        ? 'bg-[#093A23] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Tous les magasins
                  </button>
                  <button
                    onClick={() => setFilterTab('favorites')}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                      filterTab === 'favorites'
                        ? 'bg-[#093A23] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Heart size={16} />
                    Mes favoris
                  </button>
                </div>
              </div>

              {/* Liste des magasins */}
              <div className="space-y-3">
                {filteredStores.map(store => (
                  <div
                    key={store.id}
                    className="border-2 border-gray-200 rounded-xl p-4 hover:border-[#093A23] transition"
                  >
                    <div className="flex items-start gap-4">
                      {store.logo_url && (
                        <img
                          src={store.logo_url}
                          alt={store.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">{store.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <MapPin size={14} />
                              {store.address}, {store.city}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleFavorite(store.id)}
                            className={`p-2 rounded-lg transition ${
                              store.is_favorite
                                ? 'bg-pink-50 text-pink-600'
                                : 'bg-gray-100 text-gray-400 hover:text-pink-600 hover:bg-pink-50'
                            }`}
                          >
                            <Heart size={20} fill={store.is_favorite ? 'currentColor' : 'none'} />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <div className="text-xs text-gray-500 mb-1">Visites</div>
                            <div className="font-bold text-gray-900">{store.total_visits}</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-2">
                            <div className="text-xs text-green-600 mb-1">Points gagnés</div>
                            <div className="font-bold text-[#093A23]">{store.points_earned}</div>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-2">
                            <div className="text-xs text-blue-600 mb-1">Dernière visite</div>
                            <div className="font-bold text-blue-900 text-xs">
                              {store.last_visit ? new Date(store.last_visit).toLocaleDateString('fr-FR') : 'N/A'}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button className="flex-1 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2">
                            <Navigation size={16} />
                            Itinéraire
                          </button>
                          <button className="flex-1 border-2 border-gray-200 hover:border-[#093A23] text-gray-700 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2">
                            <Award size={16} />
                            Voir les récompenses
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredStores.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Store size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>Aucun magasin trouvé</p>
                    <p className="text-sm">Essayez de modifier vos critères de recherche</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Mes favoris rapides */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="text-pink-600" size={20} />
                <h3 className="font-bold text-gray-900">Mes favoris</h3>
              </div>
              <div className="space-y-3">
                {favoriteStores.slice(0, 3).map(store => (
                  <div key={store.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
                    {store.logo_url && (
                      <img src={store.logo_url} alt={store.name} className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{store.name}</div>
                      <div className="text-xs text-gray-500">{store.points_earned} points</div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Progression niveau */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award size={24} />
                <h3 className="font-bold">Niveau Fidélité</h3>
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Membre Gold</span>
                  <span className="text-sm">{client.total_points}/3000</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div 
                    className="bg-white rounded-full h-3 transition-all"
                    style={{ width: `${(client.total_points / 3000) * 100}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-sm text-white/90">
                Plus que {3000 - client.total_points} points pour atteindre le niveau Platine !
              </p>
            </div>

            {/* Astuce du jour */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="text-blue-600" size={20} />
                <h3 className="font-bold text-blue-900">Astuce du jour</h3>
              </div>
              <p className="text-sm text-blue-800">
                Visitez 3 magasins favoris cette semaine et gagnez 50 points bonus ! 🎁
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

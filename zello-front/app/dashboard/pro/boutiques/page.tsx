'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  Store, 
  Plus,
  MapPin,
  Clock,
  Users,
  TrendingUp,
  Settings,
  Trash2,
  Edit,
  CheckCircle,
  X,
  Upload,
  Image as ImageIcon,
  Loader2
} from 'lucide-react'

interface StoreData {
  id: string
  name: string
  address: string
  city: string
  phone: string
  logo_url?: string
  is_active: boolean
  totalClients: number
  monthlyRevenue: number
  openingHours: string
}

export default function MultiBoutiquesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [stores, setStores] = useState<StoreData[]>([])

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStore, setEditingStore] = useState<StoreData | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [newStore, setNewStore] = useState<Partial<StoreData>>({
    name: '',
    address: '',
    city: '',
    phone: '',
    openingHours: '',
    is_active: true
  })

  useEffect(() => {
    fetchUserStores()
  }, [])

  const fetchUserStores = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      // Récupérer les boutiques de l'utilisateur
      const { data: userStores, error: userStoreError } = await supabase
        .from('user_store')
        .select('store_id')
        .eq('user_id', user.id)

      if (userStoreError) throw userStoreError

      const storeIds = userStores?.map(us => us.store_id) || []

      if (storeIds.length === 0) {
        setStores([])
        setLoading(false)
        return
      }

      // Récupérer les détails des boutiques
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, name, address_street, address_city, phone_number, logo_url, is_active')
        .in('id', storeIds)

      if (storesError) throw storesError

      // Pour chaque boutique, calculer les stats
      const storesWithStats = await Promise.all(
        (storesData || []).map(async (store) => {
          // Nombre de clients
          const { count: clientsCount } = await supabase
            .from('customers_stores')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', store.id)

          // CA du mois en cours
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)

          const { data: transactions } = await supabase
            .from('transactions')
            .select('total_amount')
            .eq('store_id', store.id)
            .gte('created_at', startOfMonth.toISOString())

          const monthlyRevenue = transactions?.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0) || 0

          return {
            id: store.id,
            name: store.name,
            address: store.address_street || '',
            city: store.address_city || '',
            phone: store.phone_number || '',
            logo_url: store.logo_url,
            is_active: store.is_active ?? true,
            totalClients: clientsCount || 0,
            monthlyRevenue: Math.round(monthlyRevenue),
            openingHours: '9h-18h' // Valeur par défaut, à ajouter dans la table si besoin
          }
        })
      )

      setStores(storesWithStats)
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du chargement des boutiques')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, forEdit: boolean = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image')
      return
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5MB')
      return
    }

    setUploadingLogo(true)
    try {
      // Créer un nom de fichier unique
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `store-logos/${fileName}`

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Obtenir l'URL publique
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Mettre à jour le formulaire correspondant
      if (forEdit && editingStore) {
        setEditingStore({ ...editingStore, logo_url: data.publicUrl })
      } else {
        setNewStore({ ...newStore, logo_url: data.publicUrl })
      }

    } catch (error: any) {
      console.error('Erreur upload:', error)
      alert('Erreur lors de l\'upload: ' + (error.message || 'Erreur inconnue'))
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleAddStore = async () => {
    if (!newStore.name || !newStore.address || !newStore.city || !userId) return

    try {
      // Créer la nouvelle boutique
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert([{
          name: newStore.name,
          address_street: newStore.address,
          address_city: newStore.city,
          phone_number: newStore.phone || null,
          logo_url: newStore.logo_url || null,
          is_active: true
        }])
        .select()
        .single()

      if (storeError) throw storeError

      // Lier la boutique à l'utilisateur
      const { error: linkError } = await supabase
        .from('user_store')
        .insert([{
          user_id: userId,
          store_id: store.id
        }])

      if (linkError) throw linkError

      // Rafraîchir la liste
      await fetchUserStores()
      
      setShowAddModal(false)
      setNewStore({
        name: '',
        address: '',
        city: '',
        phone: '',
        openingHours: '',
        is_active: true
      })
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de l\'ajout de la boutique')
    }
  }

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce point de vente ?')) return

    try {
      // Supprimer le lien user_store
      const { error: linkError } = await supabase
        .from('user_store')
        .delete()
        .eq('store_id', storeId)
        .eq('user_id', userId)

      if (linkError) throw linkError

      // Mettre à jour l'état local
      setStores(stores.filter(s => s.id !== storeId))
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const handleToggleStatus = async (storeId: string) => {
    const store = stores.find(s => s.id === storeId)
    if (!store) return

    try {
      const { error } = await supabase
        .from('stores')
        .update({ is_active: !store.is_active })
        .eq('id', storeId)

      if (error) throw error

      setStores(stores.map(s => 
        s.id === storeId 
          ? { ...s, is_active: !s.is_active }
          : s
      ))
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la mise à jour')
    }
  }

  const handleSaveEdit = async () => {
    if (!editingStore) return

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          name: editingStore.name,
          address_street: editingStore.address,
          address_city: editingStore.city,
          phone_number: editingStore.phone || null,
          logo_url: editingStore.logo_url || null
        })
        .eq('id', editingStore.id)

      if (error) throw error

      setStores(stores.map(s => s.id === editingStore.id ? editingStore : s))
      setEditingStore(null)
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la mise à jour')
    }
  }

  const totalStats = {
    totalStores: stores.length,
    activeStores: stores.filter(s => s.is_active).length,
    totalClients: stores.reduce((sum, s) => sum + s.totalClients, 0),
    totalRevenue: stores.reduce((sum, s) => sum + s.monthlyRevenue, 0)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des boutiques...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Mes points de vente
            </h1>
            <p className="text-gray-600">
              Gérez tous vos établissements depuis un seul endroit
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Ajouter une boutique
          </button>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl">
            <Store size={32} className="mb-4" />
            <div className="text-3xl font-bold mb-1">{totalStats.totalStores}</div>
            <div className="text-blue-100">Points de vente</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl">
            <CheckCircle size={32} className="mb-4" />
            <div className="text-3xl font-bold mb-1">{totalStats.activeStores}</div>
            <div className="text-green-100">Actifs</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl">
            <Users size={32} className="mb-4" />
            <div className="text-3xl font-bold mb-1">
              {totalStats.totalClients.toLocaleString('fr-FR')}
            </div>
            <div className="text-purple-100">Clients totaux</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl">
            <TrendingUp size={32} className="mb-4" />
            <div className="text-3xl font-bold mb-1">
              {totalStats.totalRevenue.toLocaleString('fr-FR')}€
            </div>
            <div className="text-orange-100">CA mensuel total</div>
          </div>
        </div>

        {/* Liste des boutiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stores.map((store) => (
            <div
              key={store.id}
              className={`bg-white rounded-xl border-2 p-6 transition-all ${
                store.is_active 
                  ? 'border-green-200 hover:border-green-300' 
                  : 'border-gray-200 opacity-60'
              }`}
            >
              {/* En-tête boutique */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Store className="text-green-600" size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {store.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        store.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {store.is_active ? (
                          <>
                            <CheckCircle size={12} />
                            Actif
                          </>
                        ) : (
                          'Inactif'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informations */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <MapPin className="text-gray-400 flex-shrink-0 mt-0.5" size={18} />
                  <div className="text-sm text-gray-600">
                    <div>{store.address}</div>
                    <div>{store.city}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="text-gray-400 flex-shrink-0" size={18} />
                  <span className="text-sm text-gray-600">{store.openingHours}</span>
                </div>
                {store.phone && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">📞</span>
                    <span className="text-sm text-gray-600">{store.phone}</span>
                  </div>
                )}
              </div>

              {/* Statistiques boutique */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {store.totalClients}
                  </div>
                  <div className="text-sm text-gray-600">Clients</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {store.monthlyRevenue.toLocaleString('fr-FR')}€
                  </div>
                  <div className="text-sm text-gray-600">CA/mois</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingStore(store)}
                  className="flex-1 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Modifier
                </button>
                <button
                  onClick={() => handleToggleStatus(store.id)}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                    store.is_active
                      ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {store.is_active ? 'Désactiver' : 'Activer'}
                </button>
                <button
                  onClick={() => handleDeleteStore(store.id)}
                  className="bg-red-50 text-red-700 px-4 py-2 rounded-lg font-semibold hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Offre entreprise */}
        <div className="mt-8 bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-xl p-8">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Store size={32} />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-3">
                Plus de 5 boutiques ?
              </h3>
              <p className="text-purple-100 mb-6">
                Découvrez notre offre Entreprise avec des fonctionnalités avancées : gestion centralisée, 
                API personnalisée, reporting consolidé et accompagnement dédié.
              </p>
              <button className="bg-white text-purple-600 px-8 py-3 rounded-lg font-bold hover:bg-purple-50 transition-colors">
                En savoir plus
              </button>
            </div>
          </div>
        </div>

        {/* Modal d'ajout */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Ajouter un point de vente
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nom du point de vente *
                  </label>
                  <input
                    type="text"
                    value={newStore.name}
                    onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                    placeholder="Ex: Boulangerie Centre-Ville"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Adresse *
                  </label>
                  <input
                    type="text"
                    value={newStore.address}
                    onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                    placeholder="12 rue de la République"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Ville *
                  </label>
                  <input
                    type="text"
                    value={newStore.city}
                    onChange={(e) => setNewStore({ ...newStore, city: e.target.value })}
                    placeholder="Paris 75001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={newStore.phone}
                    onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                    placeholder="+33 1 23 45 67 89"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Horaires d'ouverture
                  </label>
                  <input
                    type="text"
                    value={newStore.openingHours}
                    onChange={(e) => setNewStore({ ...newStore, openingHours: e.target.value })}
                    placeholder="9h-18h"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                  />
                </div>

                {/* Upload Logo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Logo de l'établissement
                  </label>
                  
                  {newStore.logo_url && (
                    <div className="mb-3 flex items-center gap-3">
                      <img
                        src={newStore.logo_url}
                        alt="Logo"
                        className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80'
                        }}
                      />
                      <button
                        onClick={() => setNewStore({ ...newStore, logo_url: '' })}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}

                  <label className="block">
                    <div className="flex items-center justify-center w-full h-24 px-4 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                      <div className="text-center">
                        {uploadingLogo ? (
                          <Loader2 className="mx-auto h-8 w-8 text-[#093A23] animate-spin" />
                        ) : (
                          <>
                            <ImageIcon className="mx-auto h-8 w-8 text-gray-400 mb-1" />
                            <span className="text-sm font-medium text-[#093A23]">Charger un logo</span>
                          </>
                        )}
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, false)}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAddStore}
                    disabled={!newStore.name || !newStore.address || !newStore.city}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'édition */}
        {editingStore && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Modifier le point de vente
                </h2>
                <button
                  onClick={() => setEditingStore(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nom du point de vente
                  </label>
                  <input
                    type="text"
                    value={editingStore.name}
                    onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={editingStore.address}
                    onChange={(e) => setEditingStore({ ...editingStore, address: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={editingStore.city}
                    onChange={(e) => setEditingStore({ ...editingStore, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={editingStore.phone}
                    onChange={(e) => setEditingStore({ ...editingStore, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Horaires d'ouverture
                  </label>
                  <input
                    type="text"
                    value={editingStore.openingHours}
                    onChange={(e) => setEditingStore({ ...editingStore, openingHours: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                  />
                </div>

                {/* Upload Logo pour édition */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Logo de l'établissement
                  </label>
                  
                  {editingStore.logo_url && (
                    <div className="mb-3 flex items-center gap-3">
                      <img
                        src={editingStore.logo_url}
                        alt="Logo"
                        className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80'
                        }}
                      />
                      <button
                        onClick={() => setEditingStore({ ...editingStore, logo_url: '' })}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}

                  <label className="block">
                    <div className="flex items-center justify-center w-full h-24 px-4 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                      <div className="text-center">
                        {uploadingLogo ? (
                          <Loader2 className="mx-auto h-8 w-8 text-[#093A23] animate-spin" />
                        ) : (
                          <>
                            <ImageIcon className="mx-auto h-8 w-8 text-gray-400 mb-1" />
                            <span className="text-sm font-medium text-[#093A23]">Charger un logo</span>
                          </>
                        )}
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, true)}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setEditingStore(null)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

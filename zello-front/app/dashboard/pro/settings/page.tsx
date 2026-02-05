'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Store, Plus, Edit2, Trash2, CheckCircle, MapPin, Phone, Mail, Image as ImageIcon, X, Save, Building, Loader2, AlertCircle, XCircle, Crown, Zap, Check } from 'lucide-react'

interface StoreData {
  id: string
  name: string
  address?: string
  city?: string
  postal_code?: string
  phone?: string
  email?: string
  logo_url?: string
  siret?: string
  store_type?: string
  created_at: string
}

interface SiretInfo {
  nom: string
  adresse: string
  codePostal: string
  ville: string
  activite?: string
}

interface UserStore {
  store_id: string
  stores: StoreData
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)
  const [stores, setStores] = useState<StoreData[]>([])
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<StoreData | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [siretVerifying, setSiretVerifying] = useState(false)
  const [siretValid, setSiretValid] = useState<boolean | null>(null)
  const [siretInfo, setSiretInfo] = useState<SiretInfo | null>(null)
  const [siretError, setSiretError] = useState<string>('')
  const [sameSirenStores, setSameSirenStores] = useState<StoreData[]>([])
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('free')
  const [formData, setFormData] = useState<Partial<StoreData>>({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
    logo_url: '',
    siret: '',
    store_type: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  // Vérification du SIRET
  const verifySiret = async (siretValue: string) => {
    const siret = siretValue.replace(/\s/g, '')

    if (siret.length === 0) {
      setSiretValid(null)
      setSiretInfo(null)
      setSiretError('')
      setSameSirenStores([])
      return
    }

    if (!/^\d{14}$/.test(siret)) {
      setSiretValid(false)
      setSiretError('Le SIRET doit contenir exactement 14 chiffres')
      setSiretInfo(null)
      setSameSirenStores([])
      return
    }

    setSiretVerifying(true)
    setSiretError('')

    try {
      const response = await fetch(`/api/verify-siret?siret=${siret}`)
      const result = await response.json()

      if (response.ok && result.nom) {
        setSiretValid(true)
        setSiretInfo(result)
        setSiretError('')
        
        // Vérifier si d'autres établissements ont le même SIREN (9 premiers chiffres)
        const siren = siret.substring(0, 9)
        const matchingStores = stores.filter(s => 
          s.siret && s.siret.substring(0, 9) === siren && s.id !== editingStore?.id
        )
        
        if (matchingStores.length > 0) {
          setSameSirenStores(matchingStores)
        } else {
          setSameSirenStores([])
        }
      } else {
        setSiretValid(false)
        setSiretError(result.error || 'SIRET invalide ou établissement non trouvé')
        setSiretInfo(null)
        setSameSirenStores([])
      }
    } catch (error) {
      setSiretValid(false)
      setSiretError('Erreur lors de la vérification du SIRET')
      setSiretInfo(null)
      setSameSirenStores([])
    } finally {
      setSiretVerifying(false)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      // Récupérer l'établissement actif
      const { data: userData } = await supabase
        .from('users')
        .select('active_store_id')
        .eq('id', user.id)
        .single()

      if (userData) {
        setActiveStoreId(userData.active_store_id)
      }

      // Récupérer tous les établissements de l'utilisateur
      console.log('Récupération des établissements pour user:', user.id)
      
      const { data: userStores, error } = await supabase
        .from('user_store')
        .select(`
          store_id,
          stores:stores!user_store_store_id_fkey (
            id,
            name,
            logo_url,
            address_street,
            address_city,
            address_postal_code,
            phone_number,
            store_type,
            registration_id,
            subscription_status,
            created_at
          )
        `)
        .eq('user_id', user.id)

      console.log('Résultat requête user_store:', { userStores, error })

      if (error) {
        console.error('Erreur récupération établissements:', error)
        alert(`Erreur: ${error.message || 'Impossible de charger les établissements'}`)
        setStores([])
        return
      }

      if (!userStores || userStores.length === 0) {
        console.log('Aucun établissement trouvé')
        setStores([])
        return
      }

      const storesList = (userStores || [])
        .map((us: any) => {
          const store = Array.isArray(us.stores) ? us.stores[0] : us.stores
          if (!store) return null
          
          return {
            id: store.id,
            name: store.name,
            logo_url: store.logo_url || '',
            address: store.address_street || '',
            city: store.address_city || '',
            postal_code: store.address_postal_code || '',
            phone: store.phone_number || '',
            email: '',
            store_type: store.store_type || '',
            siret: store.registration_id || '',
            created_at: store.created_at || new Date().toISOString()
          } as StoreData
        })
        .filter((store): store is StoreData => store !== null)

      console.log('Établissements chargés:', storesList)
      setStores(storesList)
      
      // Récupérer le plan d'abonnement de l'établissement actif
      if (userData?.active_store_id) {
        const activeStore = storesList.find(s => s.id === userData.active_store_id)
        if (activeStore && (activeStore as any).subscription_status) {
          setSubscriptionPlan((activeStore as any).subscription_status)
        }
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (store?: StoreData) => {
    if (store) {
      setEditingStore(store)
      setFormData({
        name: store.name,
        address: store.address,
        city: store.city,
        postal_code: store.postal_code,
        phone: store.phone,
        email: store.email,
        store_type: store.store_type,
        logo_url: store.logo_url,
        siret: store.siret
      })
      
      // Vérifier le SIRET existant
      if (store.siret) {
        verifySiret(store.siret)
      }
    } else {
      setEditingStore(null)
      setFormData({
        name: '',
        address: '',
        city: '',
        postal_code: '',
        phone: '',
        email: '',
        store_type: '',
        logo_url: '',
        siret: ''
      })
      setSiretValid(null)
      setSiretInfo(null)
      setSiretError('')
      setSameSirenStores([])
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingStore(null)
    setFormData({
      name: '',
      address: '',
      city: '',
      postal_code: '',
      phone: '',
      store_type: '',
      email: '',
      logo_url: '',
      siret: ''
    })
    setSiretValid(null)
    setSiretInfo(null)
    setSiretError('')
    setSameSirenStores([])
  }
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Mettre à jour le formulaire
      setFormData({ ...formData, logo_url: data.publicUrl })

    } catch (error: any) {
      console.error('Erreur upload:', error)
      alert('Erreur lors de l\'upload: ' + (error.message || 'Erreur inconnue'))
    } finally {
      setUploadingLogo(false)
    }
  }
  const handleSave = async () => {
    if (!formData.name?.trim()) {
      alert('Le nom de l\'établissement est requis')
      return
    }

    // Vérifier le SIRET si fourni
    if (formData.siret && formData.siret.trim()) {
      if (siretValid !== true) {
        alert('Veuillez vérifier que le SIRET est valide avant de continuer')
        return
      }
    }

    try {
      if (editingStore) {
        // Mise à jour
        const { error } = await supabase
          .from('stores')
          .update({
            name: formData.name,
            address_street: formData.address || null,
            address_city: formData.city || null,
            address_postal_code: formData.postal_code || null,
            phone_number: formData.phone || null,
            logo_url: formData.logo_url || null,
            registration_id: formData.siret || null,
            store_type: formData.store_type || null
          })
          .eq('id', editingStore.id)

        if (error) throw error
      } else {
        // Création
        const { data: newStore, error: storeError } = await supabase
          .from('stores')
          .insert({
            name: formData.name,
            address_street: formData.address || null,
            address_city: formData.city || null,
            address_postal_code: formData.postal_code || null,
            phone_number: formData.phone || null,
            logo_url: formData.logo_url || null,
            registration_id: formData.siret || null,
            store_type: formData.store_type || null,
            admin_id: userId
          })
          .select()
          .single()

        if (storeError) throw storeError

        // Lier l'établissement à l'utilisateur
        if (userId && newStore) {
          const { error: linkError } = await supabase
            .from('user_store')
            .insert({
              user_id: userId,
              store_id: newStore.id,
              role: 'admin'
            })

          if (linkError) throw linkError

          // Si c'est le premier établissement, le définir comme actif
          if (stores.length === 0) {
            await setAsActive(newStore.id)
          }
        }
      }

      closeModal()
      await fetchData()
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + (error.message || 'Erreur inconnue'))
    }
  }

  const handleDelete = async (storeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet établissement ?')) return

    try {
      // Supprimer le lien user_store
      const { error: linkError } = await supabase
        .from('user_store')
        .delete()
        .eq('store_id', storeId)
        .eq('user_id', userId)

      if (linkError) throw linkError

      // Note: Ne pas supprimer le store lui-même car d'autres utilisateurs peuvent y être liés
      // Si vous voulez le supprimer complètement, décommentez ci-dessous :
      // const { error } = await supabase.from('stores').delete().eq('id', storeId)
      // if (error) throw error

      await fetchData()

      // Si on supprime l'établissement actif, définir un autre comme actif
      if (storeId === activeStoreId && stores.length > 1) {
        const nextStore = stores.find(s => s.id !== storeId)
        if (nextStore) {
          await setAsActive(nextStore.id)
        }
      }
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + (error.message || 'Erreur inconnue'))
    }
  }

  const handleChangePlan = async (newPlan: string) => {
    if (!activeStoreId) {
      alert('Veuillez sélectionner un établissement actif')
      return
    }

    try {
      const { error } = await supabase
        .from('stores')
        .update({ subscription_status: newPlan })
        .eq('id', activeStoreId)

      if (error) throw error

      setSubscriptionPlan(newPlan)
      await fetchData()
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + (error.message || 'Erreur inconnue'))
    }
  }

  const setAsActive = async (storeId: string) => {
    if (!userId) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ active_store_id: storeId })
        .eq('id', userId)

      if (error) throw error

      setActiveStoreId(storeId)
      window.location.reload() // Recharger pour mettre à jour le header
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + (error.message || 'Erreur inconnue'))
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building className="text-[#093A23]" size={32} />
            Gérer mes établissements
          </h1>
          <p className="text-gray-600 mt-1">Créez et gérez vos points de vente</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvel établissement
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#093A23] to-[#0d5534] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Store size={24} />
            <span className="text-sm opacity-90">Total</span>
          </div>
          <div className="text-3xl font-bold">{stores.length}</div>
          <div className="text-sm opacity-90 mt-1">Établissements</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle size={24} />
            <span className="text-sm opacity-90">Actif</span>
          </div>
          <div className="text-2xl font-bold truncate">
            {stores.find(s => s.id === activeStoreId)?.name || '—'}
          </div>
          <div className="text-sm opacity-90 mt-1">En cours d'utilisation</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <ImageIcon size={24} />
            <span className="text-sm opacity-90">Avec logo</span>
          </div>
          <div className="text-3xl font-bold">
            {stores.filter(s => s.logo_url).length}
          </div>
          <div className="text-sm opacity-90 mt-1">Personnalisés</div>
        </div>
      </div>

      {/* Liste des établissements */}
      {stores.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
          <Store size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">Aucun établissement</p>
          <p className="text-sm text-gray-400 mt-2">Créez votre premier établissement pour commencer</p>
          <button
            onClick={() => openModal()}
            className="mt-6 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white px-6 py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Créer mon établissement
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => (
            <div
              key={store.id}
              className={`bg-white rounded-xl shadow-lg border-2 transition-all hover:shadow-xl ${
                store.id === activeStoreId
                  ? 'border-[#093A23] ring-2 ring-[#093A23] ring-opacity-20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="p-6">
                {/* Header de la carte */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    {store.logo_url ? (
                      <img
                        src={store.logo_url}
                        alt={store.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#093A23] to-[#0d5534] flex items-center justify-center">
                        <Store size={20} className="text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{store.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {store.store_type && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {store.store_type}
                          </span>
                        )}
                        {store.id === activeStoreId && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
                            <CheckCircle size={12} />
                            Actif
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informations */}
                <div className="space-y-2 mb-4">
                  {store.address && (
                    <div className="text-sm text-gray-600 flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 text-gray-400" />
                      <span>
                        {store.address}
                        {(store.postal_code || store.city) && (
                          <><br />{store.postal_code} {store.city}</>
                        )}
                      </span>
                    </div>
                  )}
                  {store.phone && (
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone size={14} className="text-gray-400" />
                      {store.phone}
                    </div>
                  )}
                  {store.email && (
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <Mail size={14} className="text-gray-400" />
                      {store.email}
                    </div>
                  )}
                  {store.siret && (
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <Building size={14} className="text-gray-400" />
                      <span className="font-mono">
                        {store.siret}
                        {stores.filter(s => s.siret && s.siret.substring(0, 9) === store.siret!.substring(0, 9) && s.id !== store.id).length > 0 && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Même entreprise
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {!store.address && !store.phone && !store.email && !store.siret && (
                    <div className="text-sm text-gray-400 italic">
                      Aucune information complémentaire
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  {store.id !== activeStoreId && (
                    <button
                      onClick={() => setAsActive(store.id)}
                      className="flex-1 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md"
                    >
                      Activer
                    </button>
                  )}
                  <button
                    onClick={() => openModal(store)}
                    className="p-2 text-[#093A23] hover:bg-green-50 rounded-lg transition"
                    title="Modifier"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(store.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal création/édition */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {editingStore ? 'Modifier l\'établissement' : 'Nouvel établissement'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Nom de l'établissement *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Mon commerce"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                />
              </div>

              {/* Type d'établissement */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Type d'établissement
                </label>
                <select
                  value={formData.store_type || ''}
                  onChange={(e) => setFormData({ ...formData, store_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                >
                  <option value="">Sélectionnez un type</option>
                  <option value="boulangerie">Boulangerie</option>
                  <option value="épicerie">Épicerie</option>
                  <option value="fromagerie">Fromagerie</option>
                  <option value="boucherie">Boucherie</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="café">Café</option>
                  <option value="primeur">Primeur</option>
                  <option value="traiteur">Traiteur</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              {/* Logo */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Logo de l'établissement
                </label>
                
                {/* Aperçu du logo actuel */}
                {formData.logo_url && (
                  <div className="mb-3 flex items-center gap-3">
                    <img
                      src={formData.logo_url}
                      alt="Logo"
                      className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80'
                      }}
                    />
                    <button
                      onClick={() => setFormData({ ...formData, logo_url: '' })}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Supprimer
                    </button>
                  </div>
                )}

                {/* Upload depuis l'ordinateur */}
                <div className="space-y-2">
                  <label className="block">
                    <div className="flex items-center justify-center w-full h-32 px-4 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                        <div className="text-sm text-gray-600">
                          {uploadingLogo ? (
                            <span className="font-medium text-[#093A23]">Upload en cours...</span>
                          ) : (
                            <>
                              <span className="font-medium text-[#093A23]">Cliquez pour charger</span>
                              <span className="text-gray-500"> ou glissez une image</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF jusqu'à 5MB</p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>

                  {/* OU entrer une URL */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">OU</span>
                    </div>
                  </div>

                  <input
                    type="url"
                    value={formData.logo_url || ''}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="Entrez une URL d'image"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                  />
                </div>
              </div>

              {/* SIRET avec vérification */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  SIRET
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.siret || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData({ ...formData, siret: value })
                      if (value.replace(/\s/g, '').length === 14) {
                        verifySiret(value)
                      } else {
                        setSiretValid(null)
                        setSiretInfo(null)
                        setSiretError('')
                      }
                    }}
                    placeholder="12345678901234"
                    maxLength={14}
                    className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23] ${
                      siretValid === true
                        ? 'border-green-500 bg-green-50'
                        : siretValid === false
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {siretVerifying && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="animate-spin text-gray-400" size={20} />
                    </div>
                  )}
                  {!siretVerifying && siretValid === true && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <CheckCircle className="text-green-600" size={20} />
                    </div>
                  )}
                  {!siretVerifying && siretValid === false && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <XCircle className="text-red-600" size={20} />
                    </div>
                  )}
                </div>
                
                {siretError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {siretError}
                  </p>
                )}

                {siretInfo && siretValid && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-semibold text-green-900 mb-1">✓ Établissement vérifié</p>
                    <p className="text-sm text-green-800">
                      <strong>{siretInfo.nom}</strong><br />
                      {siretInfo.adresse}<br />
                      {siretInfo.codePostal} {siretInfo.ville}
                      {siretInfo.activite && <><br />Activité : {siretInfo.activite}</>}
                    </p>
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          name: formData.name || siretInfo.nom,
                          address: siretInfo.adresse,
                          city: siretInfo.ville,
                          postal_code: siretInfo.codePostal
                        })
                      }}
                      className="mt-2 text-xs text-green-700 hover:text-green-800 font-medium underline"
                    >
                      Remplir automatiquement les champs
                    </button>
                  </div>
                )}

                {sameSirenStores.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <AlertCircle size={16} />
                      Même entreprise détectée
                    </p>
                    <p className="text-sm text-blue-800 mb-2">
                      Ce SIRET appartient à la même entreprise (SIREN) que :
                    </p>
                    <ul className="space-y-1">
                      {sameSirenStores.map(store => (
                        <li key={store.id} className="text-sm text-blue-800 flex items-center gap-2">
                          <Store size={14} />
                          <strong>{store.name}</strong>
                          {store.city && ` - ${store.city}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Adresse
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 rue Example"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Code postal */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={formData.postal_code || ''}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="75001"
                    maxLength={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                  />
                </div>

                {/* Ville */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Paris"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01 23 45 67 89"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
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
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

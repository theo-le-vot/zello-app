'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Gift, Plus, Edit2, Trash2, Eye, EyeOff, ArrowLeft, Save, X, Search } from 'lucide-react'
import Link from 'next/link'

type RewardType = 'cash_discount' | 'free_product' | 'choice_selection' | 'anti_waste_bundle' | 'cart_discount'

interface LoyaltyReward {
  id: string
  store_id: string
  type: RewardType
  name: string
  points_cost: number
  cash_value?: number
  product_id?: string
  selection_id?: string
  anti_waste_min_value?: number
  min_cart_amount?: number
  is_active: boolean
  created_at: string
  product?: {
    name: string
    price: number
  }
}

interface Product {
  id: string
  name: string
  price: number
  category?: string
}

const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  cash_discount: 'Réduction en euros',
  free_product: 'Produit offert',
  choice_selection: 'Choix de produits',
  anti_waste_bundle: 'Panier anti-gaspillage',
  cart_discount: 'Réduction sur le panier'
}

const REWARD_TYPE_COLORS: Record<RewardType, string> = {
  cash_discount: 'bg-green-100 text-green-800',
  free_product: 'bg-teal-100 text-teal-800',
  choice_selection: 'bg-purple-100 text-purple-800',
  anti_waste_bundle: 'bg-orange-100 text-orange-800',
  cart_discount: 'bg-pink-100 text-pink-800'
}

export default function RecompensesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [filteredRewards, setFilteredRewards] = useState<LoyaltyReward[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<RewardType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null)
  const [formData, setFormData] = useState<Partial<LoyaltyReward>>({
    type: 'cash_discount',
    name: '',
    points_cost: 100,
    is_active: true
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterRewards()
  }, [rewards, searchTerm, filterType, filterStatus])

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

      // Récupérer les récompenses
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('loyalty_rewards')
        .select(`
          *,
          product:products(name, price)
        `)
        .eq('store_id', userData.active_store_id)
        .order('created_at', { ascending: false })

      if (rewardsError) throw rewardsError

      setRewards(rewardsData || [])

      // Récupérer les produits pour le formulaire
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, category')
        .eq('store_id', userData.active_store_id)
        .eq('available', true)
        .order('name')

      if (productsError) throw productsError

      setProducts(productsData || [])
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterRewards = () => {
    let filtered = [...rewards]

    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.type === filterType)
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => 
        filterStatus === 'active' ? r.is_active : !r.is_active
      )
    }

    setFilteredRewards(filtered)
  }

  const openModal = (reward?: LoyaltyReward) => {
    if (reward) {
      setEditingReward(reward)
      setFormData(reward)
    } else {
      setEditingReward(null)
      setFormData({
        type: 'cash_discount',
        name: '',
        points_cost: 100,
        is_active: true
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingReward(null)
    setFormData({
      type: 'cash_discount',
      name: '',
      points_cost: 100,
      is_active: true
    })
  }

  const handleSave = async () => {
    if (!storeId || !formData.name || !formData.points_cost) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    // Validation selon le type
    if (formData.type === 'cash_discount' && !formData.cash_value) {
      alert('Veuillez spécifier la valeur de la réduction')
      return
    }

    if (formData.type === 'free_product' && !formData.product_id) {
      alert('Veuillez sélectionner un produit')
      return
    }

    if (formData.type === 'anti_waste_bundle' && !formData.anti_waste_min_value) {
      alert('Veuillez spécifier la valeur minimum du panier anti-gaspi')
      return
    }

    if (formData.type === 'cart_discount' && (!formData.min_cart_amount || !formData.cash_value)) {
      alert('Veuillez spécifier le montant minimum du panier et la réduction')
      return
    }

    try {
      const dataToSave: any = {
        store_id: storeId,
        type: formData.type,
        name: formData.name,
        points_cost: formData.points_cost,
        is_active: formData.is_active ?? true
      }

      // Ajouter les champs optionnels seulement s'ils sont définis
      if (formData.cash_value !== undefined && formData.cash_value !== null) {
        dataToSave.cash_value = formData.cash_value
      }
      if (formData.product_id) {
        dataToSave.product_id = formData.product_id
      }
      if (formData.selection_id) {
        dataToSave.selection_id = formData.selection_id
      }
      if (formData.anti_waste_min_value !== undefined && formData.anti_waste_min_value !== null) {
        dataToSave.anti_waste_min_value = formData.anti_waste_min_value
      }
      if (formData.min_cart_amount !== undefined && formData.min_cart_amount !== null) {
        dataToSave.min_cart_amount = formData.min_cart_amount
      }

      let error: any

      if (editingReward) {
        const result = await supabase
          .from('loyalty_rewards')
          .update(dataToSave)
          .eq('id', editingReward.id)

        error = result.error
      } else {
        const result = await supabase
          .from('loyalty_rewards')
          .insert(dataToSave)

        error = result.error
      }

      if (error) {
        console.error('Erreur détaillée:', error)
        throw new Error(error.message || 'Erreur lors de la sauvegarde')
      }

      await fetchData()
      closeModal()
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err)
      alert(`Erreur lors de la sauvegarde: ${err.message || 'Erreur inconnue'}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette récompense ?')) return

    try {
      const { error } = await supabase
        .from('loyalty_rewards')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchData()
    } catch (err) {
      console.error('Erreur suppression:', err)
      alert('Erreur lors de la suppression')
    }
  }

  const toggleActive = async (reward: LoyaltyReward) => {
    try {
      const { error } = await supabase
        .from('loyalty_rewards')
        .update({ is_active: !reward.is_active })
        .eq('id', reward.id)

      if (error) throw error

      await fetchData()
    } catch (err) {
      console.error('Erreur:', err)
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
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href="/dashboard/pro/fidelisation"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Gift className="text-pink-500" size={32} />
              Gestion des récompenses
            </h1>
          </div>
          <p className="text-gray-600 ml-14">Créez et gérez les récompenses de votre programme de fidélité</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white rounded-lg transition shadow-md hover:shadow-lg"
        >
          <Plus size={18} />
          Nouvelle récompense
        </button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600">Total récompenses</div>
          <div className="text-2xl font-bold text-gray-900">{rewards.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600">Actives</div>
          <div className="text-2xl font-bold text-green-600">
            {rewards.filter(r => r.is_active).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600">Inactives</div>
          <div className="text-2xl font-bold text-gray-400">
            {rewards.filter(r => !r.is_active).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600">Points min</div>
          <div className="text-2xl font-bold text-[#093A23]">
            {rewards.length > 0 ? Math.min(...rewards.map(r => r.points_cost)) : 0}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher une récompense..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
            />
          </div>

          {/* Filtre par type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as RewardType | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
          >
            <option value="all">Tous les types</option>
            {Object.entries(REWARD_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Filtre par statut */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actives uniquement</option>
            <option value="inactive">Inactives uniquement</option>
          </select>
        </div>
      </div>

      {/* Liste des récompenses */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {filteredRewards.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Gift size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Aucune récompense trouvée</p>
            <p className="text-sm mt-2">Créez votre première récompense pour commencer</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Coût (points)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Valeur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRewards.map((reward) => (
                  <tr key={reward.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{reward.name}</div>
                      {reward.product && (
                        <div className="text-sm text-gray-500">{reward.product.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${REWARD_TYPE_COLORS[reward.type]}`}>
                        {REWARD_TYPE_LABELS[reward.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#093A23] font-semibold">{reward.points_cost} pts</span>
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {reward.cash_value && `${reward.cash_value}€`}
                      {reward.product && `${reward.product.price}€`}
                      {reward.min_cart_amount && `Panier ≥ ${reward.min_cart_amount}€`}
                      {reward.anti_waste_min_value && `≥ ${reward.anti_waste_min_value}€`}
                      {!reward.cash_value && !reward.product && !reward.min_cart_amount && !reward.anti_waste_min_value && '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(reward)}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full transition ${
                          reward.is_active 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {reward.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                        {reward.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(reward)}
                          className="p-2 text-[#093A23] hover:bg-green-50 rounded-lg transition"
                          title="Modifier"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(reward.id)}
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
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingReward ? 'Modifier la récompense' : 'Nouvelle récompense'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Type de récompense */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Type de récompense *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as RewardType })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                >
                  {Object.entries(REWARD_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Nom de la récompense *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: 5€ de réduction, Café offert..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                />
              </div>

              {/* Coût en points */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Coût en points *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.points_cost || ''}
                  onChange={(e) => setFormData({ ...formData, points_cost: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                />
              </div>

              {/* Champs spécifiques selon le type */}
              {formData.type === 'cash_discount' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Valeur de la réduction (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cash_value || ''}
                    onChange={(e) => setFormData({ ...formData, cash_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                  />
                </div>
              )}

              {formData.type === 'free_product' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Produit offert
                  </label>
                  <select
                    value={formData.product_id || ''}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                  >
                    <option value="">Sélectionner un produit</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {product.price}€
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.type === 'anti_waste_bundle' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Valeur minimum du panier anti-gaspillage (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.anti_waste_min_value || ''}
                    onChange={(e) => setFormData({ ...formData, anti_waste_min_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Le client peut récupérer un panier de produits invendus d'une valeur minimale de ce montant
                  </p>
                </div>
              )}

              {formData.type === 'choice_selection' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Configuration de la sélection
                  </label>
                  <p className="text-sm text-gray-500 mb-2">
                    Le client pourra choisir parmi une sélection de produits. La configuration détaillée se fait via la table loyalty_reward_selection_items.
                  </p>
                  <input
                    type="text"
                    placeholder="ID de sélection (optionnel)"
                    value={formData.selection_id || ''}
                    onChange={(e) => setFormData({ ...formData, selection_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                  />
                </div>
              )}

              {formData.type === 'cart_discount' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Montant minimum du panier (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.min_cart_amount || ''}
                    onChange={(e) => setFormData({ ...formData, min_cart_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                  />
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Valeur de la réduction (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cash_value || ''}
                      onChange={(e) => setFormData({ ...formData, cash_value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    La réduction sera appliquée si le panier atteint le montant minimum
                  </p>
                </div>
              )}

              {/* Statut */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="font-semibold text-gray-900">Récompense active</label>
                  <p className="text-sm text-gray-600">Les clients pourront échanger cette récompense</p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    formData.is_active ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      formData.is_active ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
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
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

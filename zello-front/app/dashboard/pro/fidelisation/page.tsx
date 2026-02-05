'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Heart, Settings, Gift, TrendingUp, Users, Star, Save, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface LoyaltySettings {
  store_id: string
  is_enabled: boolean
  points_per_euro: number
  rounding: 'floor' | 'ceil' | 'round'
  max_points_per_tx?: number
}

interface LoyaltyStats {
  totalCustomers: number
  activeCustomers: number
  totalPoints: number
  averagePoints: number
  totalRewards: number
  activeRewards: number
}

export default function FidelisationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [storeId, setStoreId] = useState<string | null>(null)
  
  const [settings, setSettings] = useState<LoyaltySettings>({
    store_id: '',
    is_enabled: false,
    points_per_euro: 1,
    rounding: 'floor',
    max_points_per_tx: undefined
  })

  const [stats, setStats] = useState<LoyaltyStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalPoints: 0,
    averagePoints: 0,
    totalRewards: 0,
    activeRewards: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Récupérer l'utilisateur et son store actif
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
        console.error('Aucun store actif')
        return
      }

      setStoreId(userData.active_store_id)

      // Récupérer les paramètres de fidélisation
      const { data: loyaltySettings, error: settingsError } = await supabase
        .from('loyalty_settings')
        .select('*')
        .eq('store_id', userData.active_store_id)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Erreur récupération settings:', settingsError)
      }

      if (loyaltySettings) {
        setSettings(loyaltySettings)
      } else {
        // Créer des paramètres par défaut
        setSettings({
          store_id: userData.active_store_id,
          is_enabled: false,
          points_per_euro: 1,
          rounding: 'floor',
          max_points_per_tx: undefined
        })
      }

      // Récupérer les statistiques
      await fetchStats(userData.active_store_id)
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (storeId: string) => {
    try {
      // Nombre total de clients
      const { count: totalCustomers } = await supabase
        .from('customers_stores')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)

      // Clients actifs (avec des points ou ayant visité récemment)
      const { count: activeCustomers } = await supabase
        .from('customers_stores')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .gt('points', 0)

      // Total des points en circulation
      const { data: pointsData } = await supabase
        .from('customers_stores')
        .select('points')
        .eq('store_id', storeId)

      const totalPoints = pointsData?.reduce((sum, c) => sum + (c.points || 0), 0) || 0
      const averagePoints = totalCustomers ? Math.round(totalPoints / totalCustomers) : 0

      // Nombre de récompenses
      const { count: totalRewards } = await supabase
        .from('loyalty_rewards')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)

      const { count: activeRewards } = await supabase
        .from('loyalty_rewards')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('is_active', true)

      setStats({
        totalCustomers: totalCustomers || 0,
        activeCustomers: activeCustomers || 0,
        totalPoints,
        averagePoints,
        totalRewards: totalRewards || 0,
        activeRewards: activeRewards || 0
      })
    } catch (err) {
      console.error('Erreur récupération stats:', err)
    }
  }

  const handleSave = async () => {
    if (!storeId) return

    setSaving(true)
    setSaveMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Vérifier si les settings existent
      const { data: existing } = await supabase
        .from('loyalty_settings')
        .select('store_id')
        .eq('store_id', storeId)
        .single()

      let error

      if (existing) {
        // Mise à jour
        const { error: updateError } = await supabase
          .from('loyalty_settings')
          .update({
            is_enabled: settings.is_enabled,
            points_per_euro: settings.points_per_euro,
            rounding: settings.rounding,
            max_points_per_tx: settings.max_points_per_tx || null,
            updated_at: new Date().toISOString(),
            updated_by: user.id
          })
          .eq('store_id', storeId)

        error = updateError
      } else {
        // Création
        const { error: insertError } = await supabase
          .from('loyalty_settings')
          .insert({
            store_id: storeId,
            is_enabled: settings.is_enabled,
            points_per_euro: settings.points_per_euro,
            rounding: settings.rounding,
            max_points_per_tx: settings.max_points_per_tx || null,
            updated_by: user.id
          })

        error = insertError
      }

      if (error) throw error

      setSaveMessage({ type: 'success', text: 'Paramètres enregistrés avec succès' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      console.error('Erreur sauvegarde:', err)
      setSaveMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' })
    } finally {
      setSaving(false)
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Heart className="text-pink-500" size={32} />
            Programme de fidélisation
          </h1>
          <p className="text-gray-600 mt-1">Configurez et gérez votre programme de fidélité</p>
        </div>
        <Link
          href="/dashboard/pro/fidelisation/recompenses"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white rounded-lg transition shadow-md hover:shadow-lg"
        >
          <Gift size={18} />
          Gérer les récompenses
        </Link>
      </div>

      {/* Message de sauvegarde */}
      {saveMessage && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          saveMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {saveMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {saveMessage.text}
        </div>
      )}

      {/* Statistiques en un coup d'œil */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#093A23] to-[#0d5534] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Users size={24} />
            <span className="text-sm opacity-90">Clients</span>
          </div>
          <div className="text-3xl font-bold">{stats.totalCustomers}</div>
          <div className="text-sm opacity-90 mt-1">
            {stats.activeCustomers} avec des points
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Star size={24} />
            <span className="text-sm opacity-90">Points en circulation</span>
          </div>
          <div className="text-3xl font-bold">{stats.totalPoints.toLocaleString()}</div>
          <div className="text-sm opacity-90 mt-1">
            Moyenne : {stats.averagePoints} pts/client
          </div>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Gift size={24} />
            <span className="text-sm opacity-90">Récompenses</span>
          </div>
          <div className="text-3xl font-bold">{stats.totalRewards}</div>
          <div className="text-sm opacity-90 mt-1">
            {stats.activeRewards} actives
          </div>
        </div>
      </div>

      {/* Configuration principale */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="text-gray-700" size={24} />
          <h2 className="text-xl font-bold text-gray-900">Configuration du programme</h2>
        </div>

        <div className="space-y-6">
          {/* Activation du programme */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <label className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                Programme de fidélisation
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Activez pour permettre à vos clients de cumuler des points et obtenir des récompenses
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, is_enabled: !settings.is_enabled })}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                settings.is_enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  settings.is_enabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Points par euro */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Points par euro dépensé
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={settings.points_per_euro}
                onChange={(e) => setSettings({ ...settings, points_per_euro: parseFloat(e.target.value) || 1 })}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                disabled={!settings.is_enabled}
              />
              <span className="text-gray-600">
                Exemple : Un achat de 10€ = {(10 * settings.points_per_euro).toFixed(1)} points
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Définit combien de points sont accordés pour chaque euro dépensé
            </p>
          </div>

          {/* Méthode d'arrondissement */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Méthode d'arrondissement
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setSettings({ ...settings, rounding: 'floor' })}
                disabled={!settings.is_enabled}
                className={`p-4 border-2 rounded-lg transition ${
                  settings.rounding === 'floor'
                    ? 'border-[#093A23] bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!settings.is_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-semibold text-gray-900">Arrondir à l'inférieur</div>
                <div className="text-sm text-gray-600 mt-1">12.7 pts → 12 pts</div>
              </button>
              <button
                onClick={() => setSettings({ ...settings, rounding: 'round' })}
                disabled={!settings.is_enabled}
                className={`p-4 border-2 rounded-lg transition ${
                  settings.rounding === 'round'
                    ? 'border-[#093A23] bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!settings.is_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-semibold text-gray-900">Arrondir au plus proche</div>
                <div className="text-sm text-gray-600 mt-1">12.7 pts → 13 pts</div>
              </button>
              <button
                onClick={() => setSettings({ ...settings, rounding: 'ceil' })}
                disabled={!settings.is_enabled}
                className={`p-4 border-2 rounded-lg transition ${
                  settings.rounding === 'ceil'
                    ? 'border-[#093A23] bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!settings.is_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-semibold text-gray-900">Arrondir au supérieur</div>
                <div className="text-sm text-gray-600 mt-1">12.3 pts → 13 pts</div>
              </button>
            </div>
          </div>

          {/* Points maximum par transaction */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Points maximum par transaction (optionnel)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Aucune limite"
                value={settings.max_points_per_tx || ''}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  max_points_per_tx: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                disabled={!settings.is_enabled}
              />
              <span className="text-gray-600">
                Limitez le nombre de points gagnables en une seule transaction
              </span>
            </div>
          </div>
        </div>

        {/* Bouton de sauvegarde */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-4">
          <button
            onClick={fetchData}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white rounded-lg transition disabled:opacity-50 shadow-md hover:shadow-lg"
          >
            <Save size={18} />
            {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </button>
        </div>
      </div>

      {/* Conseils et bonnes pratiques */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <TrendingUp className="text-[#093A23] mt-1" size={24} />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Conseils pour un programme réussi</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• <strong>Simplicité :</strong> Un système simple (1 point par euro) est plus facile à comprendre pour vos clients</li>
              <li>• <strong>Récompenses attractives :</strong> Créez des récompenses atteignables rapidement pour maintenir l'engagement</li>
              <li>• <strong>Communication :</strong> Informez vos clients de leur solde de points régulièrement</li>
              <li>• <strong>Évolution :</strong> Analysez les statistiques et ajustez votre programme selon les résultats</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

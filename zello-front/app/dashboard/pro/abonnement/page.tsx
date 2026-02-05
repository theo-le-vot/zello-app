'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Crown, Zap, Check, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AbonnementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('free')
  const [storeName, setStoreName] = useState<string>('')

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      // Récupérer l'établissement actif et son abonnement
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('active_store_id')
        .eq('id', user.id)
        .single()

      if (userError) throw userError

      const activeId = userData?.active_store_id
      setActiveStoreId(activeId)

      if (activeId) {
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('name, subscription_status')
          .eq('id', activeId)
          .single()

        if (storeError) throw storeError

        setStoreName(storeData?.name || '')
        setSubscriptionPlan(storeData?.subscription_status || 'free')
      }

      setLoading(false)
    } catch (error: any) {
      console.error('Erreur:', error)
      setLoading(false)
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
      alert('Abonnement modifié avec succès !')
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + (error.message || 'Erreur inconnue'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#093A23] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/pro/settings"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-[#093A23] transition mb-4"
          >
            <ArrowLeft size={20} />
            <span>Retour aux paramètres</span>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Crown className="text-[#093A23]" size={36} />
                Mon Abonnement
              </h1>
              <p className="text-gray-600 mt-2">Gérez votre formule d'abonnement</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Établissement</div>
              <div className="text-xl font-bold text-[#093A23]">{storeName}</div>
              <div className="text-sm text-gray-600 mt-1">
                Plan: <span className="font-semibold capitalize">{subscriptionPlan}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plans d'abonnement */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan Gratuit */}
          <div className={`relative rounded-xl border-2 p-8 transition-all ${
            subscriptionPlan === 'free'
              ? 'border-[#093A23] bg-green-50 shadow-xl scale-105'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}>
            {subscriptionPlan === 'free' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-[#093A23] text-white text-xs px-4 py-1.5 rounded-full font-semibold flex items-center gap-1">
                  <Check size={14} />
                  Plan Actuel
                </span>
              </div>
            )}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Gratuit</h3>
              <div className="mt-4">
                <span className="text-5xl font-bold text-gray-900">0€</span>
                <span className="text-gray-600 text-lg">/mois</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">Pour débuter</p>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-gray-700">
                <Check size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>1 établissement</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <Check size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Gestion clients basique</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <Check size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Programme fidélité simple</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400">
                <X size={20} className="mt-0.5 flex-shrink-0" />
                <span>Analyses avancées</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400">
                <X size={20} className="mt-0.5 flex-shrink-0" />
                <span>Campagnes marketing</span>
              </li>
            </ul>
            {subscriptionPlan !== 'free' && (
              <button
                onClick={() => handleChangePlan('free')}
                className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Passer à Gratuit
              </button>
            )}
            {subscriptionPlan === 'free' && (
              <div className="text-center text-sm text-gray-600 font-medium py-3">
                Votre plan actuel
              </div>
            )}
          </div>

          {/* Plan Starter */}
          <div className={`relative rounded-xl border-2 p-8 transition-all ${
            subscriptionPlan === 'starter'
              ? 'border-[#093A23] bg-green-50 shadow-xl scale-105'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}>
            {subscriptionPlan === 'starter' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-[#093A23] text-white text-xs px-4 py-1.5 rounded-full font-semibold flex items-center gap-1">
                  <Check size={14} />
                  Plan Actuel
                </span>
              </div>
            )}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Starter</h3>
              <div className="mt-4">
                <span className="text-5xl font-bold text-gray-900">29€</span>
                <span className="text-gray-600 text-lg">/mois</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">Pour les professionnels</p>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-gray-700">
                <Check size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>3 établissements</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <Check size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Gestion clients avancée</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <Check size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Analyses & statistiques</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <Check size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Campagnes marketing</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <Check size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Support email prioritaire</span>
              </li>
            </ul>
            <button
              onClick={() => handleChangePlan('starter')}
              disabled={subscriptionPlan === 'starter'}
              className={`w-full py-3 rounded-lg font-semibold transition ${
                subscriptionPlan === 'starter'
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white shadow-md hover:shadow-lg'
              }`}
            >
              {subscriptionPlan === 'starter' ? 'Plan actuel' : 'Passer à Starter'}
            </button>
          </div>

          {/* Plan Premium */}
          <div className={`relative rounded-xl border-2 p-8 transition-all ${
            subscriptionPlan === 'premium'
              ? 'border-amber-500 bg-amber-50 shadow-xl scale-105'
              : 'border-amber-200 hover:border-amber-300 bg-white'
          }`}>
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className={`text-white text-xs px-4 py-1.5 rounded-full font-semibold flex items-center gap-1 ${
                subscriptionPlan === 'premium'
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500'
              }`}>
                {subscriptionPlan === 'premium' ? (
                  <>
                    <Check size={14} />
                    Plan Actuel
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    Populaire
                  </>
                )}
              </span>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Premium</h3>
              <div className="mt-4">
                <span className="text-5xl font-bold text-gray-900">79€</span>
                <span className="text-gray-600 text-lg">/mois</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">Pour les experts</p>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-gray-700">
                <Check size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <span><strong>Établissements illimités</strong></span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <Check size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <span>Toutes les fonctionnalités</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <Check size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <span>Analyses prédictives IA</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <Check size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <span>Support prioritaire 24/7</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <Check size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <span>Formation personnalisée</span>
              </li>
            </ul>
            <button
              onClick={() => handleChangePlan('premium')}
              disabled={subscriptionPlan === 'premium'}
              className={`w-full py-3 rounded-lg font-semibold transition ${
                subscriptionPlan === 'premium'
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {subscriptionPlan === 'premium' ? 'Plan actuel' : 'Passer à Premium'}
            </button>
          </div>
        </div>

        {/* Informations complémentaires */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Bon à savoir</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Vous pouvez changer de plan à tout moment</li>
            <li>• Aucun engagement, résiliez quand vous voulez</li>
            <li>• Le changement de plan est effectif immédiatement</li>
            <li>• Toutes les données sont conservées lors du changement</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

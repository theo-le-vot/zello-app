'use client'

import { useState, useEffect } from 'react'
import HeaderPro from '@/components/HeaderPro'
import { supabase } from '@/lib/supabaseClient'
import { 
  Plug, 
  Check, 
  X, 
  ExternalLink, 
  RefreshCw,
  AlertCircle,
  Settings,
  Link as LinkIcon,
  Zap,
  ShoppingCart
} from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  logo: string
  category: string
  status: 'available' | 'connected' | 'coming_soon'
  api_key?: string
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'square',
      name: 'Square',
      description: 'Système de caisse et paiement complet',
      logo: '🔲',
      category: 'Caisse',
      status: 'available'
    },
    {
      id: 'sumup',
      name: 'SumUp',
      description: 'Terminal de paiement mobile',
      logo: '💳',
      category: 'Caisse',
      status: 'available'
    },
    {
      id: 'shopify',
      name: 'Shopify',
      description: 'Plateforme e-commerce',
      logo: '🛍️',
      category: 'E-commerce',
      status: 'coming_soon'
    },
    {
      id: 'woocommerce',
      name: 'WooCommerce',
      description: 'Extension e-commerce WordPress',
      logo: '🛒',
      category: 'E-commerce',
      status: 'coming_soon'
    },
    {
      id: 'lightspeed',
      name: 'Lightspeed',
      description: 'Solution de point de vente',
      logo: '⚡',
      category: 'Caisse',
      status: 'available'
    },
    {
      id: 'izettle',
      name: 'iZettle',
      description: 'Système de paiement mobile',
      logo: '📱',
      category: 'Caisse',
      status: 'available'
    }
  ])

  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration)
    setShowConfigModal(true)
    setWebhookUrl(`https://api.zello.fr/webhook/${integration.id}`)
  }

  const handleSaveIntegration = async () => {
    if (!selectedIntegration) return

    setSyncStatus('syncing')
    
    // Simuler la sauvegarde
    setTimeout(() => {
      const updatedIntegrations = integrations.map(int => 
        int.id === selectedIntegration.id 
          ? { ...int, status: 'connected' as const, api_key: apiKey }
          : int
      )
      setIntegrations(updatedIntegrations)
      setSyncStatus('success')
      setTimeout(() => {
        setShowConfigModal(false)
        setSyncStatus('idle')
        setApiKey('')
      }, 1500)
    }, 2000)
  }

  const handleDisconnect = (integrationId: string) => {
    const updatedIntegrations = integrations.map(int => 
      int.id === integrationId 
        ? { ...int, status: 'available' as const, api_key: undefined }
        : int
    )
    setIntegrations(updatedIntegrations)
  }

  const handleSync = async () => {
    setSyncStatus('syncing')
    
    // Simuler la synchronisation
    setTimeout(() => {
      setSyncStatus('success')
      setTimeout(() => setSyncStatus('idle'), 2000)
    }, 2000)
  }

  return (
    <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Intégrations
          </h1>
          <p className="text-gray-600">
            Connectez Zello à vos systèmes de caisse et outils existants
          </p>
        </div>

        {/* Statistiques de synchronisation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Intégrations actives</span>
              <Plug className="text-green-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {integrations.filter(i => i.status === 'connected').length}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Dernière synchro</span>
              <RefreshCw className="text-blue-600" size={20} />
            </div>
            <div className="text-xl font-bold text-gray-900">
              Il y a 2 min
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Ventes synchronisées</span>
              <ShoppingCart className="text-purple-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              1,247
            </div>
          </div>
        </div>

        {/* Bouton de synchronisation manuelle */}
        <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Synchronisation automatique
              </h3>
              <p className="text-sm text-gray-600">
                Les ventes sont synchronisées en temps réel depuis vos systèmes connectés
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncStatus === 'syncing'}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={20} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
              {syncStatus === 'syncing' ? 'Synchronisation...' : 'Synchroniser'}
            </button>
          </div>
          {syncStatus === 'success' && (
            <div className="mt-4 flex items-center gap-2 text-green-700">
              <Check size={20} />
              <span className="font-medium">Synchronisation réussie !</span>
            </div>
          )}
        </div>

        {/* Liste des intégrations */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Systèmes de caisse disponibles
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-green-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-5xl">{integration.logo}</div>
                <div className="flex items-center gap-2">
                  {integration.status === 'connected' && (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Check size={14} />
                      Connecté
                    </span>
                  )}
                  {integration.status === 'coming_soon' && (
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
                      Bientôt
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {integration.name}
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                {integration.description}
              </p>

              <div className="flex gap-2">
                {integration.status === 'available' && (
                  <button
                    onClick={() => handleConnect(integration)}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plug size={16} />
                    Connecter
                  </button>
                )}
                {integration.status === 'connected' && (
                  <>
                    <button
                      onClick={() => handleConnect(integration)}
                      className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <Settings size={16} />
                      Configurer
                    </button>
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-semibold hover:bg-red-200 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
                {integration.status === 'coming_soon' && (
                  <button
                    disabled
                    className="flex-1 bg-gray-100 text-gray-400 px-4 py-2 rounded-lg font-semibold cursor-not-allowed"
                  >
                    Bientôt disponible
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Intégration personnalisée */}
        <div className="mt-8 bg-gradient-to-br from-purple-50 to-white p-8 rounded-xl border-2 border-purple-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Intégration personnalisée
              </h3>
              <p className="text-gray-600 mb-4">
                Vous utilisez un système de caisse qui n'est pas listé ? Contactez-nous pour créer une intégration sur mesure.
              </p>
              <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                Demander une intégration
              </button>
            </div>
          </div>
        </div>

        {/* Modal de configuration */}
        {showConfigModal && selectedIntegration && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Configurer {selectedIntegration.name}
                </h2>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">Instructions</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Connectez-vous à votre compte {selectedIntegration.name}</li>
                        <li>Accédez aux paramètres API</li>
                        <li>Générez une nouvelle clé API</li>
                        <li>Copiez la clé et collez-la ci-dessous</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Clé API
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk_live_..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                  />
                </div>

                {/* Webhook URL */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    URL du Webhook
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={webhookUrl}
                      readOnly
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(webhookUrl)}
                      className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                    >
                      Copier
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Ajoutez cette URL dans les paramètres webhook de {selectedIntegration.name}
                  </p>
                </div>

                {/* Paramètres de synchronisation */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Synchroniser
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Ventes et transactions</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Informations clients</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Inventaire produits</span>
                    </label>
                  </div>
                </div>

                {/* Status de synchronisation */}
                {syncStatus === 'syncing' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="text-blue-600 animate-spin" size={20} />
                      <span className="text-blue-900 font-medium">
                        Configuration en cours...
                      </span>
                    </div>
                  </div>
                )}

                {syncStatus === 'success' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Check className="text-green-600" size={20} />
                      <span className="text-green-900 font-medium">
                        Connexion établie avec succès !
                      </span>
                    </div>
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowConfigModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveIntegration}
                    disabled={!apiKey || syncStatus === 'syncing'}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedIntegration.status === 'connected' ? 'Mettre à jour' : 'Connecter'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

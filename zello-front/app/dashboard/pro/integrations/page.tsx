'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useStore } from '@/lib/contexts/StoreContext'
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
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Package
} from 'lucide-react'

interface Integration {
  id: string
  provider: string
  name: string
  description: string
  logo: string
  category: string
  status: 'available' | 'connected' | 'coming_soon'
  access_token?: string
  location_id?: string
  merchant_name?: string
  last_sync_at?: string
}

interface SyncLog {
  id: string
  sync_type: string
  status: string
  transactions_synced: number
  created_at: string
  error_message?: string
}

export default function IntegrationsPage() {
  const { activeStoreId, refreshTrigger } = useStore()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [availableIntegrations] = useState([
    {
      provider: 'square',
      name: 'Square',
      description: 'Système de caisse et paiement complet',
      logo: '🔲',
      category: 'Caisse'
    },
    {
      provider: 'sumup',
      name: 'SumUp',
      description: 'Terminal de paiement mobile',
      logo: '💳',
      category: 'Caisse'
    },
    {
      provider: 'lightspeed',
      name: 'Lightspeed',
      description: 'Solution de point de vente',
      logo: '⚡',
      category: 'Caisse'
    }
  ])

  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [accessToken, setAccessToken] = useState('')
  const [locationId, setLocationId] = useState('')
  const [locations, setLocations] = useState<any[]>([])
  const [merchantInfo, setMerchantInfo] = useState<any>(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'testing' | 'syncing' | 'success' | 'error'>('idle')
  const [syncMessage, setSyncMessage] = useState('')
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [totalSynced, setTotalSynced] = useState(0)

  // Charger les intégrations depuis Supabase
  useEffect(() => {
    fetchIntegrations()
    fetchSyncLogs()
  }, [activeStoreId, refreshTrigger])

  const fetchIntegrations = async () => {
    if (!activeStoreId) return

    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('store_id', activeStoreId)

    if (error) {
      console.error('Erreur chargement intégrations:', error)
      return
    }

    // Merger avec les intégrations disponibles
    const mergedIntegrations = availableIntegrations.map(available => {
      const connected = data?.find(d => d.provider === available.provider)
      return {
        id: connected?.id || available.provider,
        provider: available.provider,
        name: available.name,
        description: available.description,
        logo: available.logo,
        category: available.category,
        status: connected ? 'connected' as const : 'available' as const,
        access_token: connected?.access_token,
        location_id: connected?.location_id,
        merchant_name: connected?.merchant_name,
        last_sync_at: connected?.last_sync_at
      }
    })

    setIntegrations(mergedIntegrations)

    // Calculer le total synchronisé
    const total = data?.reduce((sum, int) => sum + (int.sync_count || 0), 0) || 0
    setTotalSynced(total)
  }

  const fetchSyncLogs = async () => {
    if (!activeStoreId) return

    const { data: integrationsData } = await supabase
      .from('integrations')
      .select('id')
      .eq('store_id', activeStoreId)

    if (!integrationsData || integrationsData.length === 0) return

    const integrationIds = integrationsData.map(i => i.id)

    const { data: logs } = await supabase
      .from('integration_sync_logs')
      .select('*')
      .in('integration_id', integrationIds)
      .order('created_at', { ascending: false })
      .limit(10)

    if (logs) {
      setSyncLogs(logs)
    }
  }

  const handleConnect = async (integration: Integration) => {
    setSelectedIntegration(integration)
    setShowConfigModal(true)
    setAccessToken(integration.access_token || '')
    setLocationId(integration.location_id || '')
    setLocations([])
    setMerchantInfo(null)
    setSyncStatus('idle')
    setSyncMessage('')
  }

  const handleTestConnection = async () => {
    if (!accessToken || selectedIntegration?.provider !== 'square') return

    setSyncStatus('testing')
    setSyncMessage('Test de connexion...')

    try {
      const response = await fetch('/api/integrations/square/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken })
      })

      const data = await response.json()

      if (data.success) {
        setMerchantInfo(data.merchant)
        setLocations(data.locations)
        setSyncStatus('success')
        setSyncMessage('✅ Connexion réussie !')
        
        // Auto-sélectionner la première location si une seule
        if (data.locations.length === 1) {
          setLocationId(data.locations[0].id)
        }
      } else {
        setSyncStatus('error')
        setSyncMessage('❌ ' + (data.error || 'Erreur de connexion'))
      }
    } catch (error: any) {
      setSyncStatus('error')
      setSyncMessage('❌ Erreur: ' + error.message)
    }
  }

  const handleSaveIntegration = async () => {
    if (!selectedIntegration || !activeStoreId || !accessToken) return
    if (selectedIntegration.provider === 'square' && !locationId) {
      setSyncMessage('⚠️ Veuillez sélectionner un point de vente')
      return
    }

    setSyncStatus('syncing')
    setSyncMessage('Enregistrement...')

    try {
      // Sauvegarder ou mettre à jour l'intégration
      const integrationData = {
        store_id: activeStoreId,
        provider: selectedIntegration.provider,
        status: 'connected',
        access_token: accessToken,
        location_id: locationId,
        merchant_name: merchantInfo?.business_name,
        merchant_id: merchantInfo?.id,
        sync_enabled: true,
        sync_transactions: true,
        sync_products: true,
        sync_customers: true
      }

      const { error } = await supabase
        .from('integrations')
        .upsert(integrationData, {
          onConflict: 'store_id,provider'
        })

      if (error) {
        throw new Error(error.message)
      }

      setSyncStatus('success')
      setSyncMessage('✅ Intégration enregistrée !')
      
      setTimeout(() => {
        setShowConfigModal(false)
        fetchIntegrations()
        setSyncStatus('idle')
      }, 1500)

    } catch (error: any) {
      setSyncStatus('error')
      setSyncMessage('❌ Erreur: ' + error.message)
    }
  }

  const handleDisconnect = async (integration: Integration) => {
    if (!activeStoreId || !confirm('Voulez-vous vraiment déconnecter cette intégration ?')) return

    try {
      await supabase
        .from('integrations')
        .delete()
        .eq('store_id', activeStoreId)
        .eq('provider', integration.provider)

      fetchIntegrations()
    } catch (error) {
      console.error('Erreur déconnexion:', error)
    }
  }

  const handleSync = async (integration: Integration) => {
    if (!activeStoreId || !integration.access_token) return

    setSyncStatus('syncing')
    setSyncMessage('Synchronisation en cours...')

    try {
      const endDate = new Date().toISOString()
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 jours

      const response = await fetch('/api/integrations/square/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: activeStoreId,
          accessToken: integration.access_token,
          locationId: integration.location_id,
          startDate,
          endDate
        })
      })

      const data = await response.json()

      if (data.success) {
        setSyncStatus('success')
        setSyncMessage(`✅ ${data.synced} transactions synchronisées !`)
        fetchIntegrations()
        fetchSyncLogs()
        
        setTimeout(() => {
          setSyncStatus('idle')
        }, 3000)
      } else {
        setSyncStatus('error')
        setSyncMessage('❌ ' + (data.error || 'Erreur de synchronisation'))
      }
    } catch (error: any) {
      setSyncStatus('error')
      setSyncMessage('❌ Erreur: ' + error.message)
    }
  }

  const handleImportCatalog = async (integration: Integration) => {
    if (!activeStoreId || !integration.access_token) return

    if (!confirm('Voulez-vous importer le catalogue de produits depuis Square ? Les produits existants seront mis à jour.')) {
      return
    }

    setSyncStatus('syncing')
    setSyncMessage('Import du catalogue en cours...')

    try {
      const response = await fetch('/api/integrations/square/import-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: activeStoreId,
          accessToken: integration.access_token
        })
      })

      const data = await response.json()

      if (data.success) {
        setSyncStatus('success')
        setSyncMessage(`✅ ${data.imported} produits importés, ${data.updated} mis à jour !`)
        fetchIntegrations()
        fetchSyncLogs()
        
        setTimeout(() => {
          setSyncStatus('idle')
        }, 4000)
      } else {
        setSyncStatus('error')
        setSyncMessage('❌ ' + (data.error || 'Erreur d\'import'))
      }
    } catch (error: any) {
      setSyncStatus('error')
      setSyncMessage('❌ Erreur: ' + error.message)
    }
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
              {totalSynced}
            </div>
          </div>
        </div>

        {/* Bouton de synchronisation manuelle + Message */}
        {integrations.some(i => i.status === 'connected') && (
          <>
            {/* Import du catalogue */}
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <Package size={20} className="text-blue-600" />
                    Import du catalogue produits
                  </h3>
                  <p className="text-sm text-gray-600">
                    Importez tous vos produits depuis Square pour créer un lien permanent entre les deux systèmes
                  </p>
                </div>
                <button
                  onClick={() => {
                    const connectedIntegration = integrations.find(i => i.status === 'connected')
                    if (connectedIntegration) handleImportCatalog(connectedIntegration)
                  }}
                  disabled={syncStatus === 'syncing'}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  <ShoppingCart size={20} />
                  Importer catalogue
                </button>
              </div>
            </div>

            {/* Synchronisation des ventes */}
          <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Synchronisation des données
                </h3>
                <p className="text-sm text-gray-600">
                  Importez les ventes des 30 derniers jours depuis vos systèmes connectés
                </p>
              </div>
              <button
                onClick={() => {
                  const connectedIntegration = integrations.find(i => i.status === 'connected')
                  if (connectedIntegration) handleSync(connectedIntegration)
                }}
                disabled={syncStatus === 'syncing'}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={20} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                {syncStatus === 'syncing' ? 'Synchronisation...' : 'Synchroniser'}
              </button>
            </div>
            {syncMessage && (
              <div className={`mt-4 flex items-center gap-2 ${
                syncStatus === 'success' ? 'text-green-700' : 
                syncStatus === 'error' ? 'text-red-700' : 'text-blue-700'
              }`}>
                {syncStatus === 'success' && <Check size={20} />}
                {syncStatus === 'error' && <XCircle size={20} />}
                {syncStatus === 'syncing' && <RefreshCw size={20} className="animate-spin" />}
                <span className="font-medium">{syncMessage}</span>
              </div>
            )}
          </div>
          </>
        )}

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
                      onClick={() => handleDisconnect(integration)}
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
                      <p className="font-semibold mb-1">Comment obtenir votre clé API {selectedIntegration.name} ?</p>
                      <ol className="list-decimal list-inside space-y-1 mt-2">
                        <li>Connectez-vous à votre <a href="https://squareup.com/dashboard" target="_blank" className="underline">tableau de bord Square</a></li>
                        <li>Allez dans <strong>Apps & Integrations → API → My Applications</strong></li>
                        <li>Créez une nouvelle application ou sélectionnez-en une existante</li>
                        <li>Copiez votre <strong>Access Token</strong> (Production ou Sandbox)</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Access Token */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Access Token Square *
                  </label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAAAl..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Commence généralement par "EAAAl" (Production) ou "EAAA" (Sandbox)
                  </p>
                </div>

                {/* Test de connexion */}
                <div>
                  <button
                    onClick={handleTestConnection}
                    disabled={!accessToken || syncStatus === 'testing'}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {syncStatus === 'testing' ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Test en cours...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        Tester la connexion
                      </>
                    )}
                  </button>
                </div>

                {/* Informations du marchand */}
                {merchantInfo && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                        <p className="font-semibold text-green-900 mb-2">Connexion réussie !</p>
                        <div className="text-sm text-green-800 space-y-1">
                          <p><strong>Commerce :</strong> {merchantInfo.business_name}</p>
                          <p><strong>ID :</strong> {merchantInfo.id}</p>
                          <p><strong>Pays :</strong> {merchantInfo.country}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sélection du point de vente */}
                {locations.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Point de vente (Location) *
                    </label>
                    <select
                      value={locationId}
                      onChange={(e) => setLocationId(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                    >
                      <option value="">Sélectionnez un point de vente</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} {loc.address && `- ${loc.address}`}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Les transactions seront importées depuis ce point de vente
                    </p>
                  </div>
                )}

                {/* Message de statut */}
                {syncMessage && syncStatus !== 'testing' && (
                  <div className={`rounded-lg p-4 ${
                    syncStatus === 'success' ? 'bg-green-50 border border-green-200' :
                    syncStatus === 'error' ? 'bg-red-50 border border-red-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      {syncStatus === 'success' && <Check className="text-green-600" size={20} />}
                      {syncStatus === 'error' && <XCircle className="text-red-600" size={20} />}
                      {syncStatus === 'syncing' && <RefreshCw className="text-blue-600 animate-spin" size={20} />}
                      <span className={`font-medium ${
                        syncStatus === 'success' ? 'text-green-900' :
                        syncStatus === 'error' ? 'text-red-900' :
                        'text-blue-900'
                      }`}>
                        {syncMessage}
                      </span>
                    </div>
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowConfigModal(false)
                      setSyncStatus('idle')
                      setSyncMessage('')
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveIntegration}
                    disabled={!accessToken || !locationId || syncStatus === 'syncing' || !merchantInfo}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedIntegration.status === 'connected' ? 'Mettre à jour' : 'Enregistrer l\'intégration'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

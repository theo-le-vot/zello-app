'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  Download, 
  FileSpreadsheet, 
  Calendar,
  Filter,
  Check,
  Loader,
  FileText,
  BarChart3,
  Users,
  ShoppingCart
} from 'lucide-react'

interface ExportConfig {
  type: 'sales' | 'products' | 'clients' | 'analytics'
  format: 'xlsx' | 'csv' | 'pdf'
  dateRange: 'today' | 'week' | 'month' | 'year' | 'custom'
  startDate?: string
  endDate?: string
  includeDetails: boolean
}

export default function ExportsPage() {
  const router = useRouter()
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    type: 'sales',
    format: 'xlsx',
    dateRange: 'month',
    includeDetails: true
  })

  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [customDates, setCustomDates] = useState(false)

  useEffect(() => {
    fetchActiveStore()
  }, [])

  const fetchActiveStore = async () => {
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

      if (userData?.active_store_id) {
        setActiveStoreId(userData.active_store_id)
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const exportTypes = [
    {
      id: 'sales',
      name: 'Ventes',
      description: 'Historique des transactions et ventes',
      icon: ShoppingCart,
      color: 'green'
    },
    {
      id: 'products',
      name: 'Produits',
      description: 'Catalogue et inventaire',
      icon: FileSpreadsheet,
      color: 'blue'
    },
    {
      id: 'clients',
      name: 'Clients',
      description: 'Base de données clients',
      icon: Users,
      color: 'purple'
    },
    {
      id: 'analytics',
      name: 'Analyses',
      description: 'Rapport de performance',
      icon: BarChart3,
      color: 'orange'
    }
  ]

  const dateRanges = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'year', label: 'Cette année' },
    { value: 'custom', label: 'Personnalisé' }
  ]

  const handleExport = async () => {
    if (!activeStoreId) {
      alert('Aucune boutique active')
      return
    }

    setExportStatus('loading')

    try {
      // Calculer les dates
      const { startDate, endDate } = getDateRange()

      let data: any[] = []
      
      if (exportConfig.type === 'sales') {
        const { data: transactions } = await supabase
          .from('transactions')
          .select(`
            id,
            created_at,
            total_amount,
            points_awarded,
            customers(first_name, last_name, email)
          `)
          .eq('store_id', activeStoreId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false })

        data = transactions || []
      } else if (exportConfig.type === 'products') {
        const { data: products } = await supabase
          .from('products')
          .select('id, name, price, category, stock_quantity, available')
          .eq('store_id', activeStoreId)

        data = products || []
      } else if (exportConfig.type === 'clients') {
        const { data: customers } = await supabase
          .from('customers_stores')
          .select(`
            customers(id, first_name, last_name, email, phone_number),
            points,
            visits,
            join_date,
            last_visit_at
          `)
          .eq('store_id', activeStoreId)

        data = customers || []
      }

      // Générer le fichier
      const csvContent = generateCSV(data, exportConfig.type)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zello-${exportConfig.type}-${new Date().toISOString().split('T')[0]}.${exportConfig.format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setExportStatus('success')
      setTimeout(() => setExportStatus('idle'), 3000)
    } catch (error) {
      console.error('Erreur export:', error)
      alert('Erreur lors de l\'export')
      setExportStatus('idle')
    }
  }

  const getDateRange = () => {
    let endDate = new Date()
    let startDate = new Date()

    switch (exportConfig.dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(endDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      case 'custom':
        if (exportConfig.startDate) startDate = new Date(exportConfig.startDate)
        if (exportConfig.endDate) endDate = new Date(exportConfig.endDate)
        break
    }

    return { startDate, endDate }
  }

  const generateCSV = (data: any[], type: string) => {
    if (data.length === 0) return 'Aucune donnée à exporter'

    if (type === 'sales') {
      let csv = 'Date,Client,Email,Montant,Points\n'
      data.forEach(item => {
        const date = new Date(item.created_at).toLocaleDateString('fr-FR')
        const client = item.customers ? `${item.customers.first_name} ${item.customers.last_name}` : 'Anonyme'
        const email = item.customers?.email || ''
        csv += `${date},"${client}","${email}",${item.total_amount},${item.points_awarded}\n`
      })
      return csv
    } else if (type === 'products') {
      let csv = 'Nom,Prix,Catégorie,Stock,Disponible\n'
      data.forEach(item => {
        csv += `"${item.name}",${item.price},"${item.category || ''}",${item.stock_quantity},${item.available ? 'Oui' : 'Non'}\n`
      })
      return csv
    } else if (type === 'clients') {
      let csv = 'Prénom,Nom,Email,Téléphone,Points,Visites,Inscription\n'
      data.forEach(item => {
        const customer = item.customers
        if (customer) {
          csv += `"${customer.first_name}","${customer.last_name}","${customer.email || ''}","${customer.phone_number || ''}",${item.points},${item.visits},"${item.join_date}"\n`
        }
      })
      return csv
    }

    return 'Type non supporté'
  }

  const generateExportData = () => {
    if (exportConfig.type === 'sales') {
      return `Date,Client,Montant,Points\n2026-01-30,Jean Dupont,45.50,45\n2026-01-30,Marie Martin,32.00,32\n2026-01-29,Pierre Durand,78.90,79`
    }
    return 'Données d\'export...'
  }

  return (
    <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Exports de données
          </h1>
          <p className="text-gray-600">
            Exportez vos données au format Excel, CSV ou PDF
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Type d'export */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileSpreadsheet size={20} />
                Type de données
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exportTypes.map((type) => {
                  const Icon = type.icon
                  const isSelected = exportConfig.type === type.id
                  return (
                    <button
                      key={type.id}
                      onClick={() => setExportConfig({ ...exportConfig, type: type.id as any })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? `border-${type.color}-500 bg-${type.color}-50`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? `bg-${type.color}-600` : 'bg-gray-100'
                        }`}>
                          <Icon className={isSelected ? 'text-white' : 'text-gray-600'} size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-1">
                            {type.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {type.description}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="text-green-600 flex-shrink-0" size={20} />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Période */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar size={20} />
                Période
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                {dateRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => {
                      setExportConfig({ ...exportConfig, dateRange: range.value as any })
                      setCustomDates(range.value === 'custom')
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      exportConfig.dateRange === range.value
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              {customDates && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de début
                    </label>
                    <input
                      type="date"
                      value={exportConfig.startDate || ''}
                      onChange={(e) => setExportConfig({ ...exportConfig, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de fin
                    </label>
                    <input
                      type="date"
                      value={exportConfig.endDate || ''}
                      onChange={(e) => setExportConfig({ ...exportConfig, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Format */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={20} />
                Format d'export
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'xlsx', label: 'Excel (.xlsx)', icon: '📊' },
                  { value: 'csv', label: 'CSV (.csv)', icon: '📄' },
                  { value: 'pdf', label: 'PDF (.pdf)', icon: '📕' }
                ].map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setExportConfig({ ...exportConfig, format: format.value as any })}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      exportConfig.format === format.value
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">{format.icon}</div>
                    <div className="font-medium text-gray-900 text-sm">
                      {format.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Filter size={20} />
                Options
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={exportConfig.includeDetails}
                    onChange={(e) => setExportConfig({ ...exportConfig, includeDetails: e.target.checked })}
                    className="w-5 h-5 text-green-600 rounded"
                  />
                  <span className="text-gray-700">Inclure les détails complets</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-green-600 rounded" />
                  <span className="text-gray-700">Inclure les totaux et statistiques</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="w-5 h-5 text-green-600 rounded" />
                  <span className="text-gray-700">Masquer les informations sensibles</span>
                </label>
              </div>
            </div>
          </div>

          {/* Résumé et action */}
          <div className="space-y-6">
            {/* Résumé */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-xl p-6 sticky top-24">
              <h3 className="text-lg font-bold mb-4">Résumé de l'export</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-green-500/30">
                  <span className="text-green-100">Type</span>
                  <span className="font-semibold">
                    {exportTypes.find(t => t.id === exportConfig.type)?.name}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-green-500/30">
                  <span className="text-green-100">Format</span>
                  <span className="font-semibold uppercase">{exportConfig.format}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-green-500/30">
                  <span className="text-green-100">Période</span>
                  <span className="font-semibold">
                    {dateRanges.find(r => r.value === exportConfig.dateRange)?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-green-100">Détails</span>
                  <span className="font-semibold">
                    {exportConfig.includeDetails ? 'Oui' : 'Non'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={exportStatus === 'loading'}
                className="w-full bg-white text-green-600 py-3 rounded-lg font-bold hover:bg-green-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {exportStatus === 'loading' ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Génération...
                  </>
                ) : exportStatus === 'success' ? (
                  <>
                    <Check size={20} />
                    Téléchargé !
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Exporter
                  </>
                )}
              </button>
            </div>

            {/* Exports rapides */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Exports rapides</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900">Ventes du jour</div>
                  <div className="text-sm text-gray-600">Excel • Aujourd'hui</div>
                </button>
                <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900">Rapport mensuel</div>
                  <div className="text-sm text-gray-600">PDF • Ce mois</div>
                </button>
                <button className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900">Base clients</div>
                  <div className="text-sm text-gray-600">CSV • Complète</div>
                </button>
              </div>
            </div>

            {/* Historique */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Derniers exports</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Ventes janvier</div>
                    <div className="text-gray-600">Il y a 2 jours</div>
                  </div>
                  <button className="text-green-600 hover:text-green-700">
                    <Download size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Clients actifs</div>
                    <div className="text-gray-600">Il y a 5 jours</div>
                  </div>
                  <button className="text-green-600 hover:text-green-700">
                    <Download size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Rapport Q1</div>
                    <div className="text-gray-600">Il y a 1 semaine</div>
                  </div>
                  <button className="text-green-600 hover:text-green-700">
                    <Download size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}

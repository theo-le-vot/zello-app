'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  Upload, 
  FileSpreadsheet,
  Download,
  Check,
  X,
  AlertCircle,
  Loader,
  Package,
  ShoppingCart,
  FileText,
  ArrowRight
} from 'lucide-react'

interface ImportResult {
  success: number
  errors: number
  warnings: number
  details: string[]
}

export default function ImportsPage() {
  const router = useRouter()
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [importType, setImportType] = useState<'products' | 'sales'>('products')
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    setUserId(user.id)

    const { data: userData } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.id)
      .single()

    if (userData?.active_store_id) {
      setActiveStoreId(userData.active_store_id)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file || !activeStoreId || !userId) {
      alert('Configuration incomplète')
      return
    }

    setImporting(true)
    setResult(null)

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      let successCount = 0
      let errorCount = 0
      let warningCount = 0
      const details: string[] = []

      if (importType === 'products') {
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',')
          
          try {
            const product: any = {
              store_id: activeStoreId,
              name: values[headers.indexOf('nom')]?.trim(),
              price: parseFloat(values[headers.indexOf('prix')]?.trim() || '0'),
              category: values[headers.indexOf('categorie')]?.trim() || null,
              stock_quantity: parseInt(values[headers.indexOf('stock')]?.trim() || '0'),
              available: true
            }

            if (!product.name || product.price <= 0) {
              errorCount++
              details.push(`Ligne ${i + 1}: Données invalides (nom ou prix manquant)`)
              continue
            }

            const { error } = await supabase
              .from('products')
              .insert(product)

            if (error) {
              errorCount++
              details.push(`Ligne ${i + 1}: ${error.message}`)
            } else {
              successCount++
            }
          } catch (err) {
            errorCount++
            details.push(`Ligne ${i + 1}: Erreur de format`)
          }
        }
      } else if (importType === 'sales') {
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',')
          
          try {
            const saleDate = values[headers.indexOf('date')]?.trim()
            const clientEmail = values[headers.indexOf('client_email')]?.trim()
            const amount = parseFloat(values[headers.indexOf('montant')]?.trim() || '0')
            const points = parseInt(values[headers.indexOf('points')]?.trim() || '0')

            if (!saleDate || amount <= 0) {
              errorCount++
              details.push(`Ligne ${i + 1}: Date ou montant invalide`)
              continue
            }

            // Trouver ou créer le client
            let customerId = null
            if (clientEmail) {
              const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id')
                .eq('email', clientEmail)
                .single()

              if (existingCustomer) {
                customerId = existingCustomer.id
              }
            }

            const transaction: any = {
              store_id: activeStoreId,
              user_id: userId,
              customer_id: customerId,
              total_amount: amount,
              points_awarded: points,
              created_at: new Date(saleDate).toISOString()
            }

            const { error } = await supabase
              .from('transactions')
              .insert(transaction)

            if (error) {
              errorCount++
              details.push(`Ligne ${i + 1}: ${error.message}`)
            } else {
              successCount++
            }
          } catch (err) {
            errorCount++
            details.push(`Ligne ${i + 1}: Erreur de format`)
          }
        }
      }

      setResult({
        success: successCount,
        errors: errorCount,
        warnings: warningCount,
        details: details.slice(0, 10) // Limiter à 10 messages
      })
      setImporting(false)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Erreur import:', error)
      alert('Erreur lors de l\'import')
      setImporting(false)
    }
  }

  const downloadTemplate = (type: 'products' | 'sales') => {
    // Créer un fichier CSV template
    let csvContent = ''
    
    if (type === 'products') {
      csvContent = 'nom,prix,prix_revient,categorie,code_barre,stock\nCroissant,1.20,0.45,Viennoiserie,3456789012345,50\nBaguette,1.10,0.35,Pain,2345678901234,80'
    } else {
      csvContent = 'date,client_email,montant,produits,points\n2026-01-30,client@email.com,15.50,"Croissant,Café",15\n2026-01-30,autre@email.com,8.20,Sandwich,8'
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `zello-template-${type}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Import de données
          </h1>
          <p className="text-gray-600">
            Importez vos produits et ventes en masse via Excel ou CSV
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Type d'import */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Type d'import
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setImportType('products')
                    setFile(null)
                    setResult(null)
                  }}
                  className={`p-6 rounded-lg border-2 text-left transition-all ${
                    importType === 'products'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      importType === 'products' ? 'bg-green-600' : 'bg-gray-100'
                    }`}>
                      <Package className={importType === 'products' ? 'text-white' : 'text-gray-600'} size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 mb-1">Produits</div>
                      <div className="text-sm text-gray-600">
                        Catalogue, prix, stock
                      </div>
                    </div>
                  </div>
                  {importType === 'products' && (
                    <div className="mt-4 flex items-center gap-2 text-green-700">
                      <Check size={16} />
                      <span className="text-sm font-semibold">Sélectionné</span>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => {
                    setImportType('sales')
                    setFile(null)
                    setResult(null)
                  }}
                  className={`p-6 rounded-lg border-2 text-left transition-all ${
                    importType === 'sales'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      importType === 'sales' ? 'bg-green-600' : 'bg-gray-100'
                    }`}>
                      <ShoppingCart className={importType === 'sales' ? 'text-white' : 'text-gray-600'} size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 mb-1">Ventes</div>
                      <div className="text-sm text-gray-600">
                        Historique, transactions
                      </div>
                    </div>
                  </div>
                  {importType === 'sales' && (
                    <div className="mt-4 flex items-center gap-2 text-green-700">
                      <Check size={16} />
                      <span className="text-sm font-semibold">Sélectionné</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Zone d'upload */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Fichier à importer
              </h2>
              
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-green-400 hover:bg-green-50/50 transition-all cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {file ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <FileSpreadsheet className="text-green-600" size={32} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">{file.name}</div>
                      <div className="text-sm text-gray-600">
                        {(file.size / 1024).toFixed(2)} KB
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        setResult(null)
                      }}
                      className="text-red-600 hover:text-red-700 font-medium flex items-center gap-2"
                    >
                      <X size={16} />
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                    <div className="text-gray-900 font-semibold mb-2">
                      Cliquez pour sélectionner un fichier
                    </div>
                    <div className="text-sm text-gray-600">
                      Formats acceptés : CSV, XLS, XLSX (max 10 MB)
                    </div>
                  </>
                )}
              </div>

              {file && !result && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full mt-6 bg-green-600 text-white py-4 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      Lancer l'import
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Résultats */}
            {result && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">
                  Résultats de l'import
                </h2>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="text-green-600" size={20} />
                      <span className="text-sm font-medium text-green-900">Réussis</span>
                    </div>
                    <div className="text-3xl font-bold text-green-700">
                      {result.success}
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="text-orange-600" size={20} />
                      <span className="text-sm font-medium text-orange-900">Avertissements</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-700">
                      {result.warnings}
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <X className="text-red-600" size={20} />
                      <span className="text-sm font-medium text-red-900">Erreurs</span>
                    </div>
                    <div className="text-3xl font-bold text-red-700">
                      {result.errors}
                    </div>
                  </div>
                </div>

                {result.details.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-semibold text-gray-900 mb-3">Détails :</div>
                    {result.details.map((detail, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        <AlertCircle className="text-orange-500 flex-shrink-0 mt-0.5" size={16} />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setFile(null)
                      setResult(null)
                    }}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Nouvel import
                  </button>
                  <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                    Télécharger le rapport
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Aide et templates */}
          <div className="space-y-6">
            {/* Télécharger template */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-6">
              <FileText size={32} className="mb-4" />
              <h3 className="font-bold text-lg mb-2">
                Fichier template
              </h3>
              <p className="text-blue-100 text-sm mb-6">
                Téléchargez notre modèle Excel pré-formaté pour éviter les erreurs d'import.
              </p>
              <button
                onClick={() => downloadTemplate(importType)}
                className="w-full bg-white text-blue-600 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Télécharger
              </button>
            </div>

            {/* Guide */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">
                Guide d'import
              </h3>
              
              {importType === 'products' ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-700 font-bold text-xs">1</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Colonnes requises</div>
                      <div className="text-gray-600">nom, prix, catégorie</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-700 font-bold text-xs">2</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Colonnes optionnelles</div>
                      <div className="text-gray-600">prix_revient, code_barre, stock, description</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-700 font-bold text-xs">3</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Format des prix</div>
                      <div className="text-gray-600">Utilisez le point comme séparateur décimal (ex: 1.50)</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-700 font-bold text-xs">1</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Colonnes requises</div>
                      <div className="text-gray-600">date, montant, produits</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-700 font-bold text-xs">2</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Format de date</div>
                      <div className="text-gray-600">AAAA-MM-JJ (ex: 2026-01-30)</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-700 font-bold text-xs">3</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Identification client</div>
                      <div className="text-gray-600">Email ou ID client si connu</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Conseils */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-orange-600 flex-shrink-0 mt-1" size={20} />
                <div>
                  <div className="font-bold text-orange-900 mb-2">Conseils</div>
                  <ul className="text-sm text-orange-800 space-y-2">
                    <li>• Vérifiez votre fichier avant l'import</li>
                    <li>• Sauvegardez vos données actuelles</li>
                    <li>• Testez avec un petit fichier d'abord</li>
                    <li>• Les doublons seront automatiquement détectés</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Historique */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">
                Derniers imports
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium text-gray-900">Produits</div>
                    <div className="text-gray-600">Il y a 2 jours • 245 lignes</div>
                  </div>
                  <Check className="text-green-600" size={18} />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium text-gray-900">Ventes</div>
                    <div className="text-gray-600">Il y a 1 semaine • 892 lignes</div>
                  </div>
                  <Check className="text-green-600" size={18} />
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}

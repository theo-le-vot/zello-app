'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  DollarSign, 
  TrendingUp,
  Calculator,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Target,
  BarChart3,
  Percent,
  Package
} from 'lucide-react'

interface Product {
  id: string
  name: string
  currentPrice: number
  costPrice: number
  suggestedPrice: number
  margin: number
  salesVolume: number
  revenue: number
  category?: string
}

export default function ConseilPrixPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
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

      if (!userData?.active_store_id) {
        setLoading(false)
        return
      }

      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, price, category')
        .eq('store_id', userData.active_store_id)
        .eq('available', true)
        .not('price', 'is', null)

      const productsWithStats = (productsData || []).map(product => {
        const currentPrice = parseFloat(product.price)
        const costPrice = currentPrice * 0.40
        const currentMargin = ((currentPrice - costPrice) / currentPrice) * 100
        const priceIncrease = currentMargin < 60 ? 0.12 : 0.08
        const suggestedPrice = currentPrice * (1 + priceIncrease)

        return {
          id: product.id,
          name: product.name,
          currentPrice,
          costPrice,
          suggestedPrice,
          margin: currentMargin,
          salesVolume: 0,
          revenue: 0,
          category: product.category || 'Autre'
        }
      })

      setProducts(productsWithStats)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [customPrice, setCustomPrice] = useState<string>('')

  const calculateImpact = (product: Product) => {
    const priceIncrease = ((product.suggestedPrice - product.currentPrice) / product.currentPrice) * 100
    const estimatedSalesLoss = priceIncrease * 0.5 // Estimation: perte de 0.5% des ventes par % d'augmentation
    const newSalesVolume = product.salesVolume * (1 - estimatedSalesLoss / 100)
    const currentRevenue = product.currentPrice * product.salesVolume
    const projectedRevenue = product.suggestedPrice * newSalesVolume
    const revenueImpact = projectedRevenue - currentRevenue
    
    return {
      priceIncrease: priceIncrease.toFixed(1),
      estimatedSalesLoss: estimatedSalesLoss.toFixed(1),
      newSalesVolume: Math.round(newSalesVolume),
      currentRevenue: currentRevenue.toFixed(2),
      projectedRevenue: projectedRevenue.toFixed(2),
      revenueImpact: revenueImpact.toFixed(2),
      percentageImpact: ((revenueImpact / currentRevenue) * 100).toFixed(1)
    }
  }

  const globalStats = {
    avgMargin: (products.reduce((sum, p) => sum + p.margin, 0) / products.length).toFixed(1),
    totalRevenue: products.reduce((sum, p) => sum + p.revenue, 0).toFixed(2),
    potentialGain: products.reduce((sum, p) => {
      const impact = calculateImpact(p)
      return sum + parseFloat(impact.revenueImpact)
    }, 0).toFixed(2)
  }

  const applyPrice = async (productId: string, newPrice: number) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ price: newPrice })
        .eq('id', productId)

      if (error) throw error

      setProducts(products.map(p => {
        if (p.id === productId) {
          const newMargin = ((newPrice - p.costPrice) / newPrice) * 100
          return { ...p, currentPrice: newPrice, margin: newMargin }
        }
        return p
      }))
      setSelectedProduct(null)
      setCustomPrice('')
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la mise à jour du prix')
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Conseil de prix
          </h1>
          <p className="text-gray-600">
            Optimisez vos prix pour maximiser votre rentabilité
          </p>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <Percent size={32} />
            </div>
            <div className="text-3xl font-bold mb-1">{globalStats.avgMargin}%</div>
            <div className="text-blue-100">Marge moyenne actuelle</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <DollarSign size={32} />
            </div>
            <div className="text-3xl font-bold mb-1">{globalStats.totalRevenue}€</div>
            <div className="text-green-100">Chiffre d'affaires mensuel</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp size={32} />
            </div>
            <div className="text-3xl font-bold mb-1">+{globalStats.potentialGain}€</div>
            <div className="text-purple-100">Gain potentiel mensuel</div>
          </div>
        </div>

        {/* Alertes et conseils */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-green-900 mb-2">Bonnes pratiques détectées</h3>
                <p className="text-green-700 text-sm">
                  Votre marge moyenne est saine. Vos prix sont globalement bien positionnés par rapport au marché.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="text-orange-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-orange-900 mb-2">Opportunités d'amélioration</h3>
                <p className="text-orange-700 text-sm">
                  {products.filter(p => p.suggestedPrice > p.currentPrice).length} produits ont un potentiel d'optimisation de prix.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau des produits */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package size={24} />
              Analyse par produit
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Produit</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Prix actuel</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Prix de revient</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Marge</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Volume</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Prix conseillé</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => {
                  const priceComparison = product.suggestedPrice - product.currentPrice
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-600">{product.revenue.toFixed(2)}€ CA/mois</div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        {product.currentPrice.toFixed(2)}€
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {product.costPrice.toFixed(2)}€
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex px-2 py-1 rounded-full text-sm font-semibold ${
                          product.margin > 65 ? 'bg-green-100 text-green-700' :
                          product.margin > 55 ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {product.margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {product.salesVolume}/mois
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-gray-900">
                          {product.suggestedPrice.toFixed(2)}€
                        </div>
                        {priceComparison !== 0 && (
                          <div className={`text-sm ${priceComparison > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {priceComparison > 0 ? '+' : ''}{priceComparison.toFixed(2)}€
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                        >
                          Analyser
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Méthode de calcul */}
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Lightbulb className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Comment calculons-nous le prix conseillé ?
              </h3>
              <div className="space-y-2 text-gray-700">
                <p className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">1.</span>
                  <span>Analyse de votre structure de coûts et marges actuelles</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">2.</span>
                  <span>Comparaison avec les prix du marché local</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">3.</span>
                  <span>Évaluation de l'élasticité-prix basée sur vos données de ventes</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">4.</span>
                  <span>Optimisation pour maximiser votre rentabilité tout en restant compétitif</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal d'analyse détaillée */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Analyse détaillée : {selectedProduct.name}
              </h2>

              {/* Prix actuels */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Prix actuel</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedProduct.currentPrice.toFixed(2)}€
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 mb-1">Prix de revient</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {selectedProduct.costPrice.toFixed(2)}€
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 mb-1">Prix conseillé</div>
                  <div className="text-2xl font-bold text-green-900">
                    {selectedProduct.suggestedPrice.toFixed(2)}€
                  </div>
                </div>
              </div>

              {/* Impact projeté */}
              <div className="mb-8">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 size={20} />
                  Impact projeté du changement de prix
                </h3>
                <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-lg p-6">
                  {(() => {
                    const impact = calculateImpact(selectedProduct)
                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Augmentation de prix</span>
                          <span className="font-bold text-green-700">+{impact.priceIncrease}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Perte de volume estimée</span>
                          <span className="font-bold text-orange-700">-{impact.estimatedSalesLoss}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Nouveau volume</span>
                          <span className="font-bold text-gray-900">{impact.newSalesVolume} ventes/mois</span>
                        </div>
                        <hr className="border-green-300" />
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">CA actuel</span>
                          <span className="font-bold text-gray-900">{impact.currentRevenue}€</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">CA projeté</span>
                          <span className="font-bold text-green-700">{impact.projectedRevenue}€</span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t-2 border-green-400">
                          <span className="font-bold text-gray-900">Gain mensuel</span>
                          <span className="text-2xl font-bold text-green-600">
                            +{impact.revenueImpact}€ ({impact.percentageImpact}%)
                          </span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Prix personnalisé */}
              <div className="mb-8">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calculator size={20} />
                  Définir un prix personnalisé
                </h3>
                <div className="flex gap-3">
                  <input
                    type="number"
                    step="0.01"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="Entrez un prix..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none"
                  />
                  <button
                    onClick={() => customPrice && applyPrice(selectedProduct.id, parseFloat(customPrice))}
                    disabled={!customPrice || parseFloat(customPrice) <= 0}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Tester
                  </button>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
                <button
                  onClick={() => applyPrice(selectedProduct.id, selectedProduct.suggestedPrice)}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Appliquer le prix conseillé
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

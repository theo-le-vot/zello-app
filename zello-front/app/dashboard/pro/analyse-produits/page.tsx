'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useStore } from '@/lib/contexts/StoreContext'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface ProductStat {
  id: string
  name: string
  category?: string
  totalQuantity: number
  totalRevenue: number
  totalCost: number
  margin: number
  marginPercent: number
  transactions: number
  avgPrice: number
  lastSold: string
  daysSinceLastSold: number
  trend: 'up' | 'down' | 'stable'
  classification: 'A' | 'B' | 'C' | 'D'
}

export default function AnalyseProduitsPage() {
  const { refreshTrigger } = useStore()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<ProductStat[]>([])
  const [filteredProducts, setFilteredProducts] = useState<ProductStat[]>([])
  const [period, setPeriod] = useState<'7d' | '30d' | '3m' | '6m' | '1y' | 'all'>('30d')
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity' | 'margin' | 'transactions'>('revenue')
  const [classificationFilter, setClassificationFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [displayCount, setDisplayCount] = useState(20)

  // Stats globales
  const [totalProducts, setTotalProducts] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalMargin, setTotalMargin] = useState(0)
  const [avgMarginPercent, setAvgMarginPercent] = useState(0)

  // Données graphiques
  const [top10Revenue, setTop10Revenue] = useState<any[]>([])
  const [top10Quantity, setTop10Quantity] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [classificationData, setClassificationData] = useState<any[]>([])
  const [evolutionData, setEvolutionData] = useState<any[]>([])
  const [marginDistribution, setMarginDistribution] = useState<any[]>([])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
  const CLASSIFICATION_COLORS = {
    'A': '#10b981', // Vert - produits stars
    'B': '#3b82f6', // Bleu - produits solides
    'C': '#f59e0b', // Orange - produits moyens
    'D': '#ef4444'  // Rouge - produits faibles
  }

  const getDates = () => {
    const now = new Date()
    let startDate = new Date()

    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '3m':
        startDate.setMonth(now.getMonth() - 3)
        break
      case '6m':
        startDate.setMonth(now.getMonth() - 6)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case 'all':
        startDate = new Date('2000-01-01')
        break
    }

    return startDate.toISOString()
  }

  const classifyProduct = (revenue: number, totalRevenue: number, index: number, totalProducts: number): ProductStat['classification'] => {
    const revenuePercent = (revenue / totalRevenue) * 100
    const positionPercent = (index / totalProducts) * 100
    
    // Classe A : Top 20% qui génèrent 80% du CA
    if (positionPercent <= 20 || revenuePercent >= 5) return 'A'
    
    // Classe B : 30% suivants qui génèrent 15% du CA
    if (positionPercent <= 50 || revenuePercent >= 1) return 'B'
    
    // Classe C : 30% suivants qui génèrent 4% du CA
    if (positionPercent <= 80) return 'C'
    
    // Classe D : 20% restants
    return 'D'
  }

  const calculateTrend = (recentSales: number, olderSales: number): ProductStat['trend'] => {
    if (recentSales === 0 && olderSales === 0) return 'stable'
    if (olderSales === 0) return 'up'
    
    const variation = ((recentSales - olderSales) / olderSales) * 100
    
    if (variation > 10) return 'up'
    if (variation < -10) return 'down'
    return 'stable'
  }

  const fetchProductsData = async () => {
    setLoading(true)
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

    const storeId = userData?.active_store_id
    if (!storeId) {
      setLoading(false)
      return
    }

    const startDate = getDates()

    // Récupérer tous les produits du store
    const { data: allProducts } = await supabase
      .from('products')
      .select('id, name, category, purchase_price')
      .eq('store_id', storeId)

    if (!allProducts) {
      setLoading(false)
      return
    }

    // Récupérer toutes les ventes de produits
    const { data: transactionProducts } = await supabase
      .from('transaction_products')
      .select(`
        product_id,
        quantity,
        unit_price,
        transactions!inner(id, date, store_id)
      `)
      .eq('transactions.store_id', storeId)
      .gte('transactions.date', startDate)

    if (!transactionProducts) {
      setLoading(false)
      return
    }

    // Calculer les stats pour chaque produit
    const productsMap = new Map<string, ProductStat>()
    const now = new Date()

    transactionProducts.forEach((tp: any) => {
      const productId = tp.product_id
      const product = allProducts.find(p => p.id === productId)
      if (!product) return

      if (!productsMap.has(productId)) {
        productsMap.set(productId, {
          id: productId,
          name: product.name,
          category: product.category || 'Non catégorisé',
          totalQuantity: 0,
          totalRevenue: 0,
          totalCost: 0,
          margin: 0,
          marginPercent: 0,
          transactions: 0,
          avgPrice: 0,
          lastSold: tp.transactions.date,
          daysSinceLastSold: 0,
          trend: 'stable',
          classification: 'D'
        })
      }

      const stat = productsMap.get(productId)!
      stat.totalQuantity += tp.quantity || 0
      stat.totalRevenue += (tp.quantity || 0) * (tp.unit_price || 0)
      stat.totalCost += (tp.quantity || 0) * (product.purchase_price || 0)
      stat.transactions += 1

      // Mettre à jour la dernière vente
      if (new Date(tp.transactions.date) > new Date(stat.lastSold)) {
        stat.lastSold = tp.transactions.date
      }
    })

    // Finaliser les calculs
    const productsList = Array.from(productsMap.values()).map(product => {
      product.margin = product.totalRevenue - product.totalCost
      product.marginPercent = product.totalRevenue > 0 ? (product.margin / product.totalRevenue) * 100 : 0
      product.avgPrice = product.totalQuantity > 0 ? product.totalRevenue / product.totalQuantity : 0
      product.daysSinceLastSold = Math.floor((now.getTime() - new Date(product.lastSold).getTime()) / (1000 * 60 * 60 * 24))
      return product
    })

    // Trier par revenu pour classification
    productsList.sort((a, b) => b.totalRevenue - a.totalRevenue)
    const totalRev = productsList.reduce((sum, p) => sum + p.totalRevenue, 0)

    productsList.forEach((product, index) => {
      product.classification = classifyProduct(product.totalRevenue, totalRev, index, productsList.length)
      
      // Calculer la tendance (comparer les 7 derniers jours vs les 7 précédents)
      // Pour simplifier, on utilise une logique basique ici
      product.trend = product.daysSinceLastSold < 7 ? 'up' : product.daysSinceLastSold < 30 ? 'stable' : 'down'
    })

    setProducts(productsList)
    setFilteredProducts(productsList)
    setTotalProducts(productsList.length)
    setTotalRevenue(totalRev)
    setTotalMargin(productsList.reduce((sum, p) => sum + p.margin, 0))
    setAvgMarginPercent(productsList.reduce((sum, p) => sum + p.marginPercent, 0) / productsList.length || 0)

    // Top 10 par revenu
    setTop10Revenue(productsList.slice(0, 10).map(p => ({
      name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
      revenue: p.totalRevenue
    })))

    // Top 10 par quantité
    const sortedByQuantity = [...productsList].sort((a, b) => b.totalQuantity - a.totalQuantity)
    setTop10Quantity(sortedByQuantity.slice(0, 10).map(p => ({
      name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
      quantity: p.totalQuantity
    })))

    // Répartition par catégorie
    const categoryStats = productsList.reduce((acc: any, p) => {
      const cat = p.category || 'Non catégorisé'
      if (!acc[cat]) acc[cat] = { revenue: 0, quantity: 0, count: 0 }
      acc[cat].revenue += p.totalRevenue
      acc[cat].quantity += p.totalQuantity
      acc[cat].count += 1
      return acc
    }, {})

    setCategoryData(Object.entries(categoryStats).map(([name, stats]: [string, any]) => ({
      name,
      revenue: stats.revenue,
      quantity: stats.quantity,
      products: stats.count
    })))

    // Répartition par classification ABC
    const classStats = productsList.reduce((acc: any, p) => {
      acc[p.classification] = (acc[p.classification] || 0) + 1
      return acc
    }, {})

    setClassificationData(Object.entries(classStats).map(([name, value]) => ({ name: `Classe ${name}`, value })))

    // Distribution des marges
    const marginRanges = [
      { label: '< 0%', min: -Infinity, max: 0, count: 0 },
      { label: '0-10%', min: 0, max: 10, count: 0 },
      { label: '10-20%', min: 10, max: 20, count: 0 },
      { label: '20-30%', min: 20, max: 30, count: 0 },
      { label: '30-50%', min: 30, max: 50, count: 0 },
      { label: '> 50%', min: 50, max: Infinity, count: 0 }
    ]

    productsList.forEach(p => {
      const range = marginRanges.find(r => p.marginPercent >= r.min && p.marginPercent < r.max)
      if (range) range.count++
    })

    setMarginDistribution(marginRanges.map(r => ({ tranche: r.label, produits: r.count })))

    // Évolution (agrégation par semaine)
    const weeklyStats = transactionProducts.reduce((acc: any, tp: any) => {
      const date = new Date(tp.transactions.date)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      
      if (!acc[weekKey]) acc[weekKey] = { revenue: 0, quantity: 0 }
      acc[weekKey].revenue += (tp.quantity || 0) * (tp.unit_price || 0)
      acc[weekKey].quantity += tp.quantity || 0
      return acc
    }, {})

    setEvolutionData(Object.entries(weeklyStats)
      .map(([week, stats]: [string, any]) => ({ week, revenue: stats.revenue, quantity: stats.quantity }))
      .sort((a, b) => {
        const [dayA, monthA] = a.week.split('/')
        const [dayB, monthB] = b.week.split('/')
        return new Date(`2024-${monthA}-${dayA}`).getTime() - new Date(`2024-${monthB}-${dayB}`).getTime()
      })
    )

    setLoading(false)
  }

  useEffect(() => {
    fetchProductsData()
  }, [refreshTrigger, period])

  useEffect(() => {
    // Filtrer et trier
    let filtered = [...products]

    // Filtre par classification
    if (classificationFilter !== 'all') {
      filtered = filtered.filter(p => p.classification === classificationFilter)
    }

    // Filtre par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
      )
    }

    // Trier
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.totalRevenue - a.totalRevenue
        case 'quantity':
          return b.totalQuantity - a.totalQuantity
        case 'margin':
          return b.margin - a.margin
        case 'transactions':
          return b.transactions - a.transactions
        default:
          return 0
      }
    })

    setFilteredProducts(filtered)
  }, [products, sortBy, classificationFilter, searchTerm])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const getTrendIcon = (trend: ProductStat['trend']) => {
    switch (trend) {
      case 'up': return <span className="text-green-600">↗</span>
      case 'down': return <span className="text-red-600">↘</span>
      default: return <span className="text-gray-600">→</span>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Chargement de l'analyse produits...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-800">Analyse Produits</h1>
      </div>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Produits vendus</div>
          <div className="text-2xl font-bold text-gray-900">{totalProducts}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">CA Total</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Marge totale</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalMargin)}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Marge moyenne</div>
          <div className="text-2xl font-bold text-gray-900">{avgMarginPercent.toFixed(1)}%</div>
        </div>
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 CA */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Top 10 produits (CA)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10Revenue} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill="#10b981" name="CA" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 10 quantité */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Top 10 produits (quantité)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10Quantity} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="quantity" fill="#3b82f6" name="Quantité" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par catégorie */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Répartition par catégorie</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="revenue"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Classification ABC */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Classification ABC</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={classificationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {classificationData.map((entry, index) => {
                  const className = entry.name.split(' ')[1] as keyof typeof CLASSIFICATION_COLORS
                  return <Cell key={`cell-${index}`} fill={CLASSIFICATION_COLORS[className]} />
                })}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Légende ABC */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-600"></div>
              <span>A : Top performers (20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-600"></div>
              <span>B : Bons produits (30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-600"></div>
              <span>C : Moyens (30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-600"></div>
              <span>D : Faibles (20%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Évolution et distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution hebdomadaire */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Évolution hebdomadaire</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="CA (€)" />
              <Line yAxisId="right" type="monotone" dataKey="quantity" stroke="#3b82f6" strokeWidth={2} name="Quantité" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution des marges */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Distribution des marges</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={marginDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tranche" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="produits" fill="#8b5cf6" name="Nombre de produits" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filtres et tableau */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h2 className="text-xl font-semibold text-gray-800">Liste des produits</h2>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Recherche */}
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {/* Filtre période */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="3m">3 derniers mois</option>
              <option value="6m">6 derniers mois</option>
              <option value="1y">1 an</option>
              <option value="all">Depuis toujours</option>
            </select>

            {/* Filtre classification */}
            <select
              value={classificationFilter}
              onChange={(e) => setClassificationFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes les classes</option>
              <option value="A">Classe A (Stars)</option>
              <option value="B">Classe B (Solides)</option>
              <option value="C">Classe C (Moyens)</option>
              <option value="D">Classe D (Faibles)</option>
            </select>

            {/* Tri */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="revenue">Trier par CA</option>
              <option value="quantity">Trier par quantité</option>
              <option value="margin">Trier par marge</option>
              <option value="transactions">Trier par transactions</option>
            </select>
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Rang</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Produit</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Catégorie</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Classe</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Quantité</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">CA</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Marge</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Marge %</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Transactions</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Tendance</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.slice(0, displayCount).map((product, index) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`font-bold ${index < 3 ? 'text-yellow-600' : 'text-gray-600'}`}>
                      #{index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{product.name}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{product.category}</td>
                  <td className="px-4 py-3 text-center">
                    <span 
                      className="px-2 py-1 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: CLASSIFICATION_COLORS[product.classification] }}
                    >
                      {product.classification}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{product.totalQuantity}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(product.totalRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatCurrency(product.margin)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${product.marginPercent > 30 ? 'text-green-600' : product.marginPercent > 15 ? 'text-gray-600' : 'text-red-600'}`}>
                      {product.marginPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{product.transactions}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getTrendIcon(product.trend)}
                      <span className="text-xs text-gray-500">
                        {product.daysSinceLastSold}j
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bouton voir plus */}
        {filteredProducts.length > displayCount && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setDisplayCount(displayCount + 20)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Afficher plus ({filteredProducts.length - displayCount} restants)
            </button>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun produit trouvé avec ces critères
          </div>
        )}
      </div>

      {/* Insights et recommandations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">⭐ Produits stars</h3>
          <p className="text-green-800">
            <span className="font-bold">{classificationData.find(c => c.name === 'Classe A')?.value || 0}</span> produits 
            de classe A génèrent la majorité de votre CA. Assurez leur disponibilité constante.
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">⚠️ Produits dormants</h3>
          <p className="text-orange-800">
            <span className="font-bold">{products.filter(p => p.daysSinceLastSold > 30).length}</span> produits 
            non vendus depuis +30 jours. Envisagez des promotions ou un déstockage.
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">💰 Optimisation marges</h3>
          <p className="text-purple-800">
            Marge moyenne : <span className="font-bold">{avgMarginPercent.toFixed(1)}%</span>.
            {avgMarginPercent < 20 ? ' Revoyez vos prix de vente pour améliorer la rentabilité.' : ' Excellente rentabilité !'}
          </p>
        </div>
      </div>
    </div>
  )
}

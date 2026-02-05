'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import ProductModal from '@/components/ProductModal'
import EditProductModal from '@/components/EditProductModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Range } from 'react-range'

export default function ProduitsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [activeMenuProductId, setActiveMenuProductId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [images, setImages] = useState<Record<string, string>>({})
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(500)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  const [sortOption, setSortOption] = useState('')

  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const fetchImage = async (path: string, productId: string) => {
    const { data, error } = await supabase.storage.from('product-images').download(path)
    if (error) return
    const url = URL.createObjectURL(data)
    setImages(prev => ({ ...prev, [productId]: url }))
  }

  const fetchProduits = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return setLoading(false)

    const { data: userData } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.id)
      .single()

    if (!userData?.active_store_id) return setLoading(false)

    const { data: produits } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', userData.active_store_id)
      .order('created_at', { ascending: false })

    setProducts(produits || [])

    if (produits && produits.length > 0) {
      const prices = produits.map(p => p.price)
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      setMinPrice(min)
      setMaxPrice(max)
      setPriceRange([min, max])
    }

    for (const produit of produits || []) {
      if (produit.image_path) fetchImage(produit.image_path, produit.id)
    }

    setLoading(false)
  }

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return
    const { error } = await supabase.from('products').delete().eq('id', productToDelete)
    if (!error) fetchProduits()
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        activeMenuProductId &&
        menuRefs.current[activeMenuProductId] &&
        !menuRefs.current[activeMenuProductId]?.contains(e.target as Node)
      ) {
        setActiveMenuProductId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeMenuProductId])

  useEffect(() => {
    fetchProduits()
  }, [])

  const handleCategoryToggle = (cat: string) => {
    setFilterCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setPriceRange([minPrice, maxPrice])
    setFilterCategories([])
    setSortOption('')
  }

  const productsFiltered = products
    .filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])
    .filter(p => filterCategories.length === 0 || filterCategories.includes(p.category))
    .sort((a, b) => {
      switch (sortOption) {
        case 'name-asc': return a.name.localeCompare(b.name)
        case 'name-desc': return b.name.localeCompare(a.name)
        case 'price-asc': return a.price - b.price
        case 'price-desc': return b.price - a.price
        case 'category-asc': return (a.category || '').localeCompare(b.category || '')
        case 'date-desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'date-asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        default: return 0
      }
    })

  const uniqueCategories = [...new Set(products.map(p => p.category))].filter(Boolean)

  return (
    <>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#093A23] mb-1">Catalogue produits</h1>
            <p className="text-gray-600 text-sm">{productsFiltered.length} produit{productsFiltered.length > 1 ? 's' : ''} trouvé{productsFiltered.length > 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white px-6 py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Ajouter un produit
          </button>
        </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-xl">🔍</span>
          Filtres et recherche
        </h2>
        <div className="grid grid-cols-36 gap-y-5 items-start w-full">
  {/* Recherche (4 colonnes) */}
  <div className="col-span-12">
    <input
      type="text"
      placeholder="🔍 Rechercher un produit"
      value={searchTerm}
      onChange={e => setSearchTerm(e.target.value)}
      className="w-full border border-gray-300 px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#093A23] focus:border-transparent"
    />
  </div>

  {/* Espace (1 colonne) */}
  <div className="col-span-3" />

 {/* Prix (3 colonnes) */}
<div className="col-span-7">
  <label className="text-sm font-medium text-gray-700 mb-2 block">
    Prix : {priceRange[0]}€ – {priceRange[1]}€
  </label>
  <div className="w-full">
    <Range
      step={0.01}
      min={minPrice}
      max={maxPrice}
      values={priceRange}
      onChange={(values) => {
        const clamped = [
          Math.max(minPrice, Math.min(values[0], maxPrice)),
          Math.max(minPrice, Math.min(values[1], maxPrice)),
        ] as [number, number]
        if (clamped[0] <= clamped[1]) {
          setPriceRange(clamped)
        }
      }}
      renderTrack={({ props, children }) => {
        const [minVal, maxVal] = priceRange
        const rangePercent = maxPrice !== minPrice
          ? ((maxVal - minVal) / (maxPrice - minPrice)) * 100
          : 0
        const leftPercent = maxPrice !== minPrice
          ? ((minVal - minPrice) / (maxPrice - minPrice)) * 100
          : 0

        return (
          <div
            {...props}
            style={{
              ...props.style,
              height: '6px',
              background: '#e5e7eb',
              borderRadius: '4px',
              position: 'relative',
            }}
            className="mt-2"
          >
            <div
              style={{
                position: 'absolute',
                height: '100%',
                backgroundColor: '#093A23',
                borderRadius: '4px',
                left: `${leftPercent}%`,
                width: `${rangePercent}%`,
                zIndex: 1,
              }}
            />
            {children}
          </div>
        )
      }}
      renderThumb={({ props, isDragged }) => {
        const { key, ...rest } = props
        return (
          <div
            key={key}
            {...rest}
            style={{
              ...rest.style,
              height: '13px',
              width: '13px',
              backgroundColor: '#093A23',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: isDragged ? '0 0 0 4px rgba(9, 58, 35, 0.2)' : 'none',
              transition: 'box-shadow 0.2s ease',
            }}
          />
        )
      }}
    />
  </div>
</div>

  {/* Espace (1 colonne) */}
  <div className="col-span-3" />

  {/* Tri (3 colonnes) */}
  <div className="col-span-5">
    <select
      value={sortOption}
      onChange={e => setSortOption(e.target.value)}
      className="w-full border border-gray-300 px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#093A23] focus:border-transparent bg-white"
    >
      <option value="">📊 Trier par</option>
      <option value="name-asc">Nom A → Z</option>
      <option value="name-desc">Nom Z → A</option>
      <option value="price-asc">Prix croissant</option>
      <option value="price-desc">Prix décroissant</option>
      <option value="category-asc">Catégorie A → Z</option>
      <option value="date-desc">Ajout récent</option>
      <option value="date-asc">Ajout ancien</option>
    </select>
  </div>

  {/* Espace (1 colonne) */}
  <div className="col-span-1" />

  {/* Reset (3 colonnes) */}
  <div className="col-span-5">
    <button
      onClick={handleResetFilters}
      className="w-full text-[#093A23] hover:text-[#0b472c] font-medium text-sm h-10 px-4 rounded-lg border border-[#093A23] hover:bg-[#093A23] hover:text-white transition-all"
    >
      ↺ Réinitialiser
    </button>
  </div>
</div>
</div>

        {/* Filtres ligne 2 : catégories */}
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="text-sm font-medium text-gray-700 mr-2 flex items-center">🏷️ Catégories :</span>
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryToggle(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                filterCategories.includes(cat)
                  ? 'bg-gradient-to-r from-[#093A23] to-[#0d5534] text-white border-[#093A23] shadow-md'
                  : 'border-gray-300 text-gray-700 hover:border-[#093A23] hover:text-[#093A23]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Liste produits */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">⏳</div>
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : productsFiltered.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {productsFiltered.map(product => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-lg transition-all">
                <div className="w-full aspect-[4/3] relative bg-gradient-to-br from-gray-50 to-gray-100">
                  {images[product.id] ? (
                    <img src={images[product.id]} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <span className="text-4xl mb-2">📷</span>
                      <span className="text-xs">Pas d'image</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-semibold text-base leading-tight text-gray-900 line-clamp-2">{product.name}</h3>
                    <div className="relative" ref={el => void(menuRefs.current[product.id] = el)}>
                      <button
                        onClick={() => setActiveMenuProductId(prev => prev === product.id ? null : product.id)}
                        className="text-gray-400 hover:text-gray-700 text-xl p-1 rounded-full hover:bg-gray-100 transition"
                      >
                        ⋯
                      </button>
                      {activeMenuProductId === product.id && (
                        <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg text-sm z-20 w-44 overflow-hidden">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedProduct(product)
                              setEditModalOpen(true)
                              setActiveMenuProductId(null)
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center gap-2"
                          >
                            <span>✏️</span> Modifier
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setProductToDelete(product.id)
                              setConfirmOpen(true)
                              setActiveMenuProductId(null)
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 transition flex items-center gap-2 border-t border-gray-100"
                          >
                            <span>🗑️</span> Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-[#093A23]">{product.price} €</p>
                    {product.category && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{product.category}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-500 text-lg mb-2">Aucun produit trouvé</p>
            <button 
              onClick={handleResetFilters}
              className="mt-4 text-[#093A23] hover:text-[#0b472c] font-medium underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </main>

      <ProductModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onProductAdded={fetchProduits} />
      <EditProductModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} onProductUpdated={fetchProduits} product={selectedProduct} />
      <ConfirmDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmDeleteProduct} message="Souhaitez-vous vraiment supprimer ce produit ?" />
    </>
  )
}

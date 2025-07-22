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
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Catalogue produits</h1>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-[#093A23] hover:bg-[#0b472c] text-white px-4 py-2 rounded font-medium transition"
          >
            + Ajouter un produit
          </button>
        </div>

      {/* Filtres ligne 1 avec grille 13 colonnes */}
<div className="grid grid-cols-36 gap-y-5 items-start mb-6 w-full">
  {/* Recherche (4 colonnes) */}
  <div className="col-span-12">
    <input
      type="text"
      placeholder="🔍 Rechercher"
      value={searchTerm}
      onChange={e => setSearchTerm(e.target.value)}
      className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm font-poppins"
    />
  </div>

  {/* Espace (1 colonne) */}
  <div className="col-span-3" />

  {/* Prix (3 colonnes) */}
  <div className="col-span-7">
    <label className="text-xs text-gray-600 font-medium mb-1 block">
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
        renderThumb={({ props, isDragged }) => (
          <div
            {...props}
            style={{
              ...props.style,
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
        )}
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
      className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm font-poppins"
    >
      <option value="">Trier par</option>
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
      className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm h-9 px-4 rounded-md"
    >
      Réinitialiser
    </button>
  </div>
</div>



        {/* Filtres ligne 2 : catégories */}
        <div className="flex flex-wrap gap-2 mb-6">
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryToggle(cat)}
              className={`px-3 py-1 rounded-full text-sm font-poppins border ${
                filterCategories.includes(cat)
                  ? 'bg-[#093A23] text-white border-[#093A23]'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Liste produits */}
        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : productsFiltered.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {productsFiltered.map(product => (
              <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm relative group hover:shadow-md transition">
                <div className="w-full aspect-[4/3] relative mb-3 rounded overflow-hidden bg-gray-100">
                  {images[product.id] ? (
                    <img src={images[product.id]} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">Pas d’image</div>
                  )}
                </div>

                <div className="flex justify-between items-start gap-2 mb-1">
                  <p className="font-medium text-base leading-tight">{product.name}</p>
                  <div className="relative" ref={el => void(menuRefs.current[product.id] = el)}>
                    <button
                      onClick={() => setActiveMenuProductId(prev => prev === product.id ? null : product.id)}
                      className="text-gray-500 hover:text-black text-lg"
                    >
                      ⋯
                    </button>
                    {activeMenuProductId === product.id && (
                      <div className="absolute right-0 mt-2 bg-white border rounded shadow text-sm z-20 w-44">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedProduct(product)
                            setEditModalOpen(true)
                            setActiveMenuProductId(null)
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                        >
                          ✏️ Modifier
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setProductToDelete(product.id)
                            setConfirmOpen(true)
                            setActiveMenuProductId(null)
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600">{product.price} €</p>
                {product.category && (
                  <p className="text-xs text-gray-400 mt-1">{product.category}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Aucun produit pour le moment.</p>
        )}
      </main>

      <ProductModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onProductAdded={fetchProduits} />
      <EditProductModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} onProductUpdated={fetchProduits} product={selectedProduct} />
      <ConfirmDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmDeleteProduct} message="Souhaitez-vous vraiment supprimer ce produit ?" />
    </>
  )
}

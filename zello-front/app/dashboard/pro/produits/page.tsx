'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import ProductModal from '@/components/ProductModal'

export default function ProduitsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [images, setImages] = useState<Record<string, string>>({})

  const fetchImage = async (path: string, productId: string) => {
    const { data, error } = await supabase.storage
      .from('product-images')
      .download(path)

    if (error) {
      console.error(`❌ Erreur download image pour ${productId}:`, error)
      return
    }

    const url = URL.createObjectURL(data)
    setImages(prev => ({ ...prev, [productId]: url }))
  }

  const fetchProduits = async () => {
    setLoading(true)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      console.error('❌ Erreur récupération utilisateur:', userError)
      setLoading(false)
      return
    }

    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.id)
      .single()

    if (fetchError || !userData?.active_store_id) {
      console.error('❌ Erreur récupération store ID:', fetchError)
      setLoading(false)
      return
    }

    const { data: produits, error: produitsError } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', userData.active_store_id)
      .order('created_at', { ascending: false })

    if (produitsError) {
      console.error('❌ Erreur chargement produits:', produitsError)
      setLoading(false)
      return
    }

    setProducts(produits || [])

    // 📦 Télécharger les images liées
    for (const produit of produits || []) {
      if (produit.image_path) {
        fetchImage(produit.image_path, produit.id)
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchProduits()
  }, [])

  return (
    <>
      <main className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Catalogue produits</h1>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-[#093A23] text-white px-4 py-2 rounded font-medium"
          >
            + Ajouter un produit
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Chargement...</p>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white p-4 rounded shadow flex flex-col items-start"
              >
                <div className="w-full aspect-[4/3] relative mb-2 rounded overflow-hidden">
                  {images[product.id] ? (
                    <img
                      src={images[product.id]}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                      Pas d’image
                    </div>
                  )}
                </div>

                <p className="font-medium">{product.name}</p>
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

      {/* Modal d’ajout */}
      <ProductModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onProductAdded={fetchProduits}
      />
    </>
  )
}

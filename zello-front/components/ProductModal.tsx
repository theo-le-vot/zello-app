'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onProductAdded: () => void
}

export default function ProductModal({ isOpen, onClose, onProductAdded }: ProductModalProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageFile: null as File | null,
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const fetchStoreId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userDetails, error } = await supabase
        .from('users')
        .select('active_store_id')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Erreur récupération active_store_id :', error)
        return
      }

      setActiveStoreId(userDetails?.active_store_id || null)
    }

    if (isOpen) fetchStoreId()
  }, [isOpen])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setForm(prev => ({ ...prev, imageFile: file }))
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', category: '', imageFile: null })
    setPreviewUrl(null)
  }

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert("Utilisateur non connecté.")
      return
    }

    console.log('🧾 Formulaire produit :', {
      userId: user.id,
      storeId: activeStoreId,
      name: form.name,
      price: form.price,
      category: form.category,
    })

    if (!form.name || !form.price || !activeStoreId) {
      alert('Veuillez remplir tous les champs obligatoires.')
      return
    }

    const parsedPrice = parseFloat(form.price)
    if (isNaN(parsedPrice)) {
      alert("Le prix doit être un nombre valide.")
      return
    }

    setLoading(true)
    let image_path = null

    if (form.imageFile) {
      // 🔒 Upload dans un bucket privé
      const fileExt = form.imageFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `products/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, form.imageFile)

      if (uploadError) {
        console.error('❌ Erreur upload:', uploadError)
        alert("Erreur lors de l'upload de l'image.")
        setLoading(false)
        return
      }

      image_path = filePath // On stocke seulement le chemin
    }

    const { error } = await supabase.from('products').insert({
      name: form.name,
      description: form.description,
      price: parsedPrice,
      category: form.category,
      store_id: activeStoreId,
      image_path: image_path, // 🔒 Stockage du chemin privé
      available: true,
    })

    setLoading(false)

    if (!error) {
      onProductAdded()
      onClose()
      resetForm()
    } else {
      console.error('❌ Erreur insert produit:', error)
      alert("Une erreur est survenue lors de l'ajout du produit.")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative animate-in fade-in duration-200">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-xl font-semibold text-[#093A23]">Ajouter un produit</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Nom du produit */}
          <div className="relative">
            <input
              type="text"
              id="product-name"
              required
              placeholder=" "
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="peer h-12 w-full border border-gray-300 rounded-lg px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23] focus:ring-2 focus:ring-[#093A23]/10 transition-all"
            />
            <label
              htmlFor="product-name"
              className="absolute left-4 text-gray-500 text-sm transition-all font-medium pointer-events-none
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23] top-1"
            >
              Nom du produit *
            </label>
          </div>

          {/* Description */}
          <div className="relative">
            <textarea
              id="product-description"
              placeholder=" "
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="peer w-full border border-gray-300 rounded-lg px-4 pt-5 pb-2 placeholder-transparent focus:outline-none focus:border-[#093A23] focus:ring-2 focus:ring-[#093A23]/10 transition-all resize-none"
            />
            <label
              htmlFor="product-description"
              className="absolute left-4 text-gray-500 text-sm transition-all font-medium pointer-events-none
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23] top-1"
            >
              Description
            </label>
          </div>

          {/* Prix et Catégorie côte à côte */}
          <div className="grid grid-cols-2 gap-4">
            {/* Prix */}
            <div className="relative">
              <input
                type="number"
                step="0.01"
                id="product-price"
                required
                placeholder=" "
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                className="peer h-12 w-full border border-gray-300 rounded-lg px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23] focus:ring-2 focus:ring-[#093A23]/10 transition-all"
              />
              <label
                htmlFor="product-price"
                className="absolute left-4 text-gray-500 text-sm transition-all font-medium pointer-events-none
                  peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                  peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23] top-1"
              >
                Prix (€) *
              </label>
            </div>

            {/* Catégorie */}
            <div className="relative">
              <input
                type="text"
                id="product-category"
                placeholder=" "
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="peer h-12 w-full border border-gray-300 rounded-lg px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23] focus:ring-2 focus:ring-[#093A23]/10 transition-all"
              />
              <label
                htmlFor="product-category"
                className="absolute left-4 text-gray-500 text-sm transition-all font-medium pointer-events-none
                  peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                  peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23] top-1"
              >
                Catégorie
              </label>
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image du produit
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-[#093A23] hover:text-[#093A23] transition-all"
              >
                {form.imageFile ? 'Changer l\'image' : 'Choisir une image'}
              </button>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="hidden"
              />
              {previewUrl && (
                <div className="relative">
                  <img src={previewUrl} alt="Aperçu" className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200" />
                  <button
                    onClick={() => {
                      setForm(prev => ({ ...prev, imageFile: null }))
                      setPreviewUrl(null)
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white text-sm font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Ajout en cours...' : 'Ajouter le produit'}
          </button>
        </div>
      </div>
    </div>
  )
}

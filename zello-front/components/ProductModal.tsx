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
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <h2 className="text-lg font-semibold mb-4">Ajouter un produit</h2>

        <div className="space-y-4">
          {/* Nom du produit */}
          <div className="relative">
            <input
              type="text"
              id="product-name"
              required
              placeholder=" "
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="peer h-12 w-full border border-gray-300 rounded px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23]"
            />
            <label
              htmlFor="product-name"
              className="absolute left-4 text-gray-500 text-sm transition-all font-medium
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23]"
            >
              Nom du produit *
            </label>
          </div>

          {/* Description */}
          <div className="relative">
            <input
              type="text"
              id="product-description"
              placeholder=" "
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="peer h-12 w-full border border-gray-300 rounded px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23]"
            />
            <label
              htmlFor="product-description"
              className="absolute left-4 text-gray-500 text-sm transition-all font-medium
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23]"
            >
              Description
            </label>
          </div>

          {/* Prix */}
          <div className="relative">
            <input
              type="number"
              id="product-price"
              required
              placeholder=" "
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              className="peer h-12 w-full border border-gray-300 rounded px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23]"
            />
            <label
              htmlFor="product-price"
              className="absolute left-4 text-gray-500 text-sm transition-all font-medium
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23]"
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
              className="peer h-12 w-full border border-gray-300 rounded px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23]"
            />
            <label
              htmlFor="product-category"
              className="absolute left-4 text-gray-500 text-sm transition-all font-medium
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23]"
            >
              Catégorie
            </label>
          </div>

          {/* Image */}
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              ref={fileInputRef}
              className="text-sm"
            />
            {previewUrl && (
              <img src={previewUrl} alt="Aperçu" className="w-12 h-12 object-cover rounded" />
            )}
          </div>
        </div>

        {/* Boutons */}
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 text-sm font-medium">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded bg-[#093A23] text-white text-sm font-medium"
            disabled={loading}
          >
            {loading ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

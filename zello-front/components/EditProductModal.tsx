'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface EditProductModalProps {
  isOpen: boolean
  onClose: () => void
  onProductUpdated: () => void
  product: any
}

export default function EditProductModal({
  isOpen,
  onClose,
  onProductUpdated,
  product
}: EditProductModalProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageFile: null as File | null,
  })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (product && isOpen) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        category: product.category || '',
        imageFile: null,
      })

      if (product.image_path) {
        supabase
          .storage
          .from('product-images')
          .download(product.image_path)
          .then(({ data, error }) => {
            if (!error && data) {
              const url = URL.createObjectURL(data)
              setPreviewUrl(url)
            }
          })
      }
    }
  }, [product, isOpen])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setForm(prev => ({ ...prev, imageFile: file }))
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async () => {
    if (!product) return

    const parsedPrice = parseFloat(form.price)
    if (!form.name || isNaN(parsedPrice)) {
      alert('Veuillez remplir les champs obligatoires.')
      return
    }

    setLoading(true)

    let image_path = product.image_path

    if (form.imageFile) {
      const fileExt = form.imageFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `products/${fileName}`

      const { error: uploadError } = await supabase
        .storage
        .from('product-images')
        .upload(filePath, form.imageFile)

      if (uploadError) {
        alert("Erreur lors de l'upload de l'image.")
        setLoading(false)
        return
      }

      image_path = filePath
    }

    const { error } = await supabase
      .from('products')
      .update({
        name: form.name,
        description: form.description,
        price: parsedPrice,
        category: form.category,
        image_path: image_path,
      })
      .eq('id', product.id)

    setLoading(false)

    if (!error) {
      onProductUpdated()
      onClose()
    } else {
      alert("Erreur lors de la mise à jour.")
      console.error(error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <h2 className="text-lg font-semibold mb-4">Modifier le produit</h2>

        <div className="space-y-4">
          {/* Nom */}
          <div className="relative">
            <input
              type="text"
              id="edit-name"
              placeholder=" "
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="peer h-12 w-full border border-gray-300 rounded px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23]"
            />
            <label
              htmlFor="edit-name"
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
              id="edit-description"
              placeholder=" "
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="peer h-12 w-full border border-gray-300 rounded px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23]"
            />
            <label
              htmlFor="edit-description"
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
              id="edit-price"
              placeholder=" "
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              className="peer h-12 w-full border border-gray-300 rounded px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23]"
            />
            <label
              htmlFor="edit-price"
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
              id="edit-category"
              placeholder=" "
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="peer h-12 w-full border border-gray-300 rounded px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23]"
            />
            <label
              htmlFor="edit-category"
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
              <img
                src={previewUrl}
                alt="Aperçu"
                className="w-12 h-12 object-cover rounded"
              />
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
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

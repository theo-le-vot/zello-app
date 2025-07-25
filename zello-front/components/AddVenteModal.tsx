'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface AddVenteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface Produit {
  id: string
  name: string
  price: number
}

export default function AddVenteModal({ isOpen, onClose, onSuccess }: AddVenteModalProps) {
  const [selectedType, setSelectedType] = useState<'ticket' | 'by-item' | 'global'>('ticket')
  const [date, setDate] = useState('')
  const [montantGlobal, setMontantGlobal] = useState('')
  const [produits, setProduits] = useState<Produit[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
    fetchProduits()
  }, [])

  const fetchProduits = async () => {
    const { data: user } = await supabase.auth.getUser()
    const { data: userInfo } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.user?.id)
      .single()

    const { data: produits } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('store_id', userInfo?.active_store_id)

    if (produits) setProduits(produits)
  }

  const addItem = () => {
    setItems(prev => [...prev, { produitId: '', customName: '', customPrice: '', quantity: 1 }])
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  const handleSubmitGlobal = async () => {
    if (!montantGlobal || !date) return
    setLoading(true)

    const { data: user } = await supabase.auth.getUser()
    const { data: userInfo } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.user?.id)
      .single()

    const { error } = await supabase.from('transactions').insert({
      store_id: userInfo?.active_store_id,
      user_id: user.user?.id,
      total_amount: parseFloat(montantGlobal),
      payment_method: 'cash',
      is_refunded: false,
      date,
      transaction_type_code: 'daily_total' // 👈 ajouté ici
    })

    if (error) {
      console.error('❌ Erreur ajout transaction global:', error)
    } else {
      console.log('✅ Transaction globale ajoutée')
      if (onSuccess) onSuccess()
      onClose()
    }

    setLoading(false)
  }

  const handleSubmitByItem = async () => {
    if (!items.length || !date) return
    setLoading(true)

    const { data: user } = await supabase.auth.getUser()
    const { data: userInfo } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.user?.id)
      .single()

    const total = items.reduce((acc, item) => {
      const produit = produits.find(p => p.id === item.produitId)
      const prix = item.produitId ? produit?.price : parseFloat(item.customPrice)
      return acc + (prix || 0) * item.quantity
    }, 0)

    const { data: newTransaction, error } = await supabase
      .from('transactions')
      .insert({
        store_id: userInfo?.active_store_id,
        user_id: user.user?.id,
        total_amount: total,
        payment_method: 'cash',
        is_refunded: false,
        date,
        transaction_type_code: 'daily_by_item' // 👈 ajouté ici
      })
      .select()
      .single()

    if (error || !newTransaction) {
      console.error('❌ Erreur ajout transaction:', error)
      setLoading(false)
      return
    }

    const lignes = items.map(item => {
      const produit = produits.find(p => p.id === item.produitId)
      const prix = item.produitId ? produit?.price : parseFloat(item.customPrice)
      return {
        transaction_id: newTransaction.id,
        product_id: item.produitId || null,
        quantity: item.quantity,
        unit_price: prix || 0
      }
    })

    const { error: lignesError } = await supabase.from('transaction_products').insert(lignes)

    if (lignesError) {
      console.error('❌ Erreur ajout lignes produits:', lignesError)
    } else {
      console.log('✅ Lignes produits ajoutées')
      if (onSuccess) onSuccess()
      onClose()
    }

    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Ajouter une vente</h2>

        {/* Sélecteur de type */}
        <div className="flex border border-gray-300 rounded overflow-hidden mb-6">
          <button
            onClick={() => setSelectedType('ticket')}
            className={`w-1/3 px-3 py-2 text-sm font-medium ${selectedType === 'ticket' ? 'bg-gray-300 text-gray-600' : 'bg-white text-black'}`}
            disabled
          >
            Vente unitaire (⏳ bientôt)
          </button>
          <button
            onClick={() => setSelectedType('by-item')}
            className={`w-1/3 px-3 py-2 text-sm font-medium ${selectedType === 'by-item' ? 'bg-[#093A23] text-white' : 'bg-white text-black'}`}
          >
            Journalière (articles)
          </button>
          <button
            onClick={() => setSelectedType('global')}
            className={`w-1/3 px-3 py-2 text-sm font-medium ${selectedType === 'global' ? 'bg-[#093A23] text-white' : 'bg-white text-black'}`}
          >
            Journalière (total)
          </button>
        </div>

        {/* Formulaire Global */}
        {selectedType === 'global' && (
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSubmitGlobal() }}>
            <input
              type="number"
              placeholder="Montant total (€)"
              value={montantGlobal}
              onChange={e => setMontantGlobal(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />
            <button type="submit" className="w-full bg-[#093A23] text-white py-2 rounded" disabled={loading}>
              Valider
            </button>
          </form>
        )}

        {/* Formulaire par article */}
        {selectedType === 'by-item' && (
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSubmitByItem() }}>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />

            {items.map((item, i) => (
              <div key={i} className="border rounded p-3 space-y-2">
                <select
                  value={item.produitId}
                  onChange={e => updateItem(i, 'produitId', e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                >
                  <option value="">Autre (manuel)</option>
                  {produits.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                {item.produitId === '' && (
                  <>
                    <input
                      type="text"
                      placeholder="Nom"
                      value={item.customName}
                      onChange={e => updateItem(i, 'customName', e.target.value)}
                      className="w-full border px-3 py-2 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Prix unitaire (€)"
                      value={item.customPrice}
                      onChange={e => updateItem(i, 'customPrice', e.target.value)}
                      className="w-full border px-3 py-2 rounded"
                    />
                  </>
                )}

                <input
                  type="number"
                  placeholder="Quantité"
                  min={1}
                  value={item.quantity}
                  onChange={e => updateItem(i, 'quantity', parseInt(e.target.value))}
                  className="w-full border px-3 py-2 rounded"
                />

                {item.produitId && (
                  <p className="text-sm text-gray-500">
                    Prix conseillé : {produits.find(p => p.id === item.produitId)?.price} €
                  </p>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              className="w-full text-sm bg-gray-100 hover:bg-gray-200 py-2 rounded"
            >
              + Ajouter un article
            </button>

            <button type="submit" className="w-full bg-[#093A23] text-white py-2 rounded" disabled={loading}>
              Valider la vente
            </button>
          </form>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full text-sm text-gray-500 hover:text-black underline"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

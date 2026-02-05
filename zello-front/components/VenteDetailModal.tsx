'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface VenteDetailModalProps {
  isOpen: boolean
  onClose: () => void
  venteId: string | null
  onSuccess: () => void
}

interface Product {
  id: string
  name: string
  price: number
}

interface TransactionProduct {
  id: string
  quantity: number
  unit_price: number
  product?: Product | null
}

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
}

interface VenteDetail {
  id: string
  date: string
  total_amount: number
  payment_method: string
  customer_id?: string | null
  transaction_type: {
    label: string
    code: string
  } | null
  customer?: Customer | null
  transaction_products?: TransactionProduct[]
}

export default function VenteDetailModal({ isOpen, onClose, venteId, onSuccess }: VenteDetailModalProps) {
  const [vente, setVente] = useState<VenteDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedDate, setEditedDate] = useState('')
  const [editedPayment, setEditedPayment] = useState('')

  useEffect(() => {
    if (isOpen && venteId) {
      fetchVenteDetail()
    }
  }, [isOpen, venteId])

  const fetchVenteDetail = async () => {
    if (!venteId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          date,
          total_amount,
          payment_method,
          customer_id,
          transaction_type:transaction_type_code (
            label,
            code
          ),
          transaction_products (
            id,
            quantity,
            unit_price,
            product:products (
              id,
              name,
              price
            )
          )
        `)
        .eq('id', venteId)
        .single()

      if (error) throw error

      // Récupérer les informations du client si présent
      let customerData = null
      if (data.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email, phone')
          .eq('id', data.customer_id)
          .single()
        
        customerData = customer
      }

      const cleanData: VenteDetail = {
        ...data,
        transaction_type: Array.isArray(data.transaction_type)
          ? data.transaction_type[0] ?? null
          : data.transaction_type ?? null,
        customer: customerData
      }

      setVente(cleanData)
      setEditedDate(cleanData.date.split('T')[0])
      setEditedPayment(cleanData.payment_method || '')
    } catch (error) {
      console.error('Erreur chargement détails:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!vente) return

    console.log('Début mise à jour vente:', vente.id)
    console.log('Date éditée:', editedDate)
    console.log('Paiement édité:', editedPayment)

    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          date: editedDate, // Format YYYY-MM-DD pour une colonne de type DATE
          payment_method: editedPayment
        })
        .eq('id', vente.id)
        .select()

      console.log('Résultat update:', { data, error })

      if (error) {
        console.error('Erreur Supabase:', error)
        alert(`Erreur de mise à jour: ${error.message}`)
        return
      }

      if (data && data.length === 0) {
        console.warn('Aucune ligne modifiée - vérifier les politiques RLS')
        alert('Aucune modification effectuée. Vérifiez vos permissions.')
        return
      }

      console.log('Mise à jour réussie!', data)
      alert('Vente modifiée avec succès!')
      onSuccess()
      setIsEditing(false)
      await fetchVenteDetail()
    } catch (error: any) {
      console.error('Erreur mise à jour:', error)
      alert('Erreur lors de la mise à jour: ' + (error?.message || 'Erreur inconnue'))
    }
  }

  const handleDelete = async () => {
    if (!vente) return

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vente ?')) return

    console.log('Début suppression vente:', vente.id)

    try {
      // Supprimer d'abord les produits liés
      console.log('Suppression des produits liés...')
      const { data: productsData, error: productsError } = await supabase
        .from('transaction_products')
        .delete()
        .eq('transaction_id', vente.id)
        .select()

      console.log('Résultat suppression produits:', { productsData, productsError })

      if (productsError) {
        console.error('Erreur suppression produits:', productsError)
        alert(`Erreur lors de la suppression des produits: ${productsError.message}`)
        return
      }

      // Puis la transaction
      console.log('Suppression de la transaction...')
      const { data: transactionData, error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', vente.id)
        .select()

      console.log('Résultat suppression transaction:', { transactionData, error })

      if (error) {
        console.error('Erreur suppression transaction:', error)
        alert(`Erreur lors de la suppression de la transaction: ${error.message}`)
        return
      }

      console.log('Suppression réussie!')
      alert('Vente supprimée avec succès!')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Erreur suppression:', error)
      alert('Erreur lors de la suppression: ' + (error?.message || 'Erreur inconnue'))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[#093A23]">📋 Détails de la vente</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl font-light transition-colors leading-none"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#093A23]"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        ) : vente ? (
          <div className="p-6 space-y-5">
            {/* Informations générales */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
              <h3 className="font-semibold text-base text-[#093A23] mb-4 flex items-center gap-2">
                <span className="text-xl">📊</span>
                Informations générales
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedDate}
                      onChange={(e) => setEditedDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#093A23] focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {new Date(vente.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Montant total</label>
                  <p className="text-2xl font-bold text-green-600">
                    {vente.total_amount.toFixed(2)} €
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Mode de paiement</label>
                  {isEditing ? (
                    <select
                      value={editedPayment}
                      onChange={(e) => setEditedPayment(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#093A23] focus:border-transparent capitalize"
                    >
                      <option value="espèces">Espèces</option>
                      <option value="carte">Carte</option>
                      <option value="chèque">Chèque</option>
                      <option value="virement">Virement</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 font-medium capitalize">{vente.payment_method}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Type de transaction</label>
                  <p className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                    {vente.transaction_type?.label || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Informations client */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-200">
              <h3 className="font-semibold text-base text-[#093A23] mb-4 flex items-center gap-2">
                <span className="text-xl">👤</span>
                Client
              </h3>
              {vente.customer ? (
                <div className="space-y-2">
                  <p className="text-gray-900 font-medium text-lg">
                    {vente.customer.first_name} {vente.customer.last_name}
                  </p>
                  <p className="text-gray-600 text-sm">📧 {vente.customer.email}</p>
                  {vente.customer.phone && (
                    <p className="text-gray-600 text-sm">📱 {vente.customer.phone}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic">Aucun client associé</p>
              )}
            </div>

            {/* Produits */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
              <h3 className="font-semibold text-base text-[#093A23] mb-4 flex items-center gap-2">
                <span className="text-xl">📦</span>
                Produits
              </h3>
              {vente.transaction_products && vente.transaction_products.length > 0 ? (
                <div className="space-y-3">
                  {vente.transaction_products.map((tp, idx) => (
                    <div key={tp.id || idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-green-200">
                      <div>
                        <p className="font-medium text-gray-900">{tp.product?.name || 'Produit'}</p>
                        <p className="text-sm text-gray-600">Quantité: {tp.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{tp.unit_price.toFixed(2)} € / unité</p>
                        <p className="font-semibold text-green-600">{(tp.quantity * tp.unit_price).toFixed(2)} €</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Aucun produit</p>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-3 pt-4 border-t">
              {isEditing ? (
                <>
                  <button
                    onClick={handleUpdate}
                    className="flex-1 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    ✓ Enregistrer
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditedDate(vente.date.split('T')[0])
                      setEditedPayment(vente.payment_method || '')
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-medium transition-all"
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>✏️</span> Modifier
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>🗑️</span> Supprimer
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            Aucune donnée disponible
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddClientModal({ isOpen, onClose, onSuccess }: AddClientModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Utilisateur non connecté.')
      setLoading(false)
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.id)
      .single()

    const storeId = userData?.active_store_id
    if (!storeId) {
      setError('Boutique non trouvée.')
      setLoading(false)
      return
    }

    try {
      // Étape 1 – Créer le client dans la table customers (sans lien avec auth)
      const { data: newCustomer, error: insertCustomerError } = await supabase
        .from('customers')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          phone_number: phone,
        })
        .select()
        .single()

      if (insertCustomerError) {
        console.error('Erreur insertion customer:', insertCustomerError)
        setError("Erreur lors de l'ajout du client : " + insertCustomerError.message)
        setLoading(false)
        return
      }

      if (!newCustomer) {
        setError("Client non créé.")
        setLoading(false)
        return
      }

      // Étape 2 – Ajouter la relation avec la boutique
      const { error: relError } = await supabase
        .from('customers_stores')
        .insert({
          customer_id: newCustomer.id,
          store_id: storeId,
          join_date: new Date().toISOString().slice(0, 10),
          points: 0,
          visits: 0,
          is_vip: false,
        })

      if (relError) {
        console.error('Erreur relation boutique:', relError)
        setError("Erreur lors de la liaison avec la boutique : " + relError.message)
        setLoading(false)
        return
      }

      // Succès
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setLoading(false)
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erreur inattendue:', err)
      setError('Erreur inattendue : ' + err.message)
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Ajouter un client</h2>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Prénom"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="text"
            placeholder="Nom"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="tel"
            placeholder="Téléphone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

        <div className="flex justify-end mt-6 space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-600 hover:text-black"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-[#093A23] text-white rounded hover:bg-[#0b472c]"
            disabled={loading}
          >
            {loading ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
  category?: string
}

interface Client {
  id: string
  customer_id: string
  points: number
  customer: {
    first_name: string
    last_name: string
    email: string
  }
}

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
}

export default function AddVenteModal({ isOpen, onClose, onSuccess }: AddVenteModalProps) {
  const [selectedType, setSelectedType] = useState<'ticket' | 'by-item' | 'global'>('ticket')
  const [date, setDate] = useState('')
  const [montantGlobal, setMontantGlobal] = useState('')
  const [produits, setProduits] = useState<Produit[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // POS - Caisse
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [searchProduct, setSearchProduct] = useState('')
  const [searchClient, setSearchClient] = useState('')
  const [dateTicket, setDateTicket] = useState('')

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
    setDateTicket(today)
    fetchProduits()
    fetchClients()
  }, [])

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0]
      setDate(today)
      setDateTicket(today)
    }
  }, [isOpen])

  const fetchProduits = async () => {
    const { data: user } = await supabase.auth.getUser()
    const { data: userInfo } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.user?.id)
      .single()

    const { data: produits } = await supabase
      .from('products')
      .select('id, name, price, category')
      .eq('store_id', userInfo?.active_store_id)

    if (produits) setProduits(produits)
  }

  const fetchClients = async () => {
    const { data: user } = await supabase.auth.getUser()
    const { data: userInfo } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.user?.id)
      .single()

    const { data } = await supabase
      .from('customers_stores')
      .select(`
        id,
        customer_id,
        points,
        customer:customers (
          first_name,
          last_name,
          email
        )
      `)
      .eq('store_id', userInfo?.active_store_id)

    if (data) {
      const cleanData = data.map((item: any) => ({
        ...item,
        customer: Array.isArray(item.customer) ? item.customer[0] : item.customer
      }))
      setClients(cleanData)
    }
  }

  const addToCart = (product: Produit) => {
    const existing = cart.find(item => item.productId === product.id)
    if (existing) {
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      }])
    }
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
    } else {
      setCart(cart.map(item =>
        item.productId === productId ? { ...item, quantity } : item
      ))
    }
  }

  const getTotalAmount = () => {
    return cart.reduce((acc, item) => acc + item.price * item.quantity, 0)
  }

  const handleSubmitTicket = async () => {
    if (!cart.length) {
      alert('Panier vide')
      return
    }
    
    setLoading(true)

    try {
      // 1. Récupérer l'utilisateur et le store
      const { data: user, error: userError } = await supabase.auth.getUser()
      if (userError || !user.user) {
        console.error('❌ Erreur récupération user:', userError)
        alert('Utilisateur non connecté')
        setLoading(false)
        return
      }

      const { data: userInfo, error: userInfoError } = await supabase
        .from('users')
        .select('active_store_id')
        .eq('id', user.user.id)
        .single()

      if (userInfoError || !userInfo?.active_store_id) {
        console.error('❌ Erreur récupération store:', userInfoError)
        alert('Store non trouvé')
        setLoading(false)
        return
      }

      console.log('✅ User et store OK:', { userId: user.user.id, storeId: userInfo.active_store_id })

      const total = getTotalAmount()
      console.log('💰 Total à payer:', total)

      // 2. Créer la transaction unitaire
      console.log('📝 Création de la transaction...')
      
      // Récupérer le customer_id si un client est sélectionné
      let customerId = null
      if (selectedClient) {
        const client = clients.find(c => c.id === selectedClient)
        customerId = client?.customer_id || null
      }
      
      const transactionData = {
        store_id: userInfo.active_store_id,
        user_id: user.user.id,
        customer_id: customerId,
        total_amount: total,
        payment_method: paymentMethod,
        is_refunded: false,
        date: dateTicket,
        transaction_type_code: 'unit_transaction'
      }
      console.log('Données transaction:', transactionData)

      const { data: newTransaction, error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single()

      if (transactionError) {
        console.error('❌ Erreur création transaction:', transactionError)
        console.error('Message:', transactionError.message)
        console.error('Détails:', transactionError.details)
        console.error('Hint:', transactionError.hint)
        alert(`Erreur: ${transactionError.message}`)
        setLoading(false)
        return
      }

      if (!newTransaction) {
        console.error('❌ Transaction non créée (pas de données retournées)')
        alert('Transaction non créée')
        setLoading(false)
        return
      }

      console.log('✅ Transaction créée avec ID:', newTransaction.id)

      // 3. Ajouter les produits
      const lignes = cart.map(item => ({
        transaction_id: newTransaction.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price
      }))
      console.log('📦 Ajout des produits:', lignes)

      const { error: lignesError } = await supabase
        .from('transaction_products')
        .insert(lignes)

      if (lignesError) {
        console.error('❌ Erreur ajout produits:', lignesError)
        alert(`Erreur lors de l'ajout des produits: ${lignesError.message}`)
        setLoading(false)
        return
      }

      console.log('✅ Produits ajoutés')

      // 4. Mettre à jour les points du client si sélectionné
      if (selectedClient) {
        const pointsToAdd = Math.floor(total)
        const client = clients.find(c => c.id === selectedClient)
        if (client) {
          console.log('🎁 Ajout de', pointsToAdd, 'points au client')
          const { error: updateError } = await supabase
            .from('customers_stores')
            .update({ 
              points: client.points + pointsToAdd,
              last_visit_at: new Date().toISOString()
            })
            .eq('id', selectedClient)

          if (updateError) {
            console.error('⚠️ Erreur mise à jour client:', updateError)
          } else {
            console.log('✅ Points mis à jour')
          }
        }
      }

      // 5. Réinitialiser et fermer
      console.log('✅ Vente enregistrée avec succès !')
      setCart([])
      setSelectedClient('')
      setPaymentMethod('cash')
      setDateTicket(new Date().toISOString().split('T')[0])
      
      // Important: appeler onSuccess AVANT onClose pour recharger les données
      if (onSuccess) {
        console.log('🔄 Rechargement des ventes...')
        await onSuccess()
      }
      
      onClose()
    } catch (err: any) {
      console.error('❌ Erreur inattendue:', err)
      console.error('Message:', err?.message)
      alert(`Erreur inattendue: ${err?.message || 'Erreur inconnue'}`)
    } finally {
      setLoading(false)
    }
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
      date
    })

    if (error) {
      console.error('❌ Erreur ajout transaction global:', error)
      alert(`Erreur: ${error.message}`)
    } else {
      console.log('✅ Transaction globale ajoutée')
      if (onSuccess) await onSuccess()
      onClose()
    }

    setLoading(false)
  }

  const handleSubmitByItem = async () => {
    if (!items.length || !date) {
      alert('Veuillez ajouter au moins un article et une date')
      return
    }
    setLoading(true)

    try {
      const { data: user } = await supabase.auth.getUser()
      const { data: userInfo } = await supabase
        .from('users')
        .select('active_store_id')
        .eq('id', user.user?.id)
        .single()

      if (!userInfo?.active_store_id) {
        alert('Store non trouvé')
        setLoading(false)
        return
      }

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
          date
        })
        .select()
        .single()

      if (error || !newTransaction) {
        console.error('❌ Erreur ajout transaction:', error)
        alert(`Erreur: ${error?.message || 'Transaction non créée'}`)
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
        alert(`Erreur: ${lignesError.message}`)
      } else {
        console.log('✅ Lignes produits ajoutées')
        setItems([])
        if (onSuccess) await onSuccess()
        onClose()
      }
    } catch (err: any) {
      console.error('❌ Erreur inattendue:', err)
      alert(`Erreur: ${err?.message || 'Erreur inconnue'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const filteredProducts = produits.filter(p =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchProduct.toLowerCase())
  )

  const filteredClients = clients.filter(c =>
    `${c.customer?.first_name} ${c.customer?.last_name}`.toLowerCase().includes(searchClient.toLowerCase()) ||
    c.customer?.email?.toLowerCase().includes(searchClient.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#093A23] to-[#0d5534] text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">💰 Point de vente</h2>
            <p className="text-sm text-green-100">Nouvelle vente</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition"
          >
            ✕
          </button>
        </div>

        {/* Sélecteur de type */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setSelectedType('ticket')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition ${selectedType === 'ticket' ? 'bg-white text-[#093A23] border-b-2 border-[#093A23]' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            🛒 Vente unitaire
          </button>
          <button
            onClick={() => setSelectedType('by-item')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition ${selectedType === 'by-item' ? 'bg-white text-[#093A23] border-b-2 border-[#093A23]' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            📝 Journalière (articles)
          </button>
          <button
            onClick={() => setSelectedType('global')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition ${selectedType === 'global' ? 'bg-white text-[#093A23] border-b-2 border-[#093A23]' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            💵 Journalière (total)
          </button>
        </div>

        <div className="p-6 overflow-hidden flex flex-col" style={{ height: 'calc(95vh - 170px)' }}>
          {/* CAISSE - Vente unitaire */}
          {selectedType === 'ticket' && (
            <div className="grid grid-cols-12 gap-4 h-full overflow-hidden">
              {/* Colonne 1 : Produits (3 colonnes plus étroites) */}
              <div className="col-span-6 flex flex-col overflow-hidden">
                <div className="mb-3 flex-shrink-0">
                  <input
                    type="text"
                    placeholder="🔍 Rechercher un produit..."
                    value={searchProduct}
                    onChange={e => setSearchProduct(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#093A23] text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2 overflow-y-auto flex-1 content-start">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="bg-white border-2 border-gray-200 rounded-lg p-2.5 hover:border-[#093A23] hover:shadow-md transition text-left flex flex-col h-20"
                    >
                      <p className="font-semibold text-gray-900 text-xs mb-0.5 line-clamp-2 flex-1">{product.name}</p>
                      <div className="flex items-end justify-between mt-auto">
                        <p className="text-sm font-bold text-[#093A23]">{product.price.toFixed(2)} €</p>
                        {product.category && (
                          <p className="text-[10px] text-gray-500">{product.category}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colonne 2 : Ticket (liste des items) */}
              <div className="col-span-3 flex flex-col overflow-hidden h-full">
                <div className="bg-gray-50 rounded-lg p-2.5 overflow-hidden flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2 flex-shrink-0">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-1.5 text-sm">
                      <span>🧾</span> Ticket
                    </h3>
                    <span className="text-xs text-gray-500">{cart.length} article{cart.length > 1 ? 's' : ''}</span>
                  </div>

                  {/* Liste des items */}
                  {cart.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-gray-400 text-xs text-center">Aucun article</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 overflow-y-auto flex-1">
                      {cart.map(item => (
                        <div key={item.productId} className="bg-white rounded-lg p-2 shadow-sm">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-medium text-xs flex-1 line-clamp-1">{item.name}</p>
                            <button
                              onClick={() => removeFromCart(item.productId)}
                              className="text-red-500 hover:text-red-700 ml-1 text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                className="bg-gray-200 hover:bg-gray-300 w-5 h-5 rounded flex items-center justify-center text-xs"
                              >
                                −
                              </button>
                              <span className="w-6 text-center font-semibold text-xs">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                className="bg-gray-200 hover:bg-gray-300 w-5 h-5 rounded flex items-center justify-center text-xs"
                              >
                                +
                              </button>
                            </div>
                            <p className="font-bold text-[#093A23] text-xs">{(item.price * item.quantity).toFixed(2)} €</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Colonne 3 : Client + Date + Total */}
              <div className="col-span-3 flex flex-col overflow-hidden h-full gap-3">
                {/* Sélection client */}
                <div className="bg-white rounded-lg p-3 border border-gray-200 flex-shrink-0 overflow-hidden flex flex-col">
                  <h3 className="font-semibold text-gray-700 mb-2 text-xs">👤 Client</h3>
                  <input
                    type="text"
                    placeholder="🔍 Rechercher un client..."
                    value={searchClient}
                    onChange={e => setSearchClient(e.target.value)}
                    className="w-full border border-gray-300 px-2 py-1.5 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-[#093A23] text-xs"
                  />
                  
                  {/* Client sélectionné */}
                  {selectedClient && (() => {
                    const clientSelected = clients.find(c => c.id === selectedClient)
                    return clientSelected ? (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-2 mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#093A23] to-[#0d5534] flex items-center justify-center text-white font-semibold text-xs">
                            {clientSelected.customer?.first_name?.[0]}{clientSelected.customer?.last_name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs text-gray-900 truncate">
                              {clientSelected.customer?.first_name} {clientSelected.customer?.last_name}
                            </p>
                            <p className="text-[10px] text-green-700">⭐ {clientSelected.points} points</p>
                          </div>
                        </div>
                        {clientSelected.customer?.phone_number && (
                          <p className="text-xs text-gray-600 truncate">📱 {clientSelected.customer.phone_number}</p>
                        )}
                        {clientSelected.customer?.email && (
                          <p className="text-xs text-gray-600 truncate">📧 {clientSelected.customer.email}</p>
                        )}
                        {clientSelected.customer?.created_at && (
                          <p className="text-xs text-gray-600">📅 Depuis le {new Date(clientSelected.customer.created_at).toLocaleDateString('fr-FR')}</p>
                        )}
                        <button
                          onClick={() => setSelectedClient('')}
                          className="w-full mt-2 bg-gray-500 text-white py-1 rounded text-xs hover:bg-gray-600 transition"
                        >
                          Désélectionner
                        </button>
                      </div>
                    ) : null
                  })()}
                  
                  {/* Liste de suggestions */}
                  {!selectedClient && searchClient && filteredClients.length > 0 && (
                    <div className="flex-1 overflow-y-auto min-h-0">
                      <p className="text-xs text-gray-500 mb-1">{filteredClients.length} client{filteredClients.length > 1 ? 's' : ''} trouvé{filteredClients.length > 1 ? 's' : ''}</p>
                      <div className="space-y-1.5">
                        {filteredClients.slice(0, 5).map(client => (
                          <button
                            key={client.id}
                            onClick={() => setSelectedClient(client.id)}
                            className="w-full bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-lg p-2 text-left transition"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#093A23] to-[#0d5534] flex items-center justify-center text-white font-semibold text-xs">
                                {client.customer?.first_name?.[0]}{client.customer?.last_name?.[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-xs text-gray-900 truncate">
                                  {client.customer?.first_name} {client.customer?.last_name}
                                </p>
                                <p className="text-[10px] text-gray-600">⭐ {client.points} points</p>
                              </div>
                            </div>
                            {client.customer?.phone_number && (
                              <p className="text-[10px] text-gray-500 truncate">📱 {client.customer.phone_number}</p>
                            )}
                            {client.customer?.email && (
                              <p className="text-[10px] text-gray-500 truncate">📧 {client.customer.email}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {!selectedClient && searchClient && filteredClients.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">Aucun client trouvé</p>
                  )}
                  
                  {!selectedClient && !searchClient && (
                    <p className="text-xs text-gray-400 text-center py-2">Recherchez ou passez sans client</p>
                  )}
                </div>

                {/* Spacer */}
                <div className="flex-1"></div>

                {/* Date de vente */}
                <div className="bg-white rounded-lg p-3 border border-gray-200 flex-shrink-0">
                  <label className="block text-xs font-medium text-gray-700 mb-1">📅 Date</label>
                  <input
                    type="date"
                    value={dateTicket}
                    onChange={e => setDateTicket(e.target.value)}
                    className="w-full border border-gray-300 px-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#093A23] text-xs"
                  />
                </div>

                {/* Total & Paiement */}
                <div className="bg-gradient-to-br from-[#093A23] to-[#0d5534] rounded-lg p-3 text-white flex-shrink-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="text-2xl font-bold">{getTotalAmount().toFixed(2)} €</span>
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-xs mb-1.5">Mode de paiement</label>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setPaymentMethod('cash')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition ${paymentMethod === 'cash' ? 'bg-white text-[#093A23]' : 'bg-white/20 hover:bg-white/30'}`}
                      >
                        💵 Espèces
                      </button>
                      <button
                        onClick={() => setPaymentMethod('card')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition ${paymentMethod === 'card' ? 'bg-white text-[#093A23]' : 'bg-white/20 hover:bg-white/30'}`}
                      >
                        💳 Carte
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitTicket}
                    disabled={loading || cart.length === 0}
                    className="w-full bg-white text-[#093A23] py-2.5 rounded-lg font-bold text-base hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Traitement...' : '✓ Valider la vente'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Formulaire Global */}
          {selectedType === 'global' && (
            <div className="flex items-center justify-center h-full">
              <form className="space-y-4 max-w-md w-full" onSubmit={e => { e.preventDefault(); handleSubmitGlobal() }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">💰 Montant total</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00 €"
                    value={montantGlobal}
                    onChange={e => setMontantGlobal(e.target.value)}
                    className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#093A23]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">📅 Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#093A23]"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-[#093A23] to-[#0d5534] text-white py-3 rounded-lg font-semibold hover:shadow-lg transition"
                  disabled={loading}
                >
                  {loading ? 'Traitement...' : '✓ Valider'}
                </button>
              </form>
            </div>
          )}

          {/* Formulaire par article */}
          {selectedType === 'by-item' && (
            <div className="h-full overflow-y-auto">
              <form className="space-y-4 max-w-2xl mx-auto" onSubmit={e => { e.preventDefault(); handleSubmitByItem() }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">📅 Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#093A23]"
                    required
                  />
                </div>

                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">Article {i + 1}</span>
                        <button
                          type="button"
                          onClick={() => setItems(items.filter((_, index) => index !== i))}
                          className="text-red-500 hover:text-red-700"
                        >
                          🗑️
                        </button>
                      </div>
                      
                      <select
                        value={item.produitId}
                        onChange={e => updateItem(i, 'produitId', e.target.value)}
                        className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#093A23] bg-white"
                      >
                        <option value="">Autre (manuel)</option>
                        {produits.map(p => (
                          <option key={p.id} value={p.id}>{p.name} - {p.price}€</option>
                        ))}
                      </select>

                      {item.produitId === '' && (
                        <>
                          <input
                            type="text"
                            placeholder="Nom du produit"
                            value={item.customName}
                            onChange={e => updateItem(i, 'customName', e.target.value)}
                            className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#093A23]"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Prix unitaire (€)"
                            value={item.customPrice}
                            onChange={e => updateItem(i, 'customPrice', e.target.value)}
                            className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#093A23]"
                          />
                        </>
                      )}

                      <input
                        type="number"
                        placeholder="Quantité"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateItem(i, 'quantity', parseInt(e.target.value))}
                        className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#093A23]"
                      />

                      {item.produitId && (
                        <p className="text-sm text-gray-600 bg-white px-3 py-2 rounded">
                          Prix : {produits.find(p => p.id === item.produitId)?.price} € × {item.quantity} = <strong>{(produits.find(p => p.id === item.produitId)?.price || 0) * item.quantity} €</strong>
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="w-full text-sm bg-gray-100 hover:bg-gray-200 py-3 rounded-lg font-medium border-2 border-dashed border-gray-300"
                >
                  + Ajouter un article
                </button>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total</span>
                    <span className="text-2xl font-bold text-[#093A23]">
                      {items.reduce((acc, item) => {
                        const produit = produits.find(p => p.id === item.produitId)
                        const prix = item.produitId ? produit?.price : parseFloat(item.customPrice)
                        return acc + (prix || 0) * item.quantity
                      }, 0).toFixed(2)} €
                    </span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-[#093A23] to-[#0d5534] text-white py-3 rounded-lg font-semibold hover:shadow-lg transition"
                  disabled={loading}
                >
                  {loading ? 'Traitement...' : '✓ Valider la vente'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

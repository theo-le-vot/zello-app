'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useStore } from '@/lib/contexts/StoreContext'
import AddVenteModal from '@/components/AddVenteModal'
import VenteDetailModal from '@/components/VenteDetailModal'
import { Range } from 'react-range'

interface Vente {
  id: string
  date: string
  total_amount: number
  payment_method: string
  customer_id?: string | null
  transaction_type: {
    label: string
    code: string
  } | null
  customer?: {
    first_name: string
    last_name: string
    email: string
  } | null
  transaction_products?: Array<{
    quantity: number
    product?: {
      name: string
    } | null
  }>
}

export default function VentesPage() {
  const { refreshTrigger } = useStore()
  const [ventes, setVentes] = useState<Vente[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedVenteId, setSelectedVenteId] = useState<string | null>(null)

  const [typeFilter, setTypeFilter] = useState<string>('')
  const [sortOption, setSortOption] = useState<string>('')
  const [minAmount, setMinAmount] = useState(0)
  const [maxAmount, setMaxAmount] = useState(1000)
  const [amountRange, setAmountRange] = useState<[number, number]>([0, 1000])
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchVentes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.id)
      .single()

    if (!userData?.active_store_id) return

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
          quantity,
          product:products (
            name
          )
        )
      `)
      .eq('store_id', userData.active_store_id)
      .order('date', { ascending: false })

    if (error) {
      console.error('Erreur chargement ventes :', error)
      return
    }

    console.log('Données brutes transactions:', data)

    // Récupérer les informations des clients séparément
    const customerIds = [...new Set((data || []).map((t: any) => t.customer_id).filter(Boolean))]
    let customersMap = new Map()

    if (customerIds.length > 0) {
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email')
        .in('id', customerIds)

      console.log('Données clients:', customersData)

      if (customersData) {
        customersData.forEach((c: any) => {
          customersMap.set(c.id, c)
        })
      }
    }

    const cleanData: Vente[] = (data || []).map((v: any) => ({
      ...v,
      transaction_type: Array.isArray(v.transaction_type)
        ? v.transaction_type[0] ?? null
        : v.transaction_type ?? null,
      customer: v.customer_id ? customersMap.get(v.customer_id) || null : null
    }))

    const amounts = cleanData.map(v => v.total_amount)
    const min = Math.min(...amounts)
    const max = Math.max(...amounts)

    setMinAmount(min)
    setMaxAmount(max)
    setAmountRange([min, max])
    setVentes(cleanData)
  }

  useEffect(() => {
    fetchVentes()
  }, [refreshTrigger])

  const filteredVentes = ventes
    .filter(v => !typeFilter || v.transaction_type?.code === typeFilter)
    .filter(v => {
      if (startDate && new Date(v.date) < new Date(startDate)) return false
      if (endDate && new Date(v.date) > new Date(endDate)) return false
      return true
    })
    .filter(v => v.total_amount >= amountRange[0] && v.total_amount <= amountRange[1])
    .filter(v => v.transaction_type?.label?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    .sort((a, b) => {
      switch (sortOption) {
        case 'amount-asc': return a.total_amount - b.total_amount
        case 'amount-desc': return b.total_amount - a.total_amount
        case 'date-asc': return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'date-desc': return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'label-asc': return (a.transaction_type?.label || '').localeCompare(b.transaction_type?.label || '')
        case 'label-desc': return (b.transaction_type?.label || '').localeCompare(a.transaction_type?.label || '')
        default: return 0
      }
    })

  const uniqueTypes = Array.from(new Set(ventes.map(v => v.transaction_type?.code).filter(Boolean)))
  const uniqueTypeOptions = uniqueTypes.map(code => {
    const label = ventes.find(v => v.transaction_type?.code === code)?.transaction_type?.label
    return { code, label }
  })

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#093A23] mb-1">Historique des ventes</h1>
          <p className="text-gray-600 text-sm">{filteredVentes.length} vente{filteredVentes.length > 1 ? 's' : ''} trouvée{filteredVentes.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white px-6 py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          Ajouter une vente
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-xl">🔍</span>
          Filtres et recherche
        </h2>
        <div className="grid md:grid-cols-12 gap-4 text-sm">
        <input
          type="text"
          placeholder="🔍 Rechercher un type"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="col-span-3 border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#093A23] focus:border-transparent"
        />

        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="col-span-2 border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#093A23] focus:border-transparent"
        />

        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="col-span-2 border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#093A23] focus:border-transparent"
        />

        <select
          value={sortOption}
          onChange={e => setSortOption(e.target.value)}
          className="col-span-2 border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#093A23] focus:border-transparent bg-white"
        >
          <option value="">📊 Tri</option>
          <option value="amount-asc">Montant croissant</option>
          <option value="amount-desc">Montant décroissant</option>
          <option value="date-asc">Anciennes d’abord</option>
          <option value="date-desc">Récentes d’abord</option>
          <option value="label-asc">Type A → Z</option>
          <option value="label-desc">Type Z → A</option>
        </select>

        <button
          onClick={() => {
            setTypeFilter('')
            setSortOption('')
            setSearchTerm('')
            setAmountRange([minAmount, maxAmount])
            setStartDate('')
            setEndDate('')
          }}
          className="col-span-2 text-[#093A23] hover:text-[#0b472c] font-medium underline transition"
        >
          ↺ Réinitialiser
        </button>

        <div className="col-span-12 mt-2">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Montant : {amountRange[0]} € – {amountRange[1]} €
          </label>
          <Range
            step={1}
            min={minAmount}
            max={maxAmount}
            values={amountRange}
            onChange={(values) => setAmountRange([values[0], values[1]])}
            renderTrack={({ props, children }) => (
              <div {...props} className="h-2 bg-gray-200 rounded mt-1 relative">
                <div
                  style={{
                    position: 'absolute',
                    height: '100%',
                    backgroundColor: '#093A23',
                    borderRadius: '4px',
                    left: `${((amountRange[0] - minAmount) / (maxAmount - minAmount)) * 100}%`,
                    width: `${((amountRange[1] - amountRange[0]) / (maxAmount - minAmount)) * 100}%`,
                    zIndex: 1,
                  }}
                />
                {children}
              </div>
            )}
            renderThumb={({ props }) => {
              const { key, ...rest } = props
              return <div key={key} {...rest} className="h-4 w-4 bg-[#093A23] rounded-full" />
            }}

          />
        </div>
      </div>
      </div>

      {/* Filtres ligne 2 – boutons catégories */}
      {uniqueTypeOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="text-sm font-medium text-gray-700 mr-2 flex items-center">🏷️ Types :</span>
          {uniqueTypeOptions.map((t) => (
            <button
              key={t.code}
              onClick={() => setTypeFilter(prev => prev === t.code ? '' : t.code || '')}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                typeFilter === t.code
                  ? 'bg-gradient-to-r from-[#093A23] to-[#0d5534] text-white border-[#093A23] shadow-md'
                  : 'border-gray-300 text-gray-700 hover:border-[#093A23] hover:text-[#093A23]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Tableau */}
      {filteredVentes.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">📅 Date</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">� Client</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">📦 Produits</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">�💰 Montant</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">🏷️ Type</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">💳 Paiement</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredVentes.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(v.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {v.customer ? (
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {v.customer.first_name} {v.customer.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{v.customer.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">Sans client</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {v.transaction_products && v.transaction_products.length > 0 ? (
                        <div className="space-y-1">
                          {v.transaction_products.slice(0, 2).map((tp, idx) => (
                            <div key={idx} className="text-xs text-gray-600">
                              {tp.quantity}x {tp.product?.name || 'Produit'}
                            </div>
                          ))}
                          {v.transaction_products.length > 2 && (
                            <div className="text-xs text-gray-400 italic">
                              +{v.transaction_products.length - 2} autre{v.transaction_products.length - 2 > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200">
                        {v.total_amount?.toFixed(2)} €
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {v.transaction_type?.label ? (
                        <span className="inline-block text-xs bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-3 py-1.5 rounded-full font-medium">
                          {v.transaction_type.label}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 capitalize text-gray-600">
                      {v.payment_method || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedVenteId(v.id)
                          setDetailModalOpen(true)
                        }}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                      >
                        <span>👁️</span> Détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-500 text-lg mb-2">Aucune vente trouvée avec ces critères.</p>
          <button 
            onClick={() => {
              setTypeFilter('')
              setSortOption('')
              setSearchTerm('')
              setAmountRange([minAmount, maxAmount])
              setStartDate('')
              setEndDate('')
            }}
            className="mt-4 text-[#093A23] hover:text-[#0b472c] font-medium underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      <AddVenteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchVentes}
      />

      <VenteDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedVenteId(null)
        }}
        venteId={selectedVenteId}
        onSuccess={fetchVentes}
      />
    </main>
  )
}

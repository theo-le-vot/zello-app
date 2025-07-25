'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AddVenteModal from '@/components/AddVenteModal'
import { Range } from 'react-range'

interface Vente {
  id: string
  date: string
  total_amount: number
  payment_method: string
  transaction_type: {
    label: string
    code: string
  } | null
}

export default function VentesPage() {
  const [ventes, setVentes] = useState<Vente[]>([])
  const [modalOpen, setModalOpen] = useState(false)

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
        transaction_type:transaction_type_code (
          label,
          code
        )
      `)
      .eq('store_id', userData.active_store_id)
      .order('date', { ascending: false })

    if (error) {
      console.error('Erreur chargement ventes :', error)
      return
    }

    const cleanData: Vente[] = (data || []).map((v: any) => ({
      ...v,
      transaction_type: Array.isArray(v.transaction_type)
        ? v.transaction_type[0] ?? null
        : v.transaction_type ?? null
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
  }, [])

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
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#093A23]">Historique des ventes</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#093A23] hover:bg-[#0b472c] text-white px-4 py-2 rounded font-medium transition"
        >
          + Ajouter une vente
        </button>
      </div>

      {/* Filtres ligne 1 */}
      <div className="grid md:grid-cols-12 gap-4 bg-gray-50 p-4 border border-gray-200 rounded mb-6 text-sm">
        <input
          type="text"
          placeholder="🔍 Rechercher un type"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="col-span-3 border px-3 py-2 rounded"
        />

        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="col-span-2 border px-3 py-2 rounded"
        />

        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="col-span-2 border px-3 py-2 rounded"
        />

        <select
          value={sortOption}
          onChange={e => setSortOption(e.target.value)}
          className="col-span-2 border px-3 py-2 rounded"
        >
          <option value="">Tri</option>
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
          className="col-span-2 text-gray-600 hover:text-black underline"
        >
          Réinitialiser
        </button>

        <div className="col-span-12 mt-2">
          <label className="text-xs block text-gray-500 mb-1">
            Montant entre {amountRange[0]} € – {amountRange[1]} €
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

      {/* Filtres ligne 2 – boutons catégories */}
      {uniqueTypeOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {uniqueTypeOptions.map((t) => (
            <button
              key={t.code}
              onClick={() => setTypeFilter(prev => prev === t.code ? '' : t.code || '')}
              className={`px-3 py-1 rounded-full text-sm border ${
                typeFilter === t.code
                  ? 'bg-[#093A23] text-white border-[#093A23]'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Tableau */}
      {filteredVentes.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded overflow-hidden shadow-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Montant</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Paiement</th>
              </tr>
            </thead>
            <tbody>
              {filteredVentes.map((v) => (
                <tr key={v.id} className="border-t hover:bg-gray-50 transition">
                  <td className="px-4 py-2">
                    {new Date(v.date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-2 font-semibold text-green-700">
                    {v.total_amount?.toFixed(2)} €
                  </td>
                  <td className="px-4 py-2">
                    {v.transaction_type?.label ? (
                      <span className="inline-block text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                        {v.transaction_type.label}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 capitalize text-gray-600">
                    {v.payment_method || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">Aucune vente trouvée avec ces critères.</p>
      )}

      <AddVenteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchVentes}
      />
    </main>
  )
}

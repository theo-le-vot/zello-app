'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Range } from 'react-range'
import AddClientModal from '@/components/AddClientModal'


interface Client {
  id: string // ID de la ligne customers_stores
  points: number
  join_date: string
  last_visit_at: string | null
  nb_visits: number
  is_vip: boolean
  notes: string | null
  customer: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone_number: string
    created_at: string
  }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState('')
  const [minPoints, setMinPoints] = useState(0)
  const [maxPoints, setMaxPoints] = useState(100)
  const [pointsRange, setPointsRange] = useState<[number, number]>([0, 100])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('active_store_id')
      .eq('id', user.id)
      .single()

    if (!userData?.active_store_id) return

    const { data, error } = await supabase
      .from('customers_stores')
      .select(`
        id,
        points,
        join_date,
        last_visit_at,
        nb_visits,
        is_vip,
        notes,
        customer:customers (
          id,
          first_name,
          last_name,
          email,
          phone_number,
          created_at
        )
      `)
      .eq('store_id', userData.active_store_id)
      .order('join_date', { ascending: false })

    if (error) {
      console.error('Erreur chargement clients :', error)
      return
    }

    const cleanData: Client[] = (data || []).map((item: any) => ({
      ...item,
      customer: Array.isArray(item.customer) ? item.customer[0] : item.customer
    }))

    const points = cleanData.map(c => c.points || 0)
    const min = Math.min(...points)
    const max = Math.max(...points)

    setMinPoints(min)
    setMaxPoints(max)
    setPointsRange([min, max])
    setClients(cleanData)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const filteredClients = clients
    .filter(c =>
      (c.customer?.first_name + ' ' + c.customer?.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(c => {
      if (startDate && new Date(c.customer?.created_at) < new Date(startDate)) return false
      if (endDate && new Date(c.customer?.created_at) > new Date(endDate)) return false
      return true
    })
    .filter(c => (c.points ?? 0) >= pointsRange[0] && (c.points ?? 0) <= pointsRange[1])
    .sort((a, b) => {
      switch (sortOption) {
        case 'name-asc': return a.customer.first_name.localeCompare(b.customer.first_name)
        case 'name-desc': return b.customer.first_name.localeCompare(a.customer.first_name)
        case 'points-asc': return (a.points ?? 0) - (b.points ?? 0)
        case 'points-desc': return (b.points ?? 0) - (a.points ?? 0)
        case 'date-asc': return new Date(a.customer.created_at).getTime() - new Date(b.customer.created_at).getTime()
        case 'date-desc': return new Date(b.customer.created_at).getTime() - new Date(a.customer.created_at).getTime()
        default: return 0
      }
    })

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#093A23]">Mes clients</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#093A23] hover:bg-[#0b472c] text-white px-4 py-2 rounded font-medium transition"
        >
          + Ajouter un client
        </button>
      </div>

      {/* Filtres ligne 1 */}
      <div className="grid md:grid-cols-12 gap-4 bg-gray-50 p-4 border border-gray-200 rounded mb-6 text-sm">
        <input
          type="text"
          placeholder="🔍 Rechercher un nom ou email"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="col-span-4 border px-3 py-2 rounded"
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
          <option value="name-asc">Nom A → Z</option>
          <option value="name-desc">Nom Z → A</option>
          <option value="points-asc">Points croissants</option>
          <option value="points-desc">Points décroissants</option>
          <option value="date-asc">Anciens d’abord</option>
          <option value="date-desc">Récents d’abord</option>
        </select>

        <button
          onClick={() => {
            setSearchTerm('')
            setSortOption('')
            setPointsRange([minPoints, maxPoints])
            setStartDate('')
            setEndDate('')
          }}
          className="col-span-2 text-gray-600 hover:text-black underline"
        >
          Réinitialiser
        </button>

        <div className="col-span-12 mt-2">
          <label className="text-xs block text-gray-500 mb-1">
            Points fidélité entre {pointsRange[0]} – {pointsRange[1]}
          </label>
          <Range
            step={1}
            min={minPoints}
            max={maxPoints}
            values={pointsRange}
            onChange={(values) => setPointsRange([values[0], values[1]])}
            renderTrack={({ props, children }) => (
              <div {...props} className="h-2 bg-gray-200 rounded mt-1 relative">
                <div
                  style={{
                    position: 'absolute',
                    height: '100%',
                    backgroundColor: '#093A23',
                    borderRadius: '4px',
                    left: `${((pointsRange[0] - minPoints) / (maxPoints - minPoints)) * 100}%`,
                    width: `${((pointsRange[1] - pointsRange[0]) / (maxPoints - minPoints)) * 100}%`,
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

      {/* Tableau */}
      {filteredClients.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded overflow-hidden shadow-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Téléphone</th>
                <th className="px-4 py-2">Inscription</th>
                <th className="px-4 py-2">Dernière visite</th>
                <th className="px-4 py-2">Points</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50 transition">
                  <td className="px-4 py-2">{c.customer?.first_name} {c.customer?.last_name}</td>
                  <td className="px-4 py-2">{c.customer?.email || '—'}</td>
                  <td className="px-4 py-2">{c.customer?.phone_number || '—'}</td>
                  <td className="px-4 py-2">
                    {new Date(c.customer?.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-2">
                    {c.last_visit_at
                      ? new Date(c.last_visit_at).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td className="px-4 py-2 font-semibold text-green-700">
                    {c.points ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">Aucun client trouvé avec ces critères.</p>
      )}

      <AddClientModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  onSuccess={fetchClients}
/>

    </main>
  )
}

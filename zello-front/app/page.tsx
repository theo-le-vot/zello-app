'use client'

import { useState } from 'react'
import HeaderPublic from '@/components/HeaderPublic'
import { supabase } from '@/lib/supabaseClient'

export default function Home() {
  const [storeName, setStoreName] = useState('')
  const [city, setCity] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)

    const { data, error } = await supabase
      .from('stores')
      .insert([
        {
          name: storeName,
          address_city: city,
          address_street: '1 rue test',
          address_postal_code: '75000',
          address_country: 'France',
          store_type: 'boulangerie',
          registration_id: '12345678900000',
          phone_number: '+33000000000',
          opening_year: 2020,
          admin_id: null, // à adapter si tu veux tester avec un vrai ID
          subscription_status: 'free',
          is_active: true
        }
      ])

    if (error) {
      console.error("❌ Erreur Supabase :", error)
      setResult(`❌ Erreur : ${error.message}`)
    } else {
      console.log("✅ Insertion réussie :", data)
      setResult('✅ Commerce inséré avec succès !')
    }
  }

  return (
    <>
      <HeaderPublic />
      <main className="pt-24 px-6 max-w-xl mx-auto">
        <section id="home">
          <h1 className="text-2xl font-bold mb-4">Bienvenue sur Zello !</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Nom du commerce</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="border p-2 w-full rounded"
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Ville</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="border p-2 w-full rounded"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-[#093A23] text-white px-4 py-2 rounded"
            >
              Tester l'insertion
            </button>
          </form>

          {result && <p className="mt-4">{result}</p>}
        </section>
      </main>
    </>
  )
}

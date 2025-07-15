'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoZ from '/public/logo-z.svg'
import { useSignupStore } from '@/lib/stores/signupStore'
import { supabase } from '@/lib/supabaseClient'

type OfferId = 'free' | 'start' | 'pro' | 'max'

type Offer = {
  id: OfferId
  title: string
  price: string
  features: string[]
}

export default function OfferStep() {
  const router = useRouter()
  const [selected, setSelected] = useState<OfferId | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    firstName,
    lastName,
    email,
    password,
    phone,
    birthdate,
    nom,
    rue,
    code_postal,
    ville,
    pays,
    type_activite,
    siret,
    annee_ouverture
  } = useSignupStore(state => state)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return alert('Veuillez sélectionner une formule.')
    if (!email || !password || !nom) return alert('Champs requis manquants.')
    setLoading(true)

    try {
      console.log('➡️ Tentative d\'inscription...')

      // 1. Création dans auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      })
      if (authError) throw authError

      const userId = authData.user?.id
      if (!userId) throw new Error('Échec création utilisateur auth.')
      console.log('✅ Utilisateur auth créé :', userId)

      console.log('➡️ Tentative d\'inscription dans la table user...')

      // 2. Insertion du user (sans store_id ici, car relation via table de jointure)
      const { error: userError } = await supabase.from('users').insert({
        id: userId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phone,
        birth_date: birthdate,
        status: 'active'
      })
      if (userError) throw userError
      console.log('✅ Utilisateur inséré en base.')

      // 3. Insertion du store (avec admin_id null)
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .insert([
          {
            name: nom,
            address_city: ville,
            address_street: rue,
            address_postal_code: code_postal,
            address_country: pays,
            store_type: type_activite,
            registration_id: siret,
            phone_number: phone,
            opening_year: parseInt(annee_ouverture),
            admin_id: userId,
            subscription_status: selected,
            is_active: true
          }
        ])
        .select()
        .single()

        if (storeError || !storeData) throw storeError
        console.log('✅ Store inséré')
        
        // 4. Insertion dans user_store
        const { error: userStoreError } = await supabase.from('user_store').insert({
          user_id: userId,
          store_id: storeData.id,
          role: 'admin' // ou un enum si tu le gères dans la DB
        })

      if (userStoreError) throw userStoreError
      console.log('✅ Lien user <-> store (user_store) créé avec succès.')
      
      router.push('/dashboard/pro')
    } catch (err: any) {
      console.error('❌ Erreur attrapée :', err)
      alert(err?.message || 'Erreur lors de l\'inscription.')
    } finally {
      setLoading(false)
    }
  }

  const offers: Offer[] = [
    { id: 'free', title: 'Free', price: '0€/mois', features: ['Saisie CA manuelle (jour uniquement)', 'Tableau de bord basique (CA uniquement)', '1 utilisateur', 'Accès Web uniquement'] },
    { id: 'start', title: 'Start', price: '19€/mois', features: ['Saisie CA manuelle (ticket, jour, mois)', 'Tableau de bord complet', 'QR code client (fidélisation)', 'Analyse CA & fréquentation', 'Accès Web, Mobile & Tablette'] },
    { id: 'pro', title: 'Pro', price: '39€/mois', features: ['Toutes les fonctionnalités Start', 'Catalogue produits / services', 'Clients illimités & scoring', 'Marketing client (email, promos)', 'Gestion d’employés (code boutique)'] },
    { id: 'max', title: 'Max', price: '59€/mois', features: ['Toutes les fonctionnalités Pro', 'Click & Collect', 'SMS marketing automatisé', 'Planning employés & congés', 'Prévisions d’affluence', 'A/B testing promos', 'Support prioritaire'] }
  ]

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 relative">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-[#093A23] font-inter font-bold text-xl">
        <Image src={LogoZ} alt="Zello logo" width={22} height={22} />
        <span className="text-[22px]">ZELLO</span>
      </Link>

      <div className="w-full max-w-7xl mt-20 mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold mb-4 text-center">Choisissez votre formule</h1>
        <p className="text-sm text-gray-600 mb-10 text-center">Vous pouvez commencer gratuitement et évoluer à tout moment.</p>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-4 gap-6">
          {offers.map((offer) => (
            <div
              key={offer.id}
              onClick={() => setSelected(offer.id)}
              className={`border rounded-lg p-6 cursor-pointer transition-all ${selected === offer.id ? 'border-[#093A23] shadow-md bg-[#093A23]/5' : 'border-gray-300'}`}
            >
              <h2 className="text-xl font-semibold mb-1">{offer.title}</h2>
              <p className="text-lg text-[#093A23] font-bold mb-4">{offer.price}</p>
              <ul className="space-y-2 text-sm text-gray-700">
                {offer.features.map((feature, idx) => (
                  <li key={idx}>• {feature}</li>
                ))}
              </ul>
              <div className="mt-4">
                <span className={`text-sm font-medium ${selected === offer.id ? 'text-[#093A23]' : 'text-gray-400'}`}>
                  {selected === offer.id ? '✓ Sélectionnée' : 'Cliquez pour choisir'}
                </span>
              </div>
            </div>
          ))}
        </form>

        <div className="text-center mt-10">
          <button type="submit" onClick={handleSubmit} disabled={loading} className="bg-[#093A23] text-white font-semibold py-2 px-6 rounded">
            {loading ? 'Inscription en cours...' : 'Finaliser mon inscription'}
          </button>
        </div>
      </div>
    </main>
  )
}

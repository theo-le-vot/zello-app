'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoZ from '/public/logo-z.svg'
import { useSignupStore } from '@/lib/stores/signupStore'

export default function EtablissementStep() {
  const router = useRouter()
  const setData = useSignupStore(state => state.setData)

  const [form, setForm] = useState({
    nom: '',
    rue: '',
    code_postal: '',
    ville: '',
    pays: '',
    type_activite: '',
    telephone: '',
    siret: '',
    annee_ouverture: ''
  })

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()

    // 🧠 Stocke les données dans Zustand
    setData(form)

    router.push('/signup/pro/compte')
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 relative">
      {/* Logo haut gauche */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-[#093A23] font-inter font-bold text-xl"
      >
        <Image src={LogoZ} alt="Zello logo" width={22} height={22} />
        <span className="text-[22px]">ZELLO</span>
      </Link>

      <div className="w-full max-w-md mt-20 mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">
          Informations sur votre établissement
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Ces informations permettent de créer votre fiche boutique.
        </p>

        <form onSubmit={handleContinue} className="space-y-4">
          <input
            type="text"
            placeholder="Nom de la boutique *"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.nom}
            onChange={e => setForm({ ...form, nom: e.target.value })}
          />
          <input
            type="text"
            placeholder="Rue *"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.rue}
            onChange={e => setForm({ ...form, rue: e.target.value })}
          />
          <input
            type="text"
            placeholder="Code postal *"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.code_postal}
            onChange={e => setForm({ ...form, code_postal: e.target.value })}
          />
          <input
            type="text"
            placeholder="Ville *"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.ville}
            onChange={e => setForm({ ...form, ville: e.target.value })}
          />
          <input
            type="text"
            placeholder="Pays *"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.pays}
            onChange={e => setForm({ ...form, pays: e.target.value })}
          />
          <input
            type="text"
            placeholder="Type d’activité * (ex : Boulangerie)"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.type_activite}
            onChange={e => setForm({ ...form, type_activite: e.target.value })}
          />
          <input
            type="number"
            placeholder="Année d’ouverture *"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.annee_ouverture}
            onChange={e => setForm({ ...form, annee_ouverture: e.target.value })}
          />
          <input
            type="tel"
            placeholder="Téléphone (optionnel)"
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.telephone}
            onChange={e => setForm({ ...form, telephone: e.target.value })}
          />
          <input
            type="text"
            placeholder="SIRET (optionnel)"
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.siret}
            onChange={e => setForm({ ...form, siret: e.target.value })}
          />

          <button
            type="submit"
            className="w-full bg-[#093A23] text-white font-semibold py-2 rounded"
          >
            Continuer
          </button>
        </form>
      </div>
    </main>
  )
}

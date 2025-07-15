'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import LogoZ from '/public/logo-z.svg'
import { useSignupStore } from '@/lib/stores/signupStore'

export default function SignupPage() {
  const [isPro, setIsPro] = useState(true)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: ''
  })

  const router = useRouter()
  const setData = useSignupStore(state => state.setData)

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()

    // 🧠 Enregistre dans le store Zustand
    setData({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email
    })

    const target = isPro ? '/signup/pro/etablissement' : '/signup/client/details'
    router.push(target)
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

      {/* Formulaire */}
      <div className="w-full max-w-md mt-20 mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">
          Procédons à la création de votre compte
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Créez votre compte gratuitement et sans engagement.
        </p>

        {/* Onglets */}
        <div className="flex border border-gray-300 rounded overflow-hidden mb-6">
          <button
            className={`w-1/2 px-4 py-2 text-sm font-medium ${
              isPro ? 'bg-[#093A23] text-white' : 'bg-white text-black'
            }`}
            onClick={() => setIsPro(true)}
          >
            Je suis commerçant
          </button>
          <button
            className={`w-1/2 px-4 py-2 text-sm font-medium ${
              !isPro ? 'bg-[#093A23] text-white' : 'bg-white text-black'
            }`}
            onClick={() => setIsPro(false)}
          >
            Je suis consommateur
          </button>
        </div>

        {/* Formulaire simple sans mot de passe */}
        <form onSubmit={handleContinue} className="space-y-4">
          <input
            type="text"
            placeholder="Prénom *"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.firstName}
            onChange={e => setForm({ ...form, firstName: e.target.value })}
          />
          <input
            type="text"
            placeholder="Nom *"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.lastName}
            onChange={e => setForm({ ...form, lastName: e.target.value })}
          />
          <input
            type="email"
            placeholder="Email *"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />

          <button
            type="submit"
            className="w-full bg-[#093A23] text-white font-semibold py-2 rounded"
          >
            Continuer
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-600">
          Vous avez déjà un compte ?{' '}
          <Link href="/login" className="text-[#093A23] font-medium">
            Connectez-vous
          </Link>
        </p>
      </div>
    </main>
  )
}

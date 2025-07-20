'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import LogoZ from '/public/logo-z.svg'
import { useSignupStore } from '@/lib/stores/signupStore'
import { supabase } from '@/lib/supabaseClient'

export default function SignupPage() {
  const [isPro, setIsPro] = useState(true)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: ''
  })
  const [emailExists, setEmailExists] = useState(false)

  const router = useRouter()
  const setData = useSignupStore(state => state.setData)

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.firstName || !form.lastName || !form.email) {
      alert('Veuillez remplir tous les champs.')
      return
    }

    // 🔍 Appel RPC pour vérifier unicité de l'email (insensible à la casse)
    const { data: emailExistsInDb, error } = await supabase.rpc('email_exists_in_users_or_customers', {
      input_email: form.email
    })

    if (error) {
      console.error('Erreur lors de la vérification de l’email via RPC:', error)
      alert('Erreur lors de la vérification de l’adresse email.')
      return
    }

    if (emailExistsInDb === 1) {
      setEmailExists(true)
      return
    }

    // ✅ Enregistre les données dans Zustand
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
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-[#093A23] font-inter font-bold text-xl">
        <Image src={LogoZ} alt="Zello logo" width={22} height={22} />
        <span className="text-[22px]">ZELLO</span>
      </Link>

      <div className="w-full max-w-md mt-20 mx-auto relative">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">Procédons à la création de votre compte</h1>
        <p className="text-sm text-gray-600 mb-6">Créez votre compte gratuitement et sans engagement.</p>

        <div className="flex border border-gray-300 rounded overflow-hidden mb-6">
          <button
            type="button"
            onClick={() => setIsPro(true)}
            className={`w-1/2 px-4 py-2 text-sm font-medium ${isPro ? 'bg-[#093A23] text-white' : 'bg-white text-black'}`}
          >
            Je suis commerçant
          </button>
          <button
            type="button"
            onClick={() => setIsPro(false)}
            className={`w-1/2 px-4 py-2 text-sm font-medium ${!isPro ? 'bg-[#093A23] text-white' : 'bg-white text-black'}`}
          >
            Je suis consommateur
          </button>
        </div>

        <form onSubmit={handleContinue} className="space-y-6 relative">
          {/* Prénom */}
          <div className="relative">
            <input
              type="text"
              id="firstName"
              required
              placeholder="_"
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              className="peer h-12 w-full border border-gray-300 rounded px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23]"
            />
            <label
              htmlFor="firstName"
              className="absolute left-4 text-gray-500 text-sm transition-all font-medium
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23]
                peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-sm peer-not-placeholder-shown:text-[#093A23]"
            >
              Prénom *
            </label>
          </div>

          {/* Nom */}
          <div className="relative">
            <input
              type="text"
              id="lastName"
              required
              placeholder=" "
              value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              className="peer h-12 w-full border border-gray-300 rounded px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23]"
            />
            <label
              htmlFor="lastName"
              className="absolute left-4 text-gray-500 text-sm transition-all font-medium
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23]
                peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-sm peer-not-placeholder-shown:text-[#093A23]"
            >
              Nom *
            </label>
          </div>

          {/* Email */}
          <div className="relative mb-8">
            <input
              type="email"
              id="email"
              required
              placeholder=" "
              value={form.email}
              onChange={e => {
                setForm({ ...form, email: e.target.value })
                setEmailExists(false)
              }}
              className={`peer h-12 w-full border rounded px-4 pt-5 pb-1 placeholder-transparent focus:outline-none ${
                emailExists ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#093A23]'
              }`}
            />
            <label
              htmlFor="email"
              className="absolute left-4 text-gray-500 text-sm transition-all font-medium
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23]
                peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-sm peer-not-placeholder-shown:text-[#093A23]"
            >
              Email *
            </label>
            {emailExists && (
              <p className="text-sm text-red-600 mt-1 absolute left-0 -bottom-5">
                Cette adresse email est déjà utilisée.
              </p>
            )}
          </div>

          <button type="submit" className="w-full bg-[#093A23] text-white font-semibold py-2 rounded">
            Continuer
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-600">
          Vous avez déjà un compte ?{' '}
          <Link href="/login" className="text-[#093A23] font-medium">Connectez-vous</Link>
        </p>
      </div>
    </main>
  )
}

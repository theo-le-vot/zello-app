'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoZ from '/public/logo-z.svg'
import { useSignupStore } from '@/lib/stores/signupStore'

export default function AdminAccountStep() {
  const router = useRouter()
  const setData = useSignupStore(state => state.setData)

  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
    birthdate: '',
    phone: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (form.password !== form.confirmPassword) {
      alert('Les mots de passe ne correspondent pas.')
      return
    }

    // ✅ Stockage dans Zustand
    setData({
      password: form.password,
      birthdate: form.birthdate,
      phone: form.phone
    })

    router.push('/signup/pro/offre')
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
          Votre compte administrateur
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Ces informations protègent l’accès à votre établissement.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Mot de passe *"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
          <input
            type="password"
            placeholder="Confirmer le mot de passe *"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.confirmPassword}
            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
          />
          <input
            type="date"
            placeholder="Date de naissance *"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.birthdate}
            onChange={e => setForm({ ...form, birthdate: e.target.value })}
          />
          <input
            type="tel"
            placeholder="Téléphone (optionnel)"
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
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

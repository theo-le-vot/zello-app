'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import LogoZ from '/public/logo-z.svg'
import { supabase } from '@/lib/supabaseClient'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-10 relative">
        <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-[#093A23] font-inter font-bold text-xl">
          <Image src={LogoZ} alt="Zello logo" width={22} height={22} />
          <span className="text-[22px]">ZELLO</span>
        </Link>

        <div className="w-full max-w-md mt-20 mx-auto text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Email envoyé !</h1>
          <p className="text-gray-600 mb-6">
            Nous vous avons envoyé un email à <strong>{email}</strong> avec un lien pour réinitialiser votre mot de passe.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Vérifiez également votre dossier spam si vous ne recevez pas l'email dans quelques minutes.
          </p>
          <Link 
            href="/login" 
            className="inline-block bg-[#093A23] text-white font-semibold py-2 px-6 rounded hover:bg-[#0a4a2b] transition-colors"
          >
            Retour à la connexion
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 relative">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-[#093A23] font-inter font-bold text-xl">
        <Image src={LogoZ} alt="Zello logo" width={22} height={22} />
        <span className="text-[22px]">ZELLO</span>
      </Link>

      <div className="w-full max-w-md mt-20 mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">Mot de passe oublié</h1>
        <p className="text-sm text-gray-600 mb-6">
          Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>

        <form onSubmit={handleResetPassword} className="space-y-6">
          <div className="relative">
            <input
              type="email"
              id="email"
              required
              placeholder=" "
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="peer h-12 w-full border border-gray-300 rounded px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23]"
            />
            <label
              htmlFor="email"
              className="absolute left-4 text-gray-500 text-sm transition-all font-medium
                peer-placeholder-shown:text-base peer-placeholder-shown:top-3
                peer-focus:top-1 peer-focus:text-xs top-1"
            >
              Email
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#093A23] text-white font-semibold py-3 rounded hover:bg-[#0a4a2b] transition-colors disabled:opacity-50"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-600 text-center">
          Vous vous souvenez de votre mot de passe ?{' '}
          <Link href="/login" className="text-[#093A23] font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoZ from '/public/logo-z.svg'
import { supabase } from '@/lib/supabaseClient'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    // Récupérer l'email depuis l'URL ou le localStorage
    const params = new URLSearchParams(window.location.search)
    const emailParam = params.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }

    // Écouter les changements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // L'utilisateur a vérifié son email, le rediriger
        checkUserType(session.user.id)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const checkUserType = async (userId: string) => {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle()

    router.push(customer ? '/dashboard/client' : '/dashboard/pro')
  }

  const handleResendEmail = async () => {
    if (!email) {
      alert('Email non trouvé')
      return
    }

    setResending(true)
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) throw error

      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 5000)
    } catch (error) {
      console.error('Erreur lors du renvoi:', error)
      alert('Erreur lors du renvoi de l\'email')
    } finally {
      setResending(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 relative bg-gray-50">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-[#093A23] font-inter font-bold text-xl">
        <Image src={LogoZ} alt="Zello logo" width={22} height={22} />
        <span className="text-[22px]">ZELLO</span>
      </Link>

      <div className="w-full max-w-md mt-20 mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Vérifiez votre email</h1>
          <p className="text-gray-600">
            Nous avons envoyé un email de confirmation à<br />
            <strong className="text-[#093A23]">{email}</strong>
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 mb-2">
            <strong>Étapes suivantes :</strong>
          </p>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Ouvrez votre boîte mail</li>
            <li>Cliquez sur le lien de confirmation</li>
            <li>Vous serez automatiquement redirigé</li>
          </ol>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Vous n'avez pas reçu l'email ?
          </p>
          
          {resendSuccess ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
              <p className="text-sm text-green-600">✓ Email renvoyé avec succès !</p>
            </div>
          ) : (
            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="text-[#093A23] font-medium text-sm hover:underline disabled:opacity-50"
            >
              {resending ? 'Envoi en cours...' : 'Renvoyer l\'email de confirmation'}
            </button>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Vérifiez également votre dossier <strong>spam</strong> ou <strong>courrier indésirable</strong>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-[#093A23] hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </main>
  )
}

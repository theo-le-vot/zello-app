'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') // 'pro' ou 'client'

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Récupérer la session après confirmation email
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Erreur lors de la récupération de la session:', error)
          router.push('/login')
          return
        }

        if (session) {
          // L'utilisateur est maintenant connecté avec une session valide
          console.log('✅ Email confirmé, session active')
          
          // Rediriger vers le bon dashboard selon le type
          if (type === 'pro') {
            router.push('/dashboard/pro')
          } else if (type === 'client') {
            router.push('/dashboard/client')
          } else {
            // Par défaut, vérifier dans la DB
            const userId = session.user.id
            const { data: customer } = await supabase
              .from('customers')
              .select('id')
              .eq('auth_user_id', userId)
              .maybeSingle()
            
            router.push(customer ? '/dashboard/client' : '/dashboard/pro')
          }
        } else {
          // Pas de session, rediriger vers login
          console.log('❌ Pas de session après confirmation')
          router.push('/login')
        }
      } catch (err) {
        console.error('Erreur:', err)
        router.push('/login')
      }
    }

    handleEmailConfirmation()
  }, [router, type])

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#093A23] mx-auto mb-4"></div>
        <p className="text-gray-600">Confirmation de votre email en cours...</p>
      </div>
    </main>
  )
}

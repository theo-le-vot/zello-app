'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardClient() {
  const router = useRouter()
  const [userData, setUserData] = useState<{ first_name: string; last_name: string } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('customers')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Erreur récupération client :', error)
        return
      }

      setUserData(data)
    }

    fetchData()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-sm text-gray-600">Connecté en tant que :</p>
          <p className="text-lg font-medium text-[#093A23]">
            {userData ? `${userData.first_name} ${userData.last_name}` : 'Chargement...'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 underline"
        >
          Se déconnecter
        </button>
      </div>

      <h1 className="text-3xl font-semibold mb-4 text-[#093A23]">Bienvenue sur Zello 👋</h1>
      <p className="text-gray-700 mb-6">
        Ceci est votre espace personnel. Vous pourrez bientôt y suivre vos points de fidélité, vos commerces préférés, vos missions, et plus encore !
      </p>

      <div className="mt-8">
        <Link
          href="/"
          className="inline-block bg-[#093A23] text-white px-6 py-2 rounded font-medium"
        >
          Retour à l’accueil
        </Link>
      </div>
    </main>
  )
}

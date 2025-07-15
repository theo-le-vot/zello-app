'use client'

import Link from 'next/link'

export default function DashboardPro() {
  return (
    <main className="min-h-screen px-6 py-10">
      <h1 className="text-3xl font-semibold mb-4 text-[#093A23]">Bienvenue sur votre tableau de bord Zello</h1>
      <p className="text-gray-700 mb-6">
        Ceci est votre espace commerçant. Vous pourrez bientôt y suivre vos ventes, vos clients, vos produits et bien plus !
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

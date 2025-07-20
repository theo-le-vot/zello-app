'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import LogoZ from '/public/logo-z.svg'
import { ChevronDown } from 'lucide-react'

interface Store {
  id: string
  name: string
  logo_url?: string
}

export default function HeaderPro() {
  const [userData, setUserData] = useState<{
    id: string
    first_name: string
    profile_photo?: string
    active_store_id?: string
  } | null>(null)

  const [stores, setStores] = useState<Store[]>([])
  const [activeStore, setActiveStore] = useState<Store | null>(null)

  const [storeMenuOpen, setStoreMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const storeRef = useRef<HTMLDivElement | null>(null)
  const userRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const fetchUserAndStores = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Récupère les infos utilisateur
      const { data: userDetails } = await supabase
        .from('users')
        .select('id, first_name, profile_photo, active_store_id')
        .eq('id', user.id)
        .single()

      if (!userDetails) return
      setUserData(userDetails)

      // Récupère les stores liés
      const { data: storeLinks, error: storeError } = await supabase
        .from('user_store')
        .select('store_id, stores(name, logo_url)')
        .eq('user_id', user.id)

      if (storeError || !storeLinks) {
        console.error("Erreur récupération stores :", storeError)
        return
      }

      const storeList: Store[] = storeLinks.map(link => {
        const storeData = Array.isArray(link.stores) ? link.stores[0] : link.stores

        return {
          id: link.store_id,
          name: storeData?.name ?? 'Store inconnu',
          logo_url: storeData?.logo_url ?? ''
        }
      })


      setStores(storeList)

      const currentStore =
        storeList.find(s => s.id === userDetails.active_store_id) ||
        storeList[0] ||
        null

      if (currentStore) {
        setActiveStore(currentStore)
      }
    }

    fetchUserAndStores()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (storeRef.current && !storeRef.current.contains(e.target as Node)) setStoreMenuOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleStoreSelect = async (store: Store) => {
    setActiveStore(store)
    setStoreMenuOpen(false)

    if (userData?.id) {
      const { error } = await supabase
        .from('users')
        .update({ active_store_id: store.id })
        .eq('id', userData.id)

      if (error) console.error("Erreur mise à jour active_store_id:", error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className="w-full bg-white border-b border-gray-200 px-6 py-4 shadow-sm relative z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center relative">

        {/* Navigation gauche */}
        <nav className="flex gap-6 text-sm text-gray-700 font-medium">
          <Link href="/dashboard/pro">Dashboard</Link>
          <Link href="#">Clients</Link>
          <Link href="#">Statistiques</Link>
          <Link href="/dashboard/pro/produits">Produits</Link>
        </nav>

        {/* Logo centré */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <Image src={LogoZ} alt="Zello logo" width={24} height={24} />
          <span className="text-[#093A23] font-bold text-lg">ZELLO</span>
        </div>

        {/* Zone droite */}
        <div className="flex items-center gap-6">

          {/* Sélecteur de store */}
          <div className="relative" ref={storeRef}>
            <button
              onClick={() => setStoreMenuOpen(!storeMenuOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              {activeStore?.logo_url ? (
                <img src={activeStore.logo_url} alt="Logo store" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300" />
              )}
              <span className="text-sm font-medium text-gray-800">
                {activeStore?.name || 'Aucun store'}
              </span>
              <ChevronDown size={16} className="text-gray-500" />
            </button>

            {storeMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded shadow-md text-sm z-10">
                {stores.map(store => (
                  <button
                    key={store.id}
                    onClick={() => handleStoreSelect(store)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    {store.name}
                  </button>
                ))}
                <hr className="my-1" />
                <Link href="/dashboard/pro/settings" className="block px-4 py-2 hover:bg-gray-100 text-gray-700">
                  Gérer mon store
                </Link>
              </div>
            )}
          </div>

          {/* Profil utilisateur */}
          <div className="relative" ref={userRef}>
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 focus:outline-none">
              {userData?.profile_photo ? (
                <img src={userData.profile_photo} alt="Profil" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300" />
              )}
              <span className="text-sm font-medium text-gray-800">
                {userData?.first_name || '...'}
              </span>
              <ChevronDown size={16} className="text-gray-500" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded shadow-md text-sm z-10">
                <Link href="/profil" className="block px-4 py-2 hover:bg-gray-100">Gérer mon profil</Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

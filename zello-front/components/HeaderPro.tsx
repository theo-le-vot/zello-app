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

  const [analyseOpen, setAnalyseOpen] = useState(false)
  const [gestionOpen, setGestionOpen] = useState(false)
  const [relationOpen, setRelationOpen] = useState(false)

  const storeRef = useRef<HTMLDivElement | null>(null)
  const userRef = useRef<HTMLDivElement | null>(null)

  const analyseTimeout = useRef<NodeJS.Timeout | null>(null)
  const gestionTimeout = useRef<NodeJS.Timeout | null>(null)
  const relationTimeout = useRef<NodeJS.Timeout | null>(null)

  // Ouverture / fermeture fluide des menus
  const handleEnter = (menu: string) => {
    if (menu === 'analyse') {
      if (analyseTimeout.current) clearTimeout(analyseTimeout.current)
      setAnalyseOpen(true)
    }
    if (menu === 'gestion') {
      if (gestionTimeout.current) clearTimeout(gestionTimeout.current)
      setGestionOpen(true)
    }
    if (menu === 'relation') {
      if (relationTimeout.current) clearTimeout(relationTimeout.current)
      setRelationOpen(true)
    }
  }

  const handleLeave = (menu: string) => {
    const delay = 200
    if (menu === 'analyse') {
      analyseTimeout.current = setTimeout(() => setAnalyseOpen(false), delay)
    }
    if (menu === 'gestion') {
      gestionTimeout.current = setTimeout(() => setGestionOpen(false), delay)
    }
    if (menu === 'relation') {
      relationTimeout.current = setTimeout(() => setRelationOpen(false), delay)
    }
  }

  useEffect(() => {
    const fetchUserAndStores = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userDetails } = await supabase
        .from('users')
        .select('id, first_name, profile_photo, active_store_id')
        .eq('id', user.id)
        .single()

      if (!userDetails) return
      setUserData(userDetails)

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

      if (currentStore) setActiveStore(currentStore)
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

        {/* Navigation principale */}
        <nav className="flex gap-10 text-sm text-gray-700 font-medium relative">

          {/* Menu Analyse */}
          <div
            className="relative"
            onMouseEnter={() => handleEnter('analyse')}
            onMouseLeave={() => handleLeave('analyse')}
          >
            <button className="flex items-center gap-1">
              Analyse <ChevronDown size={14} className="text-gray-500 mt-0.5" />
            </button>
            {analyseOpen && (
              <div className="absolute bg-white border border-gray-200 rounded shadow-md w-48 mt-2 text-sm z-10">
                <Link href="/dashboard/pro" className="block px-4 py-2 hover:bg-gray-100">Vue d’ensemble</Link>
                <Link href="/dashboard/pro/performance" className="block px-4 py-2 hover:bg-gray-100">Performance</Link>
                <Link href="/dashboard/pro/frequentation" className="block px-4 py-2 hover:bg-gray-100">Fréquentation</Link>
                <Link href="/dashboard/pro/clients" className="block px-4 py-2 hover:bg-gray-100">Top Clients</Link>
              </div>
            )}
          </div>

          {/* Menu Gestion */}
          <div
            className="relative"
            onMouseEnter={() => handleEnter('gestion')}
            onMouseLeave={() => handleLeave('gestion')}
          >
            <button className="flex items-center gap-1">
              Gestion <ChevronDown size={14} className="text-gray-500 mt-0.5" />
            </button>
            {gestionOpen && (
              <div className="absolute bg-white border border-gray-200 rounded shadow-md w-48 mt-2 text-sm z-10">
                <Link href="/dashboard/pro/ventes" className="block px-4 py-2 hover:bg-gray-100">Saisie ventes</Link>
                <Link href="/dashboard/pro/produits" className="block px-4 py-2 hover:bg-gray-100">Produits</Link>
                <Link href="/dashboard/pro/previsions" className="block px-4 py-2 hover:bg-gray-100">Prévisions</Link>
              </div>
            )}
          </div>

          {/* Menu Relation client */}
          <div
            className="relative"
            onMouseEnter={() => handleEnter('relation')}
            onMouseLeave={() => handleLeave('relation')}
          >
            <button className="flex items-center gap-1">
              Relation client <ChevronDown size={14} className="text-gray-500 mt-0.5" />
            </button>
            {relationOpen && (
              <div className="absolute bg-white border border-gray-200 rounded shadow-md w-56 mt-2 text-sm z-10">
                <Link href="/dashboard/pro/clients" className="block px-4 py-2 hover:bg-gray-100">Mes clients</Link>
                <Link href="/dashboard/pro/fidelisation" className="block px-4 py-2 hover:bg-gray-100">Fidélisation</Link>
                <Link href="/dashboard/pro/marketing" className="block px-4 py-2 hover:bg-gray-100">Marketing</Link>
              </div>
            )}
          </div>
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

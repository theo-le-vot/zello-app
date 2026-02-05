'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import LogoZ from '/public/logo-z.svg'
import { 
  ChevronDown, 
  BarChart3, 
  Package, 
  Users, 
  Store, 
  User, 
  LogOut, 
  Settings,
  TrendingUp,
  Activity,
  UserCheck,
  ShoppingCart,
  Boxes,
  Calendar,
  Heart,
  Mail,
  Crown,
  FileUp,
  FileDown,
  Zap
} from 'lucide-react'

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
  const [configOpen, setConfigOpen] = useState(false)

  const storeRef = useRef<HTMLDivElement | null>(null)
  const userRef = useRef<HTMLDivElement | null>(null)

  const analyseTimeout = useRef<NodeJS.Timeout | null>(null)
  const gestionTimeout = useRef<NodeJS.Timeout | null>(null)
  const relationTimeout = useRef<NodeJS.Timeout | null>(null)
  const configTimeout = useRef<NodeJS.Timeout | null>(null)

  const pathname = usePathname()

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
    if (menu === 'config') {
      if (configTimeout.current) clearTimeout(configTimeout.current)
      setConfigOpen(true)
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
    if (menu === 'config') {
      configTimeout.current = setTimeout(() => setConfigOpen(false), delay)
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

  const isActiveLink = (href: string) => pathname === href

  return (
    <header className="w-full bg-white border-b border-gray-200/60 shadow-sm sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-2.5">
        <div className="flex justify-between items-center">

          {/* Logo + Navigation principale */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/dashboard/pro" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <Image src={LogoZ} alt="Zello logo" width={24} height={24} />
              <span className="text-[#093A23] font-semibold text-lg tracking-tight">ZELLO</span>
            </Link>

            {/* Navigation principale */}
            <nav className="flex gap-0.5 text-[13px] font-medium">

              {/* Menu Tableau de bord */}
              <div
                className="relative"
                onMouseEnter={() => handleEnter('analyse')}
                onMouseLeave={() => handleLeave('analyse')}
              >
                <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  pathname === '/dashboard/pro' || pathname?.includes('/performance') || pathname?.includes('/frequentation') || pathname?.includes('/top-clients') || pathname?.includes('/analyse-produits')
                    ? 'bg-[#093A23]/5 text-[#093A23] font-semibold' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}>
                  <BarChart3 size={15} strokeWidth={2} />
                  Tableau de bord
                  <ChevronDown size={13} className={`transition-transform ${analyseOpen ? 'rotate-180' : ''}`} />
                </button>
                {analyseOpen && (
                  <div className="absolute left-0 bg-white border border-gray-200/60 rounded-xl shadow-xl shadow-gray-200/50 w-56 mt-2 py-1.5 text-[13px] backdrop-blur-sm">
                    <Link href="/dashboard/pro" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <Activity size={15} strokeWidth={2} />
                      Vue d&apos;ensemble
                    </Link>
                    <Link href="/dashboard/pro/performance" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/performance') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <TrendingUp size={15} strokeWidth={2} />
                      Performance
                    </Link>
                    <Link href="/dashboard/pro/frequentation" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/frequentation') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <Calendar size={15} strokeWidth={2} />
                      Fréquentation
                    </Link>
                    <Link href="/dashboard/pro/top-clients" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/top-clients') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <UserCheck size={15} strokeWidth={2} />
                      Top Clients
                    </Link>
                    <Link href="/dashboard/pro/analyse-produits" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/analyse-produits') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <Boxes size={15} strokeWidth={2} />
                      Analyse Produits
                    </Link>
                  </div>
                )}
              </div>

              {/* Menu Commerce */}
              <div
                className="relative"
                onMouseEnter={() => handleEnter('gestion')}
                onMouseLeave={() => handleLeave('gestion')}
              >
                <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  pathname?.includes('/ventes') || pathname?.includes('/produits') || pathname?.includes('/conseil-prix')
                    ? 'bg-[#093A23]/5 text-[#093A23] font-semibold' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}>
                  <ShoppingCart size={15} strokeWidth={2} />
                  Commerce
                  <ChevronDown size={13} className={`transition-transform ${gestionOpen ? 'rotate-180' : ''}`} />
                </button>
                {gestionOpen && (
                  <div className="absolute left-0 bg-white border border-gray-200/60 rounded-xl shadow-xl shadow-gray-200/50 w-52 mt-2 py-1.5 text-[13px] backdrop-blur-sm">
                    <Link href="/dashboard/pro/ventes" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/ventes') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <ShoppingCart size={15} strokeWidth={2} />
                      Saisie ventes
                    </Link>
                    <Link href="/dashboard/pro/produits" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/produits') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <Package size={15} strokeWidth={2} />
                      Produits
                    </Link>
                    <Link href="/dashboard/pro/conseil-prix" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/conseil-prix') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <TrendingUp size={15} strokeWidth={2} />
                      Conseil prix
                    </Link>
                  </div>
                )}
              </div>

              {/* Menu Clients */}
              <div
                className="relative"
                onMouseEnter={() => handleEnter('relation')}
                onMouseLeave={() => handleLeave('relation')}
              >
                <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  pathname?.includes('/clients') || pathname?.includes('/fidelisation') || pathname?.includes('/marketing')
                    ? 'bg-[#093A23]/5 text-[#093A23] font-semibold' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}>
                  <Users size={15} strokeWidth={2} />
                  Clients
                  <ChevronDown size={13} className={`transition-transform ${relationOpen ? 'rotate-180' : ''}`} />
                </button>
                {relationOpen && (
                  <div className="absolute left-0 bg-white border border-gray-200/60 rounded-xl shadow-xl shadow-gray-200/50 w-52 mt-2 py-1.5 text-[13px] backdrop-blur-sm">
                    <Link href="/dashboard/pro/clients" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/clients') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <Users size={15} strokeWidth={2} />
                      Mes clients
                    </Link>
                    <Link href="/dashboard/pro/fidelisation" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/fidelisation') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <Heart size={15} strokeWidth={2} />
                      Fidélisation
                    </Link>
                    <Link href="/dashboard/pro/marketing" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/marketing') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <Mail size={15} strokeWidth={2} />
                      Marketing
                    </Link>
                  </div>
                )}
              </div>

              {/* Menu Configuration */}
              <div
                className="relative"
                onMouseEnter={() => handleEnter('config')}
                onMouseLeave={() => handleLeave('config')}
              >
                <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  pathname?.includes('/boutiques') || pathname?.includes('/integrations') || pathname?.includes('/imports') || pathname?.includes('/exports') || pathname?.includes('/analyses') || pathname?.includes('/previsions')
                    ? 'bg-[#093A23]/5 text-[#093A23] font-semibold' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}>
                  <Settings size={15} strokeWidth={2} />
                  Configuration
                  <ChevronDown size={13} className={`transition-transform ${configOpen ? 'rotate-180' : ''}`} />
                </button>
                {configOpen && (
                  <div className="absolute left-0 bg-white border border-gray-200/60 rounded-xl shadow-xl shadow-gray-200/50 w-56 mt-2 py-1.5 text-[13px] backdrop-blur-sm">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Etablissement</div>
                    <Link href="/dashboard/pro/boutiques" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/boutiques') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <Store size={15} strokeWidth={2} />
                      Mes boutiques
                    </Link>
                    <Link href="/dashboard/pro/integrations" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/integrations') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <Zap size={15} strokeWidth={2} />
                      Intégrations
                    </Link>
                    <div className="my-1.5 border-t border-gray-200/60"></div>
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Données</div>
                    <Link href="/dashboard/pro/imports" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/imports') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <FileUp size={15} strokeWidth={2} />
                      Imports
                    </Link>
                    <Link href="/dashboard/pro/exports" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/exports') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <FileDown size={15} strokeWidth={2} />
                      Exports
                    </Link>
                    <div className="my-1.5 border-t border-gray-200/60"></div>
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Avancé</div>
                    <Link href="/dashboard/pro/analyses" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/analyses') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <BarChart3 size={15} strokeWidth={2} />
                      Analyses avancées
                    </Link>
                    <Link href="/dashboard/pro/previsions" className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 transition-colors ${isActiveLink('/dashboard/pro/previsions') ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'}`}>
                      <TrendingUp size={15} strokeWidth={2} />
                      Prévisions
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Zone droite */}
          <div className="flex items-center gap-3">

            <div className="w-px h-6 bg-gray-300"></div>

            {/* Sélecteur de store */}
            <div className="relative" ref={storeRef}>
              <button
                onClick={() => setStoreMenuOpen(!storeMenuOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#093A23]/10"
              >
                {activeStore?.logo_url ? (
                  <img src={activeStore.logo_url} alt="Logo store" className="w-7 h-7 rounded-lg object-cover ring-1 ring-gray-200" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#093A23] to-[#0d5534] flex items-center justify-center">
                    <Store size={14} className="text-white" />
                  </div>
                )}
                <span className="text-[13px] font-medium text-gray-700 max-w-[110px] truncate">
                  {activeStore?.name || 'Aucun store'}
                </span>
                <ChevronDown size={14} className="text-gray-500" />
              </button>

              {storeMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200/60 rounded-xl shadow-xl shadow-gray-200/50 text-[13px] backdrop-blur-sm">
                  <div className="px-3 py-2.5 border-b border-gray-200/60">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Mes établissements</div>
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1.5">
                    {stores.map(store => (
                      <button
                        key={store.id}
                        onClick={() => handleStoreSelect(store)}
                        className={`w-full text-left px-3.5 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-2.5 ${
                          store.id === activeStore?.id ? 'bg-[#093A23]/5 text-[#093A23] font-medium' : 'text-gray-700'
                        }`}
                      >
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={store.name} className="w-7 h-7 rounded-lg object-cover border border-gray-200" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border border-gray-200">
                            <Store size={13} strokeWidth={2} className="text-gray-500" />
                          </div>
                        )}
                        <span className="flex-1 truncate">{store.name}</span>
                        {store.id === activeStore?.id && (
                          <div className="w-1.5 h-1.5 bg-[#093A23] rounded-full"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profil utilisateur */}
            <div className="relative" ref={userRef}>
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)} 
                className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#093A23]/10"
              >
                {userData?.profile_photo ? (
                  <img src={userData.profile_photo} alt="Profil" className="w-7 h-7 rounded-full ring-1 ring-gray-200" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                    <User size={14} strokeWidth={2} className="text-white" />
                  </div>
                )}
                <span className="text-[13px] font-medium text-gray-700">
                  {userData?.first_name || '...'}
                </span>
                <ChevronDown size={14} className="text-gray-500" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200/60 rounded-xl shadow-xl shadow-gray-200/50 text-[13px] backdrop-blur-sm">
                  <div className="px-3.5 py-3 border-b border-gray-200/60">
                    <div className="font-semibold text-gray-900">{userData?.first_name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Compte professionnel</div>
                  </div>
                  <div className="py-1.5">
                    <Link 
                      href="/dashboard/pro/profil" 
                      className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
                    >
                      <User size={15} strokeWidth={2} />
                      Mon profil
                    </Link>
                    <Link 
                      href="/dashboard/pro/abonnement" 
                      className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
                    >
                      <Crown size={15} strokeWidth={2} />
                      Mon abonnement
                    </Link>
                  </div>
                  <div className="border-t border-gray-200/60 py-1.5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <LogOut size={15} strokeWidth={2} />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

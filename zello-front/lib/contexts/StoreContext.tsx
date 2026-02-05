'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface StoreContextType {
  activeStoreId: string | null
  setActiveStoreId: (storeId: string) => void
  refreshTrigger: number
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [activeStoreId, setActiveStoreIdState] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const fetchActiveStore = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('users')
        .select('active_store_id')
        .eq('id', user.id)
        .single()

      if (data?.active_store_id) {
        setActiveStoreIdState(data.active_store_id)
      }
    }

    fetchActiveStore()
  }, [])

  const setActiveStoreId = async (storeId: string) => {
    // Mettre à jour immédiatement l'état local
    setActiveStoreIdState(storeId)
    
    // Mettre à jour la base de données
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('users')
        .update({ active_store_id: storeId })
        .eq('id', user.id)
    }
    
    // Incrémenter le trigger après la mise à jour pour déclencher les useEffect
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <StoreContext.Provider value={{ activeStoreId, setActiveStoreId, refreshTrigger }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

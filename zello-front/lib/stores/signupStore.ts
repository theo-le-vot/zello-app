import { create } from 'zustand'

type Abonnement = 'free' | 'start' | 'pro' | 'max' | null

type SignupState = {
  // Étape 1 – Infos personnelles
  firstName: string
  lastName: string
  email: string

  // Étape 2 – Établissement
  nom: string
  rue: string
  code_postal: string
  ville: string
  pays: string
  type_activite: string
  annee_ouverture: string
  telephone: string
  siret: string
  description: string

  // Étape 3 – Compte admin
  password: string
  birthdate: string
  phone: string

  // Étape 4 – Offre choisie
  abonnement: Abonnement

  // Méthodes
  setData: (data: Partial<SignupState>) => void
  reset: () => void
}

export const useSignupStore = create<SignupState>()((set) => ({
  firstName: '',
  lastName: '',
  email: '',

  nom: '',
  rue: '',
  code_postal: '',
  ville: '',
  pays: '',
  type_activite: '',
  annee_ouverture: '',
  telephone: '',
  siret: '',
  description: '',

  password: '',
  birthdate: '',
  phone: '',

  abonnement: null,

  setData: (data) => set((state) => ({ ...state, ...data })),
  reset: () =>
    set({
      firstName: '',
      lastName: '',
      email: '',

      nom: '',
      rue: '',
      code_postal: '',
      ville: '',
      pays: '',
      type_activite: '',
      annee_ouverture: '',
      telephone: '',
      siret: '',

      password: '',
      birthdate: '',
      phone: '',

      abonnement: null,
    }),
}))

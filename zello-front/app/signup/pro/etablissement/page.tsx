'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoZ from '/public/logo-z.svg'
import { useSignupStore } from '@/lib/stores/signupStore'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface SiretInfo {
  nom: string
  adresse: string
  codePostal: string
  ville: string
  activite: string
}

export default function EtablissementStep() {
  const router = useRouter()
  const setData = useSignupStore(state => state.setData)

  const [form, setForm] = useState({
    nom: '',
    rue: '',
    code_postal: '',
    ville: '',
    pays: '',
    type_activite: '',
    telephone: '',
    siret: '',
    annee_ouverture: ''
  })

  const [suggestions, setSuggestions] = useState<any[]>([])
  const [siretVerifying, setSiretVerifying] = useState(false)
  const [siretValid, setSiretValid] = useState<boolean | null>(null)
  const [siretInfo, setSiretInfo] = useState<SiretInfo | null>(null)
  const [siretError, setSiretError] = useState<string>('')

  // Vérification du SIRET via API SIRENE
  useEffect(() => {
    const verifySiret = async () => {
      const siret = form.siret.replace(/\s/g, '')
      
      // Validation du format
      if (siret.length === 0) {
        setSiretValid(null)
        setSiretInfo(null)
        setSiretError('')
        return
      }

      if (!/^\d{14}$/.test(siret)) {
        setSiretValid(false)
        setSiretInfo(null)
        setSiretError('Le SIRET doit contenir exactement 14 chiffres')
        return
      }

      setSiretVerifying(true)
      setSiretError('')

      try {
        const response = await fetch(
          `/api/verify-siret?siret=${siret}`
        )

        const data = await response.json()

        if (!response.ok) {
          setSiretValid(false)
          setSiretInfo(null)
          setSiretError(data.error || 'SIRET invalide')
          setSiretVerifying(false)
          return
        }

        // Les données sont déjà formatées par l'API route
        setSiretInfo(data)
        setSiretValid(true)

        // Pré-remplir les champs si vides
        setForm(prev => ({
          ...prev,
          nom: prev.nom || data.nom,
          rue: prev.rue || data.adresse,
          code_postal: prev.code_postal || data.codePostal,
          ville: prev.ville || data.ville,
          pays: prev.pays || 'France'
        }))

      } catch (error) {
        console.error('Erreur vérification SIRET:', error)
        setSiretValid(false)
        setSiretInfo(null)
        setSiretError('Erreur lors de la vérification')
      } finally {
        setSiretVerifying(false)
      }
    }

    const delayDebounce = setTimeout(verifySiret, 800)
    return () => clearTimeout(delayDebounce)
  }, [form.siret])

  // Autocomplétion adresse
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (form.rue.length < 3) {
        setSuggestions([])
        return
      }

      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(form.rue)}&limit=5`)
        const data = await res.json()
        setSuggestions(data.features || [])
      } catch (error) {
        console.error('Erreur autocomplétion adresse :', error)
        setSuggestions([])
      }
    }

    const delayDebounce = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(delayDebounce)
  }, [form.rue])

  const handleSelectSuggestion = (feature: any) => {
    const props = feature.properties
    setForm({
      ...form,
      rue: props.name || '',
      code_postal: props.postcode || '',
      ville: props.city || '',
      pays: 'France'
    })
    setSuggestions([])
  }

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Vérifier que le SIRET est valide avant de continuer
    if (!siretValid) {
      setSiretError('Veuillez entrer un SIRET valide')
      return
    }
    
    setData(form)
    router.push('/signup/pro/compte')
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 relative">
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-[#093A23] font-inter font-bold text-xl"
      >
        <Image src={LogoZ} alt="Zello logo" width={22} height={22} />
        <span className="text-[22px]">ZELLO</span>
      </Link>

      <div className="w-full max-w-md mt-20 mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">
          Informations sur votre établissement
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Ces informations permettent de créer votre fiche boutique.
        </p>

        <form onSubmit={handleContinue} className="space-y-4">
          <FloatingInput
            id="nom"
            label="Nom de la boutique *"
            value={form.nom}
            onChange={val => setForm({ ...form, nom: val })}
            required
          />

          {/* Rue avec autocomplétion */}
          <div className="relative">
            <input
              id="rue"
              type="text"
              required
              placeholder=" "
              value={form.rue}
              onChange={e => setForm({ ...form, rue: e.target.value })}
              className="peer h-12 w-full border border-gray-300 rounded px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23]"
            />
            <label
              htmlFor="rue"
              className="absolute left-4 text-gray-500 text-sm transition-all font-medium
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23]
                peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-sm peer-not-placeholder-shown:text-[#093A23]"
            >
              Rue *
            </label>
            {suggestions.length > 0 && (
              <ul className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-300 rounded mt-1 max-h-52 overflow-auto shadow-md">
                {suggestions.map((sug, idx) => (
                  <li
                    key={idx}
                    onClick={() => handleSelectSuggestion(sug)}
                    className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                  >
                    {sug.properties.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <FloatingInput
            id="code_postal"
            label="Code postal *"
            value={form.code_postal}
            onChange={val => setForm({ ...form, code_postal: val })}
            required
          />
          <FloatingInput
            id="ville"
            label="Ville *"
            value={form.ville}
            onChange={val => setForm({ ...form, ville: val })}
            required
          />
          <FloatingInput
            id="pays"
            label="Pays *"
            value={form.pays}
            onChange={val => setForm({ ...form, pays: val })}
            required
          />

          <FloatingSelect
            id="type_activite"
            label="Type d’activité *"
            value={form.type_activite}
            onChange={val => setForm({ ...form, type_activite: val })}
            options={[
              'boulangerie',
              'épicerie',
              'fromagerie',
              'boucherie',
              'restaurant',
              'café',
              'primeur',
              'traiteur',
              'autre'
            ]}
            required
          />

          <FloatingInput
            id="annee_ouverture"
            label="Année d’ouverture *"
            type="number"
            value={form.annee_ouverture}
            onChange={val => setForm({ ...form, annee_ouverture: val })}
            required
          />
          <FloatingInput
            id="telephone"
            label="Téléphone (optionnel)"
            type="tel"
            value={form.telephone}
            onChange={val => setForm({ ...form, telephone: val })}
          />

          {/* SIRET avec vérification en temps réel */}
          <div className="relative">
            <input
              id="siret"
              type="text"
              required
              placeholder=" "
              value={form.siret}
              onChange={e => setForm({ ...form, siret: e.target.value })}
              className="peer h-12 w-full border border-gray-300 rounded px-4 pr-10 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23]"
              maxLength={14}
            />
            <label
              htmlFor="siret"
              className="absolute left-4 text-gray-500 text-sm transition-all font-medium
                peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23]
                peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-sm peer-not-placeholder-shown:text-[#093A23]"
            >
              SIRET *
            </label>
            
            {/* Icône de statut */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {siretVerifying && <Loader2 className="animate-spin text-gray-400" size={20} />}
              {!siretVerifying && siretValid === true && <CheckCircle className="text-green-600" size={20} />}
              {!siretVerifying && siretValid === false && <XCircle className="text-red-600" size={20} />}
            </div>
          </div>

          {/* Message d'erreur SIRET */}
          {siretError && (
            <p className="text-sm text-red-600 -mt-2">{siretError}</p>
          )}

          {/* Informations de l'entreprise trouvée */}
          {siretInfo && siretValid && (
            <div className="p-4 bg-green-50 border border-green-200 rounded space-y-2">
              <p className="text-sm font-semibold text-green-800">✓ Entreprise trouvée</p>
              <p className="text-sm text-gray-700"><strong>Nom :</strong> {siretInfo.nom}</p>
              <p className="text-sm text-gray-700"><strong>Adresse :</strong> {siretInfo.adresse}</p>
              <p className="text-sm text-gray-700"><strong>Ville :</strong> {siretInfo.codePostal} {siretInfo.ville}</p>
              {siretInfo.activite && (
                <p className="text-sm text-gray-700"><strong>Activité :</strong> {siretInfo.activite}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">Les champs ont été pré-remplis automatiquement</p>
            </div>
          )}

          <button
            type="submit"
            disabled={siretVerifying || !siretValid}
            className="w-full bg-[#093A23] text-white font-semibold py-2 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Continuer
          </button>
        </form>
      </div>
    </main>
  )
}

type FloatingInputProps = {
  id: string
  label: string
  value: string
  onChange: (val: string) => void
  type?: string
  required?: boolean
}

function FloatingInput({ id, label, value, onChange, type = 'text', required = false }: FloatingInputProps) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        required={required}
        placeholder=" "
        value={value}
        onChange={e => onChange(e.target.value)}
        className="peer h-12 w-full border border-gray-300 rounded px-4 pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23]"
      />
      <label
        htmlFor={id}
        className="absolute left-4 text-gray-500 text-sm transition-all font-medium
          peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
          peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23]
          peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-sm peer-not-placeholder-shown:text-[#093A23]"
      >
        {label}
      </label>
    </div>
  )
}

type FloatingSelectProps = {
  id: string
  label: string
  value: string
  onChange: (val: string) => void
  options: string[]
  required?: boolean
}

function FloatingSelect({ id, label, value, onChange, options, required = false }: FloatingSelectProps) {
  return (
    <div className="relative">
      <select
        id={id}
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="peer h-12 w-full border border-gray-300 rounded px-4 pt-5 pb-1 bg-white appearance-none
          focus:outline-none focus:border-[#093A23]"
      >
        <option value="" disabled hidden></option>
        {options.map(option => (
          <option key={option} value={option}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
      <label
        htmlFor={id}
        className="absolute left-4 text-gray-500 text-sm transition-all font-medium pointer-events-none
          peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
          peer-focus:top-1 peer-focus:text-sm peer-focus:text-[#093A23]
          peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-sm peer-not-placeholder-shown:text-[#093A23]"
      >
        {label}
      </label>
    </div>
  )
}

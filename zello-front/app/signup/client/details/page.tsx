'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoZ from '/public/logo-z.svg'
import { supabase } from '@/lib/supabaseClient'
import { useSignupStore } from '@/lib/stores/signupStore'
import { Eye, EyeOff } from 'lucide-react'

export default function SignupClientPage() {
  const router = useRouter()
  const { firstName, lastName, email, setData, reset } = useSignupStore()

  const [form, setForm] = useState({
    street: '',
    postal_code: '',
    city: '',
    country: 'France',
    phone: '',
    birthdate: '',
    password: '',
    confirmPassword: ''
  })

  const [suggestions, setSuggestions] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 🔍 Suggestion d'adresse via adresse.data.gouv.fr
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (form.street.length < 4) {
        setSuggestions([])
        return
      }

      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(form.street)}&limit=5`)
      const data = await res.json()
      setSuggestions(data.features || [])
    }

    const debounce = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(debounce)
  }, [form.street])

  const handleSuggestionClick = (feature: any) => {
    const props = feature.properties
    setForm({
      ...form,
      street: props.name || '',
      postal_code: props.postcode || '',
      city: props.city || '',
      country: 'France'
    })
    setSuggestions([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.password || !form.confirmPassword || !form.birthdate) {
      setError('Tous les champs obligatoires doivent être remplis.')
      return
    }

    if (!isPasswordValid(form.password)) {
      setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?type=client`,
      }
    })

    if (authError || !authData.user) {
      console.error('Erreur auth.signUp:', authError)
      setError('Erreur lors de la création du compte.')
      setLoading(false)
      return
    }

    const userId = authData.user.id

    // Créer l'entrée customer via une fonction PostgreSQL qui bypass RLS
    const { error: insertError } = await supabase.rpc('create_customer_profile', {
      p_auth_user_id: userId,
      p_first_name: firstName,
      p_last_name: lastName,
      p_email: email,
      p_birth_date: form.birthdate,
      p_phone_number: form.phone,
      p_street: form.street,
      p_postal_code: form.postal_code,
      p_city: form.city,
      p_country: form.country
    })

    if (insertError) {
      console.error('Erreur insert customers:', insertError)
      setError("L'inscription a échoué (enregistrement client).")
      setLoading(false)
      return
    }

    // Vérifier si l'utilisateur doit confirmer son email
    if (authData.user && !authData.session) {
      // L'utilisateur doit confirmer son email
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
      return
    }

    reset()
    router.push('/dashboard/client')
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 relative">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-[#093A23] font-inter font-bold text-xl">
        <Image src={LogoZ} alt="Zello logo" width={22} height={22} />
        <span className="text-[22px]">ZELLO</span>
      </Link>

      <div className="w-full max-w-md mt-20 mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">Créer votre compte Zello</h1>
        <p className="text-sm text-gray-600 mb-6">
          Prénom : <strong>{firstName}</strong> • Nom : <strong>{lastName}</strong> • Email : <strong>{email}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Adresse */}
          <FloatingInput id="street" label="Rue" value={form.street} onChange={val => setForm({ ...form, street: val })} />
          {suggestions.length > 0 && (
            <ul className="bg-white border border-gray-300 rounded shadow text-sm max-h-40 overflow-y-auto">
              {suggestions.map((sug, i) => (
                <li key={i} className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleSuggestionClick(sug)}>
                  {sug.properties.label}
                </li>
              ))}
            </ul>
          )}
          <FloatingInput id="postal_code" label="Code postal" value={form.postal_code} onChange={val => setForm({ ...form, postal_code: val })} />
          <FloatingInput id="city" label="Ville" value={form.city} onChange={val => setForm({ ...form, city: val })} />
          <FloatingInput id="country" label="Pays" value={form.country} onChange={val => setForm({ ...form, country: val })} />

          {/* Téléphone */}
          <FloatingInput id="phone" label="Téléphone (optionnel)" type="tel" value={form.phone} onChange={val => setForm({ ...form, phone: val })} />

          {/* Date de naissance */}
          <FloatingInput id="birthdate" label="Date de naissance *" type="date" value={form.birthdate} onChange={val => setForm({ ...form, birthdate: val })} required />

          {/* Mot de passe */}
          <FloatingInput id="password" label="Mot de passe *" type="password" value={form.password} onChange={val => setForm({ ...form, password: val })} required />
          <FloatingInput id="confirmPassword" label="Confirmation du mot de passe *" type="password" value={form.confirmPassword} onChange={val => setForm({ ...form, confirmPassword: val })} required />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="w-full bg-[#093A23] text-white font-semibold py-2 rounded">
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </main>
  )
}

// Validateur de mot de passe
function isPasswordValid(password: string): boolean {
  const minLength = /.{8,}/
  const hasUppercase = /[A-Z]/
  const hasNumber = /[0-9]/
  const hasSpecialChar = /[^A-Za-z0-9]/
  return minLength.test(password) && hasUppercase.test(password) && hasNumber.test(password) && hasSpecialChar.test(password)
}

// Composant input avec label flottant
type FloatingInputProps = {
  id: string
  label: string
  value: string
  onChange: (val: string) => void
  type?: string
  required?: boolean
}

function FloatingInput({ id, label, value, onChange, type = 'text', required = false }: FloatingInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <div className="relative">
      <input
        id={id}
        type={inputType}
        required={required}
        placeholder=" "
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`peer h-12 w-full border border-gray-300 rounded pt-5 pb-1 placeholder-transparent focus:outline-none focus:border-[#093A23] ${
          isPassword ? 'px-4 pr-12' : 'px-4'
        }`}
        autoComplete={isPassword ? 'new-password' : undefined}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      )}
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

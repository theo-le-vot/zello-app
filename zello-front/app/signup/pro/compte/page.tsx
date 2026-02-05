'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoZ from '/public/logo-z.svg'
import { useSignupStore } from '@/lib/stores/signupStore'
import { Eye, EyeOff } from 'lucide-react'

export default function AdminAccountStep() {
  const router = useRouter()
  const setData = useSignupStore(state => state.setData)

  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
    birthdate: '',
    phone: ''
  })

  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isPasswordValid(form.password)) {
      setError(
        'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.'
      )
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setError(null)

    setData({
      password: form.password,
      birthdate: form.birthdate,
      phone: form.phone
    })

    router.push('/signup/pro/offre')
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
          Votre compte administrateur
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Ces informations protègent l’accès à votre établissement.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FloatingInput
            id="password"
            label="Mot de passe *"
            type="password"
            value={form.password}
            onChange={val => {
              setForm({ ...form, password: val })
              setError(null)
            }}
            required
          />
          <FloatingInput
            id="confirmPassword"
            label="Confirmer le mot de passe *"
            type="password"
            value={form.confirmPassword}
            onChange={val => {
              setForm({ ...form, confirmPassword: val })
              setError(null)
            }}
            required
          />
          <FloatingInput
            id="birthdate"
            label="Date de naissance *"
            type="date"
            value={form.birthdate}
            onChange={val => setForm({ ...form, birthdate: val })}
            required
          />
          <FloatingInput
            id="phone"
            label="Téléphone (optionnel)"
            type="tel"
            value={form.phone}
            onChange={val => setForm({ ...form, phone: val })}
          />

          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-[#093A23] text-white font-semibold py-2 rounded"
          >
            Continuer
          </button>
        </form>
      </div>
    </main>
  )
}

function isPasswordValid(password: string): boolean {
  const minLength = /.{8,}/
  const hasUppercase = /[A-Z]/
  const hasNumber = /[0-9]/
  const hasSpecialChar = /[^A-Za-z0-9]/

  return (
    minLength.test(password) &&
    hasUppercase.test(password) &&
    hasNumber.test(password) &&
    hasSpecialChar.test(password)
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

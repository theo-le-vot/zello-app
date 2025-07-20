'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoZ from '/public/logo-z.svg'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    setLoading(true)
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    if (loginError || !data.session?.user) {
      setError("Email ou mot de passe incorrect.")
      setLoading(false)
      return
    }

    // 🔍 Vérifie si c'est un client ou commerçant
    const userId = data.session.user.id

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    router.push(customer ? '/dashboard/client' : '/dashboard/pro')
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 relative">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-[#093A23] font-inter font-bold text-xl">
        <Image src={LogoZ} alt="Zello logo" width={22} height={22} />
        <span className="text-[22px]">ZELLO</span>
      </Link>

      <div className="w-full max-w-md mt-20 mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold mb-4">Connexion</h1>
        <p className="text-sm text-gray-600 mb-6">Accédez à votre espace Zello</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <FloatingInput id="email" label="Email" type="email" value={email} onChange={setEmail} required />
          <FloatingInput id="password" label="Mot de passe" type="password" value={password} onChange={setPassword} required />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="w-full bg-[#093A23] text-white font-semibold py-2 rounded">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-600">
          Vous n’avez pas encore de compte ?{' '}
          <Link href="/signup" className="text-[#093A23] font-medium">Créer un compte</Link>
        </p>
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

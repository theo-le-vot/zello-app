'use client'

import Link from 'next/link'
import Image from 'next/image'
import LogoZ from '/public/logo-z.svg'
import { useState } from 'react'

export default function HeaderPublic() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 w-full bg-white border-b border-black/10 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex justify-between items-center relative">
        {/* Burger visible si petit ou moyen écran */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="block lg:hidden text-2xl text-black"
        >
          ☰
        </button>

        {/* Centre : logo toujours visible */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 font-inter font-bold text-[#093A23] text-xl">
          <Image src={LogoZ} alt="Zello logo" width={22} height={22} />
          <span className="text-[22px]">ZELLO</span>
        </div>

        {/* Menu gauche : visible uniquement en lg+ */}
        <nav className="hidden lg:flex gap-6 text-sm font-medium text-black font-poppins">
          <Link href="#home">Accueil</Link>
          <Link href="#features">Fonctionnalités</Link>
          <Link href="#pricing">Tarifs</Link>
          <Link href="#contact">Nous contacter</Link>
        </nav>

        {/* Boutons droite : visible à partir de md+, caché en sm */}
        <div className="hidden md:flex gap-3 text-sm font-poppins items-center">
          <Link href="/login" className="text-black font-medium">
            SE CONNECTER
          </Link>
          <Link
            href="/signup"
            className="bg-[#093A23] text-white px-4 py-1.5 rounded"
          >
            INSCRIPTION
          </Link>
        </div>
      </div>

      {/* Menu burger (mobile ET tablette) */}
      {isOpen && (
        <div className="lg:hidden bg-white border-t border-black/10 px-4 py-4 space-y-3 text-sm font-poppins">
          <Link href="#home" onClick={() => setIsOpen(false)}>Accueil</Link>
          <Link href="#features" onClick={() => setIsOpen(false)}>Fonctionnalités</Link>
          <Link href="#pricing" onClick={() => setIsOpen(false)}>Tarifs</Link>
          <Link href="#contact" onClick={() => setIsOpen(false)}>Nous contacter</Link>
          <hr className="my-2" />
          {/* Boutons aussi ici pour mobile uniquement */}
          <div className="md:hidden space-y-2">
            <Link href="/login" onClick={() => setIsOpen(false)} className="block">
              Se connecter
            </Link>
            <Link
              href="/signup"
              onClick={() => setIsOpen(false)}
              className="block bg-[#093A23] text-white text-center py-2 rounded"
            >
              Inscription
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

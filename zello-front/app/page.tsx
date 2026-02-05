'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import HeaderPublic from '@/components/HeaderPublic'
import { 
  Heart, 
  Users, 
  TrendingUp, 
  Gift, 
  BarChart3, 
  Smartphone,
  Check,
  Mail,
  Phone,
  MapPin,
  ChevronRight
} from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [submitStatus, setSubmitStatus] = useState<string | null>(null)

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitStatus('Envoi en cours...')
    
    // Simuler l'envoi (à remplacer par votre logique d'envoi réelle)
    setTimeout(() => {
      setSubmitStatus('✅ Message envoyé avec succès !')
      setContactForm({ name: '', email: '', subject: '', message: '' })
      setTimeout(() => setSubmitStatus(null), 3000)
    }, 1000)
  }

  return (
    <>
      <HeaderPublic />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-[#093A23] to-[#0a5030]">
        <div className="max-w-6xl mx-auto text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Fidélisez vos clients avec Zello
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-green-100 max-w-3xl mx-auto">
            La solution de fidélisation moderne pour les commerçants de proximité. 
            Simple, efficace et rentable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/signup/pro')}
              className="bg-white text-[#093A23] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
            >
              Commencer gratuitement
              <ChevronRight size={20} />
            </button>
            <button
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors"
            >
              Nous contacter
            </button>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-gray-600">
              Des fonctionnalités pensées pour les commerçants
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Carte Fidélité Digitale */}
            <div className="bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl border border-green-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-[#093A23] rounded-xl flex items-center justify-center mb-6">
                <Heart className="text-white" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Carte de fidélité digitale
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Vos clients accumulent des points à chaque visite directement sur leur smartphone. Plus besoin de cartes papier.
              </p>
            </div>

            {/* Gestion Clients */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-blue-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Users className="text-white" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Gestion de clientèle
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Suivez vos clients fidèles, leurs habitudes et leur historique d'achats pour mieux les servir.
              </p>
            </div>

            {/* Analytics */}
            <div className="bg-gradient-to-br from-purple-50 to-white p-8 rounded-2xl border border-purple-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="text-white" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Statistiques détaillées
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Analysez vos performances, votre fréquentation et identifiez vos meilleurs clients.
              </p>
            </div>

            {/* Récompenses */}
            <div className="bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl border border-orange-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center mb-6">
                <Gift className="text-white" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Récompenses personnalisées
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Créez vos propres récompenses et offres pour encourager la fidélité de vos clients.
              </p>
            </div>

            {/* Marketing */}
            <div className="bg-gradient-to-br from-pink-50 to-white p-8 rounded-2xl border border-pink-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-pink-600 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="text-white" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Outils marketing
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Communiquez facilement avec vos clients et lancez des campagnes ciblées.
              </p>
            </div>

            {/* Application Mobile */}
            <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-2xl border border-indigo-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <Smartphone className="text-white" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Application intuitive
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Interface simple et moderne, accessible depuis n'importe quel appareil.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tarifs simples et transparents
            </h2>
            <p className="text-xl text-gray-600">
              Choisissez la formule adaptée à votre commerce
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Gratuit */}
            <div className="bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-[#093A23] transition-colors">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Gratuit</h3>
                <div className="text-5xl font-bold text-gray-900 mb-2">0€</div>
                <p className="text-gray-600">par mois</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="text-[#093A23] flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-700">Jusqu'à 100 clients</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-[#093A23] flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-700">Carte de fidélité digitale</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-[#093A23] flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-700">Statistiques basiques</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-[#093A23] flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-700">Support email</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/signup/pro/offre')}
                className="w-full bg-gray-100 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Commencer
              </button>
            </div>

            {/* Pro */}
            <div className="bg-[#093A23] text-white p-8 rounded-2xl border-2 border-[#093A23] relative transform scale-105 shadow-xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Populaire
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="text-5xl font-bold mb-2">29€</div>
                <p className="text-green-100">par mois</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="text-green-300 flex-shrink-0 mt-1" size={20} />
                  <span>Clients illimités</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-green-300 flex-shrink-0 mt-1" size={20} />
                  <span>Toutes les fonctionnalités</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-green-300 flex-shrink-0 mt-1" size={20} />
                  <span>Statistiques avancées</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-green-300 flex-shrink-0 mt-1" size={20} />
                  <span>Campagnes marketing</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-green-300 flex-shrink-0 mt-1" size={20} />
                  <span>Support prioritaire</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-green-300 flex-shrink-0 mt-1" size={20} />
                  <span>Personnalisation avancée</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/signup/pro/offre')}
                className="w-full bg-white text-[#093A23] py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors"
              >
                Commencer l'essai gratuit
              </button>
            </div>

            {/* Entreprise */}
            <div className="bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-[#093A23] transition-colors">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Entreprise</h3>
                <div className="text-5xl font-bold text-gray-900 mb-2">Sur mesure</div>
                <p className="text-gray-600">contactez-nous</p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="text-[#093A23] flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-700">Multi-établissements</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-[#093A23] flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-700">API et intégrations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-[#093A23] flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-700">Formation dédiée</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-[#093A23] flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-700">Support 24/7</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-[#093A23] flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-700">Accompagnement personnalisé</span>
                </li>
              </ul>
              <button
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full bg-gray-100 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Nous contacter
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Nous contacter
            </h2>
            <p className="text-xl text-gray-600">
              Une question ? Notre équipe est là pour vous aider
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Informations de contact */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Coordonnées
                </h3>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="text-[#093A23]" size={24} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Email</div>
                      <a href="mailto:contact@zello.fr" className="text-[#093A23] hover:underline">
                        contact@zello.fr
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="text-[#093A23]" size={24} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Téléphone</div>
                      <a href="tel:+33123456789" className="text-[#093A23] hover:underline">
                        +33 1 23 45 67 89
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="text-[#093A23]" size={24} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Adresse</div>
                      <p className="text-gray-600">
                        123 Avenue des Champs-Élysées<br />
                        75008 Paris, France
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                <h4 className="font-semibold text-gray-900 mb-2">Horaires d'ouverture</h4>
                <p className="text-gray-600">
                  Lundi - Vendredi : 9h00 - 18h00<br />
                  Samedi - Dimanche : Fermé
                </p>
              </div>
            </div>

            {/* Formulaire de contact */}
            <div className="bg-gray-50 p-8 rounded-2xl">
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#093A23] focus:ring-2 focus:ring-green-100 outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#093A23] focus:ring-2 focus:ring-green-100 outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Sujet
                  </label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#093A23] focus:ring-2 focus:ring-green-100 outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Message
                  </label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#093A23] focus:ring-2 focus:ring-green-100 outline-none transition-colors resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#093A23] text-white py-3 rounded-lg font-semibold hover:bg-[#0a5030] transition-colors"
                >
                  Envoyer le message
                </button>

                {submitStatus && (
                  <p className={`text-center ${submitStatus.includes('✅') ? 'text-green-600' : 'text-gray-600'}`}>
                    {submitStatus}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#093A23] to-[#0a5030]">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            Prêt à fidéliser vos clients ?
          </h2>
          <p className="text-xl mb-8 text-green-100">
            Rejoignez des centaines de commerçants qui ont déjà fait confiance à Zello
          </p>
          <button
            onClick={() => router.push('/signup/pro')}
            className="bg-white text-[#093A23] px-10 py-4 rounded-lg font-semibold text-lg hover:bg-green-50 transition-colors inline-flex items-center gap-2"
          >
            Démarrer gratuitement
            <ChevronRight size={20} />
          </button>
        </div>
      </section>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { User, Mail, Phone, MapPin, Calendar, Image as ImageIcon, Lock, Bell, Settings, Save, Edit2, X, CheckCircle } from 'lucide-react'

interface UserProfile {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_number?: string
  profile_photo?: string
  created_at: string
}

export default function ProfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [authEmail, setAuthEmail] = useState<string>('')
  
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    first_name: '',
    last_name: '',
    phone_number: '',
    profile_photo: ''
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [notifications, setNotifications] = useState({
    email: true,
    ventes: true,
    objectifs: true,
    marketing: false
  })

  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }

      setAuthEmail(authUser.email || '')

      const { data: userData, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone_number, profile_photo, created_at')
        .eq('id', authUser.id)
        .single()

      if (error) throw error

      setUser(userData)
      setFormData({
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone_number: userData.phone_number || '',
        profile_photo: userData.profile_photo || ''
      })
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image')
      return
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5MB')
      return
    }

    setUploadingImage(true)
    try {
      // Créer un nom de fichier unique
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `profile-photos/${fileName}`

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Obtenir l'URL publique
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Mettre à jour le formulaire
      setFormData({ ...formData, profile_photo: data.publicUrl })

    } catch (error: any) {
      console.error('Erreur upload:', error)
      alert('Erreur lors de l\'upload: ' + (error.message || 'Erreur inconnue'))
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_number: formData.phone_number || null,
          profile_photo: formData.profile_photo || null
        })
        .eq('id', user.id)

      if (error) throw error

      setIsEditingProfile(false)
      await fetchUserData()
      
      // Forcer le rechargement de la page pour mettre à jour l'avatar dans le header
      window.location.reload()
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + (error.message || 'Erreur inconnue'))
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Les mots de passe ne correspondent pas')
      return
    }

    if (passwordData.newPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      setIsEditingPassword(false)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + (error.message || 'Erreur inconnue'))
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    if (!confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) return

    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Erreur déconnexion:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#093A23] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <User className="text-[#093A23]" size={32} />
          Mon profil
        </h1>
        <p className="text-gray-600 mt-1">Gérez vos informations personnelles et paramètres</p>
      </div>

      {/* Carte profil principal */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#093A23] to-[#0d5534] h-24"></div>
        <div className="px-6 pb-6">
          <div className="flex items-end gap-6 -mt-12 mb-6">
            {user.profile_photo ? (
              <img
                src={user.profile_photo}
                alt={`${user.first_name} ${user.last_name}`}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-[#093A23] to-[#0d5534] flex items-center justify-center">
                <User size={40} className="text-white" />
              </div>
            )}
            <div className="flex-1 mt-14">
              <h2 className="text-2xl font-bold text-gray-900">
                {user.first_name} {user.last_name}
              </h2>
              <p className="text-gray-600">{authEmail}</p>
            </div>
            <button
              onClick={() => setIsEditingProfile(true)}
              className="mt-14 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Edit2 size={16} />
              Modifier
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Mail className="text-[#093A23]" size={20} />
              <div>
                <div className="text-xs text-gray-500 uppercase font-semibold">Email</div>
                <div className="text-gray-900 font-medium">{authEmail}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Phone className="text-[#093A23]" size={20} />
              <div>
                <div className="text-xs text-gray-500 uppercase font-semibold">Téléphone</div>
                <div className="text-gray-900 font-medium">{user.phone_number || 'Non renseigné'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Calendar className="text-[#093A23]" size={20} />
              <div>
                <div className="text-xs text-gray-500 uppercase font-semibold">Membre depuis</div>
                <div className="text-gray-900 font-medium">
                  {new Date(user.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="text-green-600" size={20} />
              <div>
                <div className="text-xs text-green-600 uppercase font-semibold">Statut</div>
                <div className="text-green-700 font-medium">Compte vérifié</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sécurité */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Lock className="text-[#093A23]" size={24} />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Sécurité</h3>
              <p className="text-sm text-gray-600">Gérez votre mot de passe et sécurité du compte</p>
            </div>
          </div>
          {!isEditingPassword && (
            <button
              onClick={() => setIsEditingPassword(true)}
              className="text-[#093A23] hover:text-[#0b472c] font-medium text-sm flex items-center gap-2"
            >
              <Edit2 size={16} />
              Modifier le mot de passe
            </button>
          )}
        </div>

        {isEditingPassword ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Minimum 6 caractères"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Retapez votre mot de passe"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleChangePassword}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                onClick={() => {
                  setIsEditingPassword(false)
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Lock className="text-gray-400" size={20} />
            <div>
              <div className="text-sm text-gray-900 font-medium">Mot de passe</div>
              <div className="text-xs text-gray-500">••••••••••</div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="text-[#093A23]" size={24} />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
            <p className="text-sm text-gray-600">Gérez vos préférences de notifications</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Notifications par email</div>
              <div className="text-sm text-gray-600">Recevoir les notifications importantes par email</div>
            </div>
            <button
              onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                notifications.email ? 'bg-[#093A23]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  notifications.email ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Nouvelles ventes</div>
              <div className="text-sm text-gray-600">Être notifié lors de chaque nouvelle vente</div>
            </div>
            <button
              onClick={() => setNotifications({ ...notifications, ventes: !notifications.ventes })}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                notifications.ventes ? 'bg-[#093A23]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  notifications.ventes ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Objectifs atteints</div>
              <div className="text-sm text-gray-600">Recevoir une notification quand vous atteignez vos objectifs</div>
            </div>
            <button
              onClick={() => setNotifications({ ...notifications, objectifs: !notifications.objectifs })}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                notifications.objectifs ? 'bg-[#093A23]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  notifications.objectifs ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Conseils marketing</div>
              <div className="text-sm text-gray-600">Recevoir des conseils et astuces pour améliorer vos ventes</div>
            </div>
            <button
              onClick={() => setNotifications({ ...notifications, marketing: !notifications.marketing })}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                notifications.marketing ? 'bg-[#093A23]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  notifications.marketing ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Déconnexion */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Déconnexion</h3>
            <p className="text-sm text-gray-600">Se déconnecter de votre compte</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
          >
            Se déconnecter
          </button>
        </div>
      </div>

      {/* Modal édition profil */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-xl font-bold text-gray-900">Modifier mon profil</h2>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone_number || ''}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="06 12 34 56 78"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Photo de profil
                </label>
                
                {/* Aperçu de l'image actuelle */}
                {formData.profile_photo && (
                  <div className="mb-3 flex items-center gap-3">
                    <img
                      src={formData.profile_photo}
                      alt="Photo de profil"
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80'
                      }}
                    />
                    <button
                      onClick={() => setFormData({ ...formData, profile_photo: '' })}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Supprimer
                    </button>
                  </div>
                )}

                {/* Upload depuis l'ordinateur */}
                <div className="space-y-2">
                  <label className="block">
                    <div className="flex items-center justify-center w-full h-32 px-4 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                        <div className="text-sm text-gray-600">
                          {uploadingImage ? (
                            <span className="font-medium text-[#093A23]">Upload en cours...</span>
                          ) : (
                            <>
                              <span className="font-medium text-[#093A23]">Cliquez pour charger</span>
                              <span className="text-gray-500"> ou glissez une image</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF jusqu'à 5MB</p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>

                  {/* OU entrer une URL */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">OU</span>
                    </div>
                  </div>

                  <input
                    type="url"
                    value={formData.profile_photo || ''}
                    onChange={(e) => setFormData({ ...formData, profile_photo: e.target.value })}
                    placeholder="Entrez une URL d'image"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#093A23] focus:border-[#093A23]"
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setIsEditingProfile(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#093A23] to-[#0d5534] hover:from-[#0b472c] hover:to-[#106640] text-white rounded-lg transition shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

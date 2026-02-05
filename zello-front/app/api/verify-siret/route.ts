import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const siret = searchParams.get('siret')

  if (!siret || !/^\d{14}$/.test(siret)) {
    return NextResponse.json(
      { error: 'SIRET invalide' },
      { status: 400 }
    )
  }

  try {
    // Essayer d'abord l'API recherche-entreprises.api.gouv.fr (plus stable)
    const response = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${siret}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'SIRET introuvable' },
        { status: 404 }
      )
    }

    const data = await response.json()
    
    if (!data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: 'SIRET introuvable' },
        { status: 404 }
      )
    }

    const entreprise = data.results[0]

    // Vérifier que l'établissement est actif
    if (entreprise.etat_administratif !== 'A') {
      return NextResponse.json(
        { error: 'Établissement fermé' },
        { status: 400 }
      )
    }

    // Retourner les informations essentielles
    return NextResponse.json({
      nom: entreprise.nom_complet || entreprise.nom_raison_sociale || 'Nom non disponible',
      adresse: entreprise.siege?.adresse || '',
      codePostal: entreprise.siege?.code_postal || '',
      ville: entreprise.siege?.libelle_commune || '',
      activite: entreprise.activite_principale || ''
    })
  } catch (error) {
    console.error('Erreur API SIRENE:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    )
  }
}

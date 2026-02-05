import { NextRequest, NextResponse } from 'next/server'

// Route pour tester la connexion à Square
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token requis' },
        { status: 400 }
      )
    }

    // Détecter si c'est un token Sandbox ou Production
    const isSandbox = accessToken.startsWith('EAAA')
    const baseUrl = isSandbox ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
    
    // Tester la connexion en récupérant les locations
    const response = await fetch(`${baseUrl}/v2/locations`, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Square API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: error
      })
      return NextResponse.json(
        { 
          success: false, 
          error: `Token invalide ou expiré (${response.status})`, 
          details: error,
          hint: 'Vérifiez que vous utilisez un token Sandbox (depuis le toggle en haut de la page Credentials)',
          fullError: JSON.stringify(error, null, 2)
        },
        { status: 401 }
      )
    }

    const locationsData = await response.json()
    const locations = locationsData.locations || []

    if (locations.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Aucun point de vente trouvé', 
          hint: 'Créez un point de vente dans votre Sandbox Dashboard: https://squareupsandbox.com/dashboard/locations'
        },
        { status: 404 }
      )
    }

    // Récupérer les infos du marchand depuis la première location
    const firstLocation = locations[0]
    
    return NextResponse.json({
      success: true,
      merchant: {
        id: firstLocation.merchant_id,
        business_name: firstLocation.business_name || firstLocation.name,
        country: firstLocation.country
      },
      locations: locations.map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address?.address_line_1,
        status: loc.status
      }))
    })

  } catch (error: any) {
    console.error('Erreur test connexion Square:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur', details: error.message },
      { status: 500 }
    )
  }
}

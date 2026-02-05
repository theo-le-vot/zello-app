import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SquareCatalogItem {
  id: string
  type: string
  item_data?: {
    name: string
    description?: string
    category_id?: string
    variations?: Array<{
      id: string
      type: string
      item_variation_data: {
        item_id: string
        name: string
        price_money?: {
          amount: number
          currency: string
        }
      }
    }>
  }
}

export async function POST(request: NextRequest) {
  try {
    const { storeId, accessToken } = await request.json()

    if (!accessToken || !storeId) {
      return NextResponse.json(
        { error: 'Access token et store ID requis' },
        { status: 400 }
      )
    }

    // Détecter si c'est un token Sandbox ou Production
    const isSandbox = accessToken.startsWith('EAAA')
    const baseUrl = isSandbox ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'

    // 1. Récupérer tous les items du catalogue Square
    const catalogUrl = `${baseUrl}/v2/catalog/list?types=ITEM`
    
    const response = await fetch(catalogUrl, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Erreur Square Catalog API:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération du catalogue Square', details: error },
        { status: response.status }
      )
    }

    const catalogData = await response.json()
    const items: SquareCatalogItem[] = catalogData.objects || []

    // 2. Importer les produits dans Supabase
    let importedCount = 0
    let updatedCount = 0
    const errors: string[] = []

    for (const item of items) {
      if (item.type !== 'ITEM' || !item.item_data) continue

      const itemData = item.item_data
      const variations = itemData.variations || []

      // Si pas de variations, créer un produit simple
      if (variations.length === 0) {
        try {
          // Vérifier si le produit existe déjà (par external_id)
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('store_id', storeId)
            .eq('external_id', item.id)
            .eq('external_source', 'square')
            .single()

          const productData = {
            store_id: storeId,
            name: itemData.name,
            description: itemData.description || null,
            price: 0, // Pas de prix sans variation
            external_id: item.id,
            external_source: 'square',
            available: true
          }

          if (existing) {
            // Mettre à jour le produit existant
            await supabase
              .from('products')
              .update(productData)
              .eq('id', existing.id)
            updatedCount++
          } else {
            // Créer un nouveau produit
            await supabase
              .from('products')
              .insert(productData)
            importedCount++
          }
        } catch (error: any) {
          errors.push(`${itemData.name}: ${error.message}`)
        }
        continue
      }

      // Pour chaque variation (taille, couleur, etc.), créer un produit
      for (const variation of variations) {
        try {
          const variationData = variation.item_variation_data
          const price = variationData.price_money 
            ? variationData.price_money.amount / 100 
            : 0

          // Construire le nom complet (Item + Variation)
          const fullName = variationData.name === 'Regular' || variationData.name === itemData.name
            ? itemData.name
            : `${itemData.name} - ${variationData.name}`

          // Vérifier si le produit existe déjà
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('store_id', storeId)
            .eq('external_id', variation.id)
            .eq('external_source', 'square')
            .single()

          const productData = {
            store_id: storeId,
            name: fullName,
            description: itemData.description || null,
            price: price,
            external_id: variation.id, // ID de la variation
            external_source: 'square',
            external_parent_id: item.id, // ID de l'item parent
            available: true
          }

          if (existing) {
            // Mettre à jour
            await supabase
              .from('products')
              .update(productData)
              .eq('id', existing.id)
            updatedCount++
          } else {
            // Créer
            await supabase
              .from('products')
              .insert(productData)
            importedCount++
          }
        } catch (error: any) {
          errors.push(`${itemData.name} - ${variation.item_variation_data.name}: ${error.message}`)
        }
      }
    }

    // 3. Logger l'import
    await supabase
      .from('integration_sync_logs')
      .insert({
        integration_id: (await supabase
          .from('integrations')
          .select('id')
          .eq('store_id', storeId)
          .eq('provider', 'square')
          .single()).data?.id,
        sync_type: 'catalog_import',
        status: errors.length > 0 ? 'partial' : 'success',
        products_synced: importedCount + updatedCount,
        error_message: errors.length > 0 ? errors.join('; ') : null
      })

    return NextResponse.json({
      success: true,
      imported: importedCount,
      updated: updatedCount,
      total: importedCount + updatedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `${importedCount} produits importés, ${updatedCount} mis à jour`
    })

  } catch (error: any) {
    console.error('Erreur import catalogue Square:', error)
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    )
  }
}

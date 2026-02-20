import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SquareCustomer {
  id: string
  given_name?: string
  family_name?: string
  email_address?: string
  phone_number?: string
  created_at: string
  updated_at: string
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

    // 1. Récupérer tous les clients depuis Square
    const customersUrl = `${baseUrl}/v2/customers`
    
    const response = await fetch(customersUrl, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Erreur Square Customers API:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des clients Square', details: error },
        { status: response.status }
      )
    }

    const customersData = await response.json()
    const customers: SquareCustomer[] = customersData.customers || []

    console.log(`👥 Synchronisation clients: ${customers.length} clients trouvés dans Square`)

    // 2. Synchroniser les clients dans Supabase
    let importedCount = 0
    let updatedCount = 0
    const errors: string[] = []

    for (const customer of customers) {
      try {
        // Vérifier si le client existe déjà (par external_id)
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('external_id', customer.id)
          .eq('external_source', 'square')
          .single()

        const customerData = {
          first_name: customer.given_name || '',
          last_name: customer.family_name || '',
          email: customer.email_address || null,
          phone_number: customer.phone_number || null,
          external_id: customer.id,
          external_source: 'square'
        }

        let customerId: string | null = null

        if (existing) {
          // Mettre à jour le client existant
          const { error: updateError } = await supabase
            .from('customers')
            .update(customerData)
            .eq('id', existing.id)
          
          if (updateError) {
            console.error('Erreur update customer:', updateError)
            errors.push(`${customer.given_name} ${customer.family_name}: ${updateError.message}`)
          } else {
            updatedCount++
            customerId = existing.id
          }
        } else {
          // Créer un nouveau client
          const { data: newCustomer, error: insertError } = await supabase
            .from('customers')
            .insert(customerData)
            .select('id')
            .single()
          
          if (insertError || !newCustomer) {
            console.error('Erreur insert customer:', insertError)
            errors.push(`${customer.given_name} ${customer.family_name}: ${insertError?.message || 'Unknown error'}`)
          } else {
            importedCount++
            customerId = newCustomer.id
          }
        }

        // Créer la relation avec le store dans customers_stores si le client a été créé/mis à jour
        if (customerId) {
          const { error: csError } = await supabase
            .from('customers_stores')
            .upsert({
              customer_id: customerId,
              store_id: storeId,
              points: 0,
              visits: 0
            }, {
              onConflict: 'customer_id,store_id'
            })
          
          if (csError) {
            console.error('Erreur customers_stores:', csError)
          }
        }
      } catch (error: any) {
        errors.push(`${customer.given_name} ${customer.family_name}: ${error.message}`)
      }
    }

    console.log(`✅ Synchronisation terminée: ${importedCount} nouveaux, ${updatedCount} mis à jour`)

    return NextResponse.json({
      success: true,
      imported: importedCount,
      updated: updatedCount,
      total: customers.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `${importedCount} clients importés, ${updatedCount} mis à jour depuis Square`
    })

  } catch (error: any) {
    console.error('Erreur synchronisation clients Square:', error)
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    )
  }
}

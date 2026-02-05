import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Interface pour les données Square
interface SquarePayment {
  id: string
  created_at: string
  amount_money: {
    amount: number
    currency: string
  }
  status: string
  location_id: string
  customer_id?: string
}

interface SquareOrder {
  id: string
  created_at: string
  total_money: {
    amount: number
    currency: string
  }
  line_items?: Array<{
    name: string
    quantity: string
    base_price_money: {
      amount: number
    }
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { storeId, accessToken, locationId, startDate, endDate } = await request.json()

    if (!accessToken || !locationId) {
      return NextResponse.json(
        { error: 'Access token et location ID requis' },
        { status: 400 }
      )
    }

    // Détecter si c'est un token Sandbox ou Production
    const isSandbox = accessToken.startsWith('EAAA')
    const baseUrl = isSandbox ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'

    // 1. Récupérer les paiements depuis Square
    const paymentsUrl = `${baseUrl}/v2/payments?location_id=${locationId}&begin_time=${startDate}&end_time=${endDate}`
    
    const paymentsResponse = await fetch(paymentsUrl, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!paymentsResponse.ok) {
      const error = await paymentsResponse.json()
      console.error('Erreur Square API:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des paiements Square', details: error },
        { status: paymentsResponse.status }
      )
    }

    const paymentsData = await paymentsResponse.json()
    const payments: SquarePayment[] = paymentsData.payments || []

    // 2. Récupérer les commandes associées
    const orderIds = payments
      .filter(p => p.status === 'COMPLETED')
      .map(p => (p as any).order_id)
      .filter(Boolean)

    let orders: SquareOrder[] = []
    if (orderIds.length > 0) {
      const ordersResponse = await fetch(`${baseUrl}/v2/orders/batch-retrieve`, {
        method: 'POST',
        headers: {
          'Square-Version': '2024-01-18',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order_ids: orderIds })
      })

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        orders = ordersData.orders || []
      }
    }

    // 3. Synchroniser dans Supabase
    const syncedTransactions = []
    
    for (const payment of payments) {
      if (payment.status !== 'COMPLETED') continue

      // Convertir les centimes en euros
      const amount = payment.amount_money.amount / 100

      // Trouver la commande associée
      const order = orders.find(o => o.id === (payment as any).order_id)

      // Créer la transaction dans Supabase
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          store_id: storeId,
          date: payment.created_at,
          total_amount: amount,
          payment_method: 'Carte bancaire',
          transaction_type_code: 'V',
          external_id: payment.id,
          external_source: 'square'
        })
        .select()
        .single()

      if (txError) {
        console.error('Erreur insertion transaction:', txError)
        continue
      }

      // Ajouter les produits de la commande
      if (order && order.line_items && transaction) {
        for (const item of order.line_items) {
          const catalogItemId = (item as any).catalog_object_id // ID de la variation Square
          
          // Chercher le produit par external_id (lien Square)
          let { data: product } = await supabase
            .from('products')
            .select('id')
            .eq('store_id', storeId)
            .eq('external_id', catalogItemId)
            .eq('external_source', 'square')
            .single()

          // Si pas trouvé par external_id, chercher par nom (fallback)
          if (!product) {
            const { data: productByName } = await supabase
              .from('products')
              .select('id')
              .eq('store_id', storeId)
              .eq('name', item.name)
              .single()
            
            product = productByName
          }

          // Si toujours pas trouvé, créer le produit avec external_id
          if (!product) {
            const { data: newProduct } = await supabase
              .from('products')
              .insert({
                store_id: storeId,
                name: item.name,
                price: item.base_price_money.amount / 100,
                external_id: catalogItemId,
                external_source: 'square',
                available: true
              })
              .select()
              .single()
            
            product = newProduct
          }

          if (product) {
            await supabase
              .from('transaction_products')
              .insert({
                transaction_id: transaction.id,
                product_id: product.id,
                quantity: parseInt(item.quantity),
                unit_price: item.base_price_money.amount / 100
              })
          }
        }
      }

      syncedTransactions.push(transaction)
    }

    // 4. Mettre à jour la dernière synchro
    const { data: integration } = await supabase
      .from('integrations')
      .select('sync_count')
      .eq('store_id', storeId)
      .eq('provider', 'square')
      .single()

    await supabase
      .from('integrations')
      .update({ 
        last_sync_at: new Date().toISOString(),
        sync_count: (integration?.sync_count || 0) + 1
      })
      .eq('store_id', storeId)
      .eq('provider', 'square')

    return NextResponse.json({
      success: true,
      synced: syncedTransactions.length,
      message: `${syncedTransactions.length} transactions synchronisées depuis Square`
    })

  } catch (error: any) {
    console.error('Erreur synchronisation Square:', error)
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    )
  }
}

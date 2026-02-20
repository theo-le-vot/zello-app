const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://myfbxijggwqphggqykdm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15ZmJ4aWpnZ3dxcGhnZ3F5a2RtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjI3NzA3MywiZXhwIjoyMDUxODUzMDczfQ.dxEebf5qTMYYb4EpXcivZhVq8dXF9nxL3RbMR1LmV-M'
)

async function checkTransactionTypes() {
  console.log('🔍 Récupération des types de transaction...\n')
  
  const { data, error } = await supabase
    .from('transaction_type')
    .select('*')
  
  if (error) {
    console.error('❌ Erreur:', error)
    return
  }
  
  console.log(`✅ ${data.length} type(s) de transaction trouvé(s):\n`)
  data.forEach(type => {
    console.log(`  - ID: ${type.id}`)
    console.log(`    Code: ${type.code}`)
    console.log(`    Label: ${type.label}`)
    console.log()
  })
}

checkTransactionTypes()

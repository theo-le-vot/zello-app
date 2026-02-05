-- Table pour stocker les configurations d'intégrations
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'square', 'sumup', 'shopify', etc.
  status VARCHAR(20) NOT NULL DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
  
  -- Credentials (chiffrés côté application)
  access_token TEXT,
  refresh_token TEXT,
  location_id VARCHAR(255), -- Pour Square: ID du point de vente
  
  -- Metadata
  merchant_id VARCHAR(255),
  merchant_name VARCHAR(255),
  
  -- Configuration de synchronisation
  sync_enabled BOOLEAN DEFAULT true,
  sync_transactions BOOLEAN DEFAULT true,
  sync_products BOOLEAN DEFAULT true,
  sync_customers BOOLEAN DEFAULT true,
  
  -- Historique
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte unique par store et provider
  UNIQUE(store_id, provider)
);

-- Index pour recherche rapide
CREATE INDEX idx_integrations_store ON integrations(store_id);
CREATE INDEX idx_integrations_provider ON integrations(provider);
CREATE INDEX idx_integrations_status ON integrations(status);

-- Table pour l'historique des synchronisations
CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  
  -- Détails de la synchro
  sync_type VARCHAR(50) NOT NULL, -- 'manual', 'automatic', 'webhook'
  status VARCHAR(20) NOT NULL, -- 'success', 'partial', 'error'
  
  -- Statistiques
  transactions_synced INTEGER DEFAULT 0,
  products_synced INTEGER DEFAULT 0,
  customers_synced INTEGER DEFAULT 0,
  
  -- Erreurs éventuelles
  error_message TEXT,
  error_details JSONB,
  
  -- Période synchronisée
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Index pour l'historique
CREATE INDEX idx_sync_logs_integration ON integration_sync_logs(integration_id);
CREATE INDEX idx_sync_logs_created ON integration_sync_logs(created_at DESC);

-- Ajouter une colonne pour identifier les transactions externes
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_source VARCHAR(50);

-- Index pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_external 
ON transactions(store_id, external_source, external_id) 
WHERE external_id IS NOT NULL;

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour integrations
DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at 
    BEFORE UPDATE ON integrations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) pour sécuriser l'accès
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;

-- Politique: un utilisateur ne peut voir que les intégrations de ses boutiques
CREATE POLICY integrations_user_access ON integrations
  FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM user_store 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY sync_logs_user_access ON integration_sync_logs
  FOR ALL
  USING (
    integration_id IN (
      SELECT id FROM integrations
      WHERE store_id IN (
        SELECT store_id FROM user_store 
        WHERE user_id = auth.uid()
      )
    )
  );

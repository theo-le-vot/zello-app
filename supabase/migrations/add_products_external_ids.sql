-- Ajouter les colonnes pour les IDs externes sur la table products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS external_parent_id VARCHAR(255);

-- Index pour recherche rapide par external_id
CREATE INDEX IF NOT EXISTS idx_products_external 
ON products(store_id, external_source, external_id);

-- Index unique pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_external_unique 
ON products(store_id, external_source, external_id) 
WHERE external_id IS NOT NULL;

-- Commentaires pour la documentation
COMMENT ON COLUMN products.external_id IS 'ID du produit dans le système externe (Square variation ID, Shopify product ID, etc.)';
COMMENT ON COLUMN products.external_source IS 'Source du produit externe: square, shopify, woocommerce, etc.';
COMMENT ON COLUMN products.external_parent_id IS 'ID parent dans le système externe (pour les variations Square par exemple)';

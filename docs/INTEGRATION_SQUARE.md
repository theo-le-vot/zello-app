# Intégration Square - Guide d'utilisation

## 🎯 Fonctionnalités

L'intégration Square permet de synchroniser automatiquement vos données de caisse vers Zello :
- ✅ **Import du catalogue** - Importation de tous vos produits Square avec lien permanent
- ✅ **Transactions/Ventes** - Import des paiements complétés
- ✅ **Produits** - Création automatique avec external_id pour éviter les doublons
- ✅ **Variations** - Gestion des variations de produits (tailles, couleurs, etc.)
- ✅ **Historique** - Logs de toutes les synchronisations

## 📋 Prérequis

1. Un compte Square actif avec des transactions
2. Accès à votre [Dashboard Square](https://squareup.com/dashboard)
3. Permissions pour créer des applications API

## 🔧 Configuration

### Étape 1 : Obtenir votre Access Token Square

1. Connectez-vous à [Square Dashboard](https://squareup.com/dashboard)
2. Allez dans **Apps & Integrations** → **API** → **My Applications**
3. Créez une nouvelle application ou sélectionnez-en une existante
4. Copiez votre **Access Token** :
   - **Production** : commence par `EAAAl...` (pour vos vraies données)
   - **Sandbox** : commence par `EAAA...` (pour les tests)

⚠️ **Important** : Gardez votre Access Token secret et ne le partagez jamais !

### Étape 2 : Connecter Square à Zello

1. Dans Zello, allez sur **Intégrations**
2. Cliquez sur **Connecter** sur la carte Square
3. Collez votre Access Token
4. Cliquez sur **Tester la connexion**
5. Sélectionnez votre point de vente (Location)
6. Cliquez sur **Enregistrer l'intégration**

### Étape 3 : Importer le catalogue de produits (RECOMMANDÉ)

**⭐ À faire en premier !** Cela crée un lien permanent entre vos produits Square et Zello.

1. Cliquez sur **Importer catalogue**
2. Tous vos produits Square seront importés avec leur ID externe
3. Les variations (tailles, couleurs) deviennent des produits séparés dans Zello
4. Les synchronisations futures utiliseront ces liens permanents

### Étape 4 : Synchroniser les ventes

1. Cliquez sur **Synchroniser** pour importer les transactions
2. Les transactions des 30 derniers jours seront importées
3. Les produits vendus seront automatiquement liés grâce aux external_id

## 🔄 Synchronisation

### Import initial du catalogue
- **Utilisation** : Bouton **Importer catalogue**
- **Action** : Récupère tous les items et variations du catalogue Square
- **Résultat** : Crée/met à jour les produits avec `external_id` et `external_source`
- **Avantages** :
  - ✅ Lien permanent produit Square ↔ produit Zello
  - ✅ Évite les doublons lors des synchronisations
  - ✅ Gestion des variations (tailles, couleurs, etc.)
  - ✅ Mise à jour automatique des prix et noms

### Synchronisation des ventes
- **Utilisation** : Bouton **Synchroniser**
- **Action** : Importe les transactions des 30 derniers jours
- **Intelligent** :
  1. Cherche d'abord le produit par `external_id` (Square variation ID)
  2. Si pas trouvé, cherche par nom (fallback)
  3. Si toujours pas trouvé, crée le produit avec external_id
- **Évite les doublons** : Utilise `external_id` sur les transactions

### Synchronisation automatique (à venir)
- Webhooks Square pour synchronisation en temps réel
- Synchronisation programmée (quotidienne, hebdomadaire)

## 📊 Données importées

### Catalogue de produits
- **Items simples** : Nom, description, prix (si disponible)
- **Items avec variations** :
  - Une entrée par variation (ex: Pizza Margherita - Small, Pizza Margherita - Large)
  - Prix de chaque variation
  - Lien avec l'item parent via `external_parent_id`
- **IDs stockés** :
  - `external_id` : ID de la variation Square (ou de l'item si pas de variations)
  - `external_source` : "square"
  - `external_parent_id` : ID de l'item parent Square

### Transactions
- Date et heure
- Montant total (converti de centimes en euros)
- Statut (seuls les paiements COMPLETED sont importés)
- Méthode de paiement (Carte bancaire)
- ID externe Square pour éviter les doublons
- Produits vendus avec quantités et prix unitaires

### Structure de la base de données

**Table `products`** :
```sql
- external_id: VARCHAR(255)        -- ID Square de la variation
- external_source: VARCHAR(50)     -- "square"
- external_parent_id: VARCHAR(255) -- ID de l'item parent Square
```

**Table `transactions`** :
```sql
- external_id: VARCHAR(255)   -- ID du paiement Square
- external_source: VARCHAR(50) -- "square"
```

## 🐛 Résolution des problèmes

### "Token invalide ou expiré"
- Vérifiez que vous avez copié le token complet
- Utilisez un token Production pour vos vraies données
- Générez un nouveau token si nécessaire

### "Aucun point de vente trouvé"
- Vérifiez que votre compte Square a au moins une location active
- Vérifiez les permissions de votre Access Token

### "Erreur lors de la synchronisation"
- Vérifiez votre connexion internet
- Vérifiez que votre token est toujours valide
- Consultez les logs de synchronisation pour plus de détails

### Doublons de produits
- **Solution** : Utilisez **Importer catalogue** pour créer les liens externes
- Cela évite la création de doublons basés sur le nom
- Les produits existants seront mis à jour, pas dupliqués

## 🔐 Sécurité

- Les Access Tokens sont stockés de manière sécurisée dans Supabase
- Les politiques RLS garantissent que vous ne voyez que vos propres intégrations
- Utilisez toujours HTTPS pour les requêtes API

## 📚 Référence API Square

Documentation officielle :
- [Square API Reference](https://developer.squareup.com/reference/square)
- [Catalog API](https://developer.squareup.com/reference/square/catalog-api) - Pour l'import du catalogue
- [Payments API](https://developer.squareup.com/reference/square/payments-api)
- [Orders API](https://developer.squareup.com/reference/square/orders-api)

## 🚀 Prochaines fonctionnalités

- [ ] Synchronisation bidirectionnelle (Zello → Square)
- [ ] Webhooks pour synchronisation temps réel
- [ ] Import des clients Square
- [ ] Synchronisation de l'inventaire
- [ ] Mapping personnalisé des catégories
- [ ] Export des produits Zello vers Square

## 💡 Conseils et bonnes pratiques

1. **Importez le catalogue AVANT de synchroniser les ventes** : Cela crée les liens permanents
2. **Testez d'abord en Sandbox** : Utilisez l'environnement de test Square avant vos vraies données
3. **Vérifiez les variations** : Square peut avoir plusieurs variations par item
4. **Nettoyez avant l'import** : Si vous avez déjà importé manuellement, l'import du catalogue mettra à jour
5. **Synchronisez régulièrement** : Les ventes ne sont synchronisées que depuis Square, pensez à le faire souvent

## 🎯 Workflow recommandé

1. **Première fois** :
   ```
   Connexion → Test → Enregistrer → Importer Catalogue → Synchroniser Ventes
   ```

2. **Utilisation quotidienne** :
   ```
   Synchroniser Ventes (manuellement ou automatiquement)
   ```

3. **Nouveau produit dans Square** :
   ```
   Importer Catalogue (met à jour + ajoute les nouveaux)
   ```

## 📞 Support

Besoin d'aide ? Contactez le support Zello :
- Email : support@zello.fr
- Documentation : https://docs.zello.fr

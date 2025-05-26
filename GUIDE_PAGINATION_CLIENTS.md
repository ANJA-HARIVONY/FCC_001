# Guide de Pagination et Recherche - Clients CONNEXIA

## 🎯 Nouvelle Fonctionnalité : Pagination et Recherche Avancée pour les Clients

La page de gestion des clients a été améliorée avec les mêmes fonctionnalités que la page des incidents : **pagination**, **recherche avancée** et **filtres**.

## 🔍 Fonctionnalités de Recherche

### Champs de Recherche

La recherche s'effectue sur **6 champs** :

1. **Nom du client** (`nom`)
2. **Téléphone** (`telephone`)
3. **Adresse** (`adresse`)
4. **Ville** (`ville`)
5. **IP Router** (`ip_router`)
6. **IP Antea** (`ip_antea`)

### Exemples de Recherche

#### Recherche par Nom

```
SERVICIOS          → Trouve "SERVICIOS INTEGRALES"
MINISTERIO         → Trouve "MINISTERIO ASUNTOS EXTERIORES"
ELISEO             → Trouve "ELISEO MINANG NGUEMA OBONO"
```

#### Recherche par Téléphone

```
222530784          → Trouve le client avec ce numéro
555-0103           → Trouve le client avec ce format
```

#### Recherche par Adresse

```
Calle              → Trouve les clients avec "Calle" dans l'adresse
Avenida            → Trouve les clients avec "Avenida" dans l'adresse
```

#### Recherche par Ville

```
Valencia           → Trouve les clients de Valencia
Malabo             → Trouve les clients de Malabo
PARAISO            → Trouve les clients de PARAISO
```

#### Recherche par IP

```
192.168            → Trouve les clients avec cette plage IP
10.0.0             → Trouve les clients avec cette plage IP
172.16             → Trouve les clients avec cette plage IP
```

## 🏙️ Filtre par Ville

### Fonctionnalité

- **Filtre dédié** : Menu déroulant avec toutes les villes disponibles
- **Auto-population** : La liste se met à jour automatiquement selon les clients en base
- **Combinable** : Peut être utilisé avec la recherche textuelle

### Utilisation

1. Sélectionnez une ville dans le menu déroulant "Filtrar por ciudad"
2. Cliquez sur "Buscar" ou combinez avec une recherche textuelle
3. Utilisez "Limpiar" pour effacer tous les filtres

## 📄 Pagination

### Paramètres de Pagination

- **Éléments par page** : 5, 10, 25, 50
- **Navigation** : Boutons Précédent/Suivant + numéros de pages
- **Informations** : Affichage du nombre total et de la plage actuelle

### Interface

```
Página X de Y
Mostrando A a B de C clientes
```

## 💡 Interface Utilisateur

### Formulaire de Recherche

```html
┌─────────────────────────────────────────────────────────────┐ │ Buscar:
[Buscar en nombre, teléfono, dirección, IP...] │ │ Filtrar por ciudad: [Todas
las ciudades ▼] │ │ Por página: [10 ▼] │ │ [🔍 Buscar] [❌ Limpiar] │
└─────────────────────────────────────────────────────────────┘
```

### Tableau des Résultats

```
┌─────────────────────────────────────────────────────────────┐
│ Lista de Clientes (X total - Y mostrados)    Página X de Y │
├─────────────────────────────────────────────────────────────┤
│ ID │ Nombre │ Teléfono │ Dirección │ IP Router │ IP Antea │ │
├─────────────────────────────────────────────────────────────┤
│ #1 │ ...    │ ...      │ ...       │ ...       │ ...      │ │
└─────────────────────────────────────────────────────────────┘
```

### Navigation de Pagination

```
[◀ Anterior] [1] [2] [3] [4] [5] [Siguiente ▶]
Mostrando 1 a 10 de 25 clientes
```

## 🧪 Tests Effectués

### Données de Test

- **4 clients** dans la base de données
- **4 villes** différentes : PARAISO, Sevilla, URBANJET, Valencia
- **Recherche fonctionnelle** sur tous les champs

### Résultats des Tests

✅ **Recherche par nom** : SERVICIOS → 1 résultat  
✅ **Recherche par IP** : 192.168 → 2 résultats  
✅ **Filtre par ville** : Malabo → 1 résultat  
✅ **Pagination** : Fonctionne avec 5, 10, 25 éléments par page  
✅ **Route web** : HTTP 200 pour toutes les combinaisons  
✅ **Conservation des filtres** : Les paramètres sont conservés lors de la navigation

## 🔧 Caractéristiques Techniques

### Logique de Recherche

```python
# Recherche avec logique OR sur tous les champs
query = Client.query.filter(
    db.or_(
        Client.nom.contains(search_query),
        Client.telephone.contains(search_query),
        Client.adresse.contains(search_query),
        Client.ville.contains(search_query),
        Client.ip_router.contains(search_query),
        Client.ip_antea.contains(search_query)
    )
)
```

### Filtre par Ville

```python
# Filtre séparé pour la ville
if ville_filter:
    query = query.filter(Client.ville.contains(ville_filter))
```

### Pagination

```python
# Pagination avec tri alphabétique
clients_paginated = query.order_by(Client.nom.asc()).paginate(
    page=page,
    per_page=per_page,
    error_out=False
)
```

## 🚀 Utilisation Pratique

### Cas d'Usage Typiques

1. **Trouver un client par nom partiel :**

   ```
   Tapez une partie du nom
   Ex: "SERVICIOS" pour "SERVICIOS INTEGRALES"
   ```

2. **Rechercher par numéro de téléphone :**

   ```
   Tapez le numéro complet ou partiel
   Ex: "222530784" ou "555"
   ```

3. **Filtrer par ville :**

   ```
   Sélectionnez la ville dans le menu déroulant
   Ex: "Valencia" pour voir tous les clients de Valencia
   ```

4. **Rechercher par configuration réseau :**

   ```
   Tapez une partie de l'IP
   Ex: "192.168" pour voir tous les clients avec cette plage
   ```

5. **Recherche combinée :**
   ```
   Recherche: "SERVICIOS"
   Ville: "Valencia"
   → Trouve les clients SERVICIOS à Valencia
   ```

## 🔄 Combinaison avec Actions

### Actions Disponibles

- **👁️ Voir la fiche** : Accès à la fiche détaillée du client
- **✏️ Modifier** : Édition des informations du client
- **🗑️ Supprimer** : Suppression avec confirmation

### Conservation des Filtres

Les filtres et la pagination sont conservés lors du retour depuis les actions :

- Après modification d'un client
- Après suppression d'un client
- Lors de la navigation entre pages

## 📈 Améliorations Futures

1. **Export des résultats** : Exporter la liste filtrée en CSV/PDF
2. **Recherche avancée** : Interface avec champs séparés
3. **Tri personnalisé** : Tri par colonne (nom, ville, téléphone)
4. **Filtres multiples** : Filtre par nombre d'incidents, par statut
5. **Recherche géographique** : Recherche par région/zone
6. **Historique de recherche** : Sauvegarder les recherches fréquentes

## 🛠️ Pour les Développeurs

### Route Modifiée

```python
@app.route('/clients')
def clients():
    # Pagination et filtres
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search_query = request.args.get('search', '')
    ville_filter = request.args.get('ville', '')

    # Construction de la requête avec filtres
    # Pagination avec SQLAlchemy
    # Retour des données paginées
```

### Template Modifié

- **Formulaire de recherche** avec 3 champs
- **Tableau paginé** avec `clients.items`
- **Navigation de pagination** avec conservation des paramètres
- **JavaScript** pour auto-submit du formulaire

### URL Générées

```
/clients                           # Page par défaut
/clients?search=SERVICIOS          # Recherche
/clients?ville=Valencia            # Filtre ville
/clients?search=192.168&page=2     # Recherche + pagination
/clients?per_page=25               # Nombre d'éléments
```

---

**Version :** 1.0  
**Date :** Décembre 2024  
**Testé avec :** 4 clients, 4 villes  
**Compatible avec :** Page incidents existante

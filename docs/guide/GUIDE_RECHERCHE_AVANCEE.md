# Guide de Recherche Avancée - CONNEXIA

## 🔍 Nouvelle Fonctionnalité : Recherche sur le Nom du Client

La fonctionnalité de recherche a été améliorée pour inclure la recherche sur le **nom du client** en plus de l'intitulé et des observations des incidents.

## 🎯 Champs de Recherche

La recherche s'effectue maintenant sur **3 champs** :

1. **Intitulé de l'incident** (`intitule`)
2. **Observations de l'incident** (`observations`)
3. **Nom du client** (`client.nom`) ⭐ **NOUVEAU**

## 💡 Comment Utiliser

### Interface de Recherche

1. Allez sur la page **Incidencias** : http://localhost:5001/incidents
2. Dans le champ **"Buscar"**, tapez votre terme de recherche
3. Le placeholder indique : _"Buscar en asunto, observaciones o nombre del cliente..."_
4. Cliquez sur **"Buscar"** ou appuyez sur Entrée

### Exemples de Recherche

#### Recherche par Nom de Client

```
SERVICIOS          → Trouve tous les incidents du client "SERVICIOS INTEGRALES"
MINISTERIO         → Trouve tous les incidents du client "MINISTERIO ASUNTOS EXTERIORES"
ELISEO             → Trouve tous les incidents du client "011936 ELISEO MINANG NGUEMA OBONO"
INDUSTRIAS         → Trouve tous les incidents du client "INDUSTRIAS DEL SUR"
```

#### Recherche par Intitulé

```
conexión           → Trouve les incidents avec "conexión" dans le titre
WiFi               → Trouve les incidents WiFi
latencia           → Trouve les incidents de latence
```

#### Recherche par Observations

```
router             → Trouve les incidents mentionnant "router" dans les observations
configuración      → Trouve les incidents de configuration
```

#### Recherche Combinée

La recherche trouve les incidents qui contiennent le terme dans **n'importe lequel** des 3 champs :

```
SERVICIOS          → Trouve :
                     - Incidents du client "SERVICIOS INTEGRALES"
                     - Incidents mentionnant "servicios" dans l'intitulé
                     - Incidents mentionnant "servicios" dans les observations
```

## 🔧 Caractéristiques Techniques

### Insensible à la Casse

```
SERVICIOS = servicios = Servicios = SERVICIOS
```

### Recherche Partielle

```
SERV               → Trouve "SERVICIOS INTEGRALES"
MINIST             → Trouve "MINISTERIO ASUNTOS EXTERIORES"
```

### Logique OR

La recherche utilise une logique **OU** entre les champs :

- Si le terme est trouvé dans l'intitulé **OU**
- Si le terme est trouvé dans les observations **OU**
- Si le terme est trouvé dans le nom du client
- → L'incident est inclus dans les résultats

## 📊 Résultats de Test

**Base de données actuelle :**

- 4 clients avec 51 incidents total
- Recherche "SERVICIOS" : 13 résultats (12 du client + 1 dans intitulé)
- Recherche "conexión" : 9 résultats dans les intitulés

## 🎨 Interface Utilisateur

### Champ de Recherche

- **Label :** "Buscar"
- **Placeholder :** "Buscar en asunto, observaciones o nombre del cliente..."
- **Bouton :** "Buscar" avec icône de loupe
- **Bouton Clear :** "Limpiar" pour effacer les filtres

### Affichage des Résultats

- Nombre total de résultats affiché : `(X total - Y mostrados)`
- Pagination maintenue avec les filtres
- Surlignage possible des termes trouvés (future amélioration)

## 🚀 Utilisation Pratique

### Cas d'Usage Typiques

1. **Trouver tous les incidents d'un client :**

   ```
   Tapez une partie du nom du client
   Ex: "SERVICIOS" pour "SERVICIOS INTEGRALES"
   ```

2. **Recherche par type de problème :**

   ```
   Tapez le type de problème
   Ex: "WiFi", "conexión", "latencia"
   ```

3. **Recherche par équipement :**

   ```
   Tapez l'équipement concerné
   Ex: "router", "antena", "modem"
   ```

4. **Recherche combinée :**
   ```
   Un terme peut matcher plusieurs champs
   Ex: "SERVICIOS" trouve le client ET les mentions dans les incidents
   ```

## 🔄 Combinaison avec Autres Filtres

La recherche peut être combinée avec :

- **Filtre par statut :** Solucionadas, Pendiente, Bitrix
- **Pagination :** 5, 10, 25, 50 éléments par page
- **Tri :** Par date décroissante (plus récents en premier)

### Exemple de Recherche Avancée

```
Recherche: "SERVICIOS"
Statut: "Pendiente"
Par page: 25
→ Affiche tous les incidents en attente du client SERVICIOS INTEGRALES
```

## 🛠️ Pour les Développeurs

### Code SQL Généré

```sql
SELECT incident.*
FROM incident
JOIN client ON client.id = incident.id_client
WHERE (
    incident.intitule LIKE '%terme%' OR
    incident.observations LIKE '%terme%' OR
    client.nom LIKE '%terme%'
)
ORDER BY incident.date_heure DESC
```

### Modification du Code

```python
# Avant
query = query.filter(
    db.or_(
        Incident.intitule.contains(search_query),
        Incident.observations.contains(search_query)
    )
)

# Après
query = query.join(Client).filter(
    db.or_(
        Incident.intitule.contains(search_query),
        Incident.observations.contains(search_query),
        Client.nom.contains(search_query)  # ← NOUVEAU
    )
)
```

## 📈 Améliorations Futures

1. **Recherche sur l'opérateur** : Inclure le nom de l'opérateur
2. **Recherche par date** : Filtrer par période
3. **Recherche avancée** : Interface avec champs séparés
4. **Surlignage** : Mettre en évidence les termes trouvés
5. **Historique** : Sauvegarder les recherches récentes
6. **Export** : Exporter les résultats de recherche

---

**Version :** 1.0  
**Date :** Décembre 2024  
**Testé avec :** 51 incidents, 4 clients

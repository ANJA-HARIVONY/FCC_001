# Rapport - Références Bitrix (Étape 7)

**Date:** 16 février 2026  
**Contexte:** Correction des fonctionnalités - Champ ref_bitrix pour incidents Bitrix

---

## 1. Objectif

Pour les incidents avec le statut **Bitrix**, la référence Bitrix (5 chiffres, ex: 82255) est actuellement stockée dans le champ `observations`. L'objectif est de créer un champ dédié `ref_bitrix` dans la table `incident`, visible uniquement lorsque le statut est Bitrix.

---

## 2. Vérification de la faisabilité

### 2.1 Analyse de la base de données (source: data17012026.sql)

| Catégorie | Nombre | Description |
|-----------|--------|-------------|
| **Total incidents Bitrix** | 1 707 | Incidents avec status = 'Bitrix' |
| **Avec ref exacte (5 chiffres)** | 850 | observations = exactement "58313" (5 chiffres) |
| **Sans référence (vide)** | 82 | observations = '' |
| **Autres** | 775 | observations avec texte (peut contenir une ref) |

### 2.2 Structure actuelle de la table incident

```sql
CREATE TABLE incident (
  id INT PRIMARY KEY,
  id_client INT NOT NULL,
  intitule VARCHAR(200) NOT NULL,
  observations TEXT,           -- Contient actuellement la ref Bitrix
  status VARCHAR(20) NOT NULL,
  id_operateur INT NOT NULL,
  date_heure DATETIME NOT NULL
);
```

### 2.3 Conclusion sur la faisabilité

**La correction est POSSIBLE et RECOMMANDÉE.**

- **850 incidents** (50%) ont une référence Bitrix déjà au format attendu (5 chiffres seuls dans observations)
- **82 incidents** resteront sans ref_bitrix (à compléter manuellement si nécessaire)
- **775 incidents** pourraient contenir une ref dans le texte (extraction par regex possible)

---

## 3. État de la base de données

### 3.1 Répartition des observations pour les incidents Bitrix

| Format observations | Exemple | Quantité estimée |
|---------------------|---------|------------------|
| Exactement 5 chiffres | `'58313'` | 850 |
| Vide | `''` | 82 |
| Texte avec 5 chiffres | `'Ref: 58313 - note'` | Variable |
| Texte sans ref | `'SIN INTERNET'` | Variable |

### 3.2 Exemples réels (extraits du dump SQL)

**Avec ref valide :**
```sql
(1, 1, 'INTERNET LENTO', '58313', 'Bitrix', 2, '2025-05-04 16:09:09'),
(2, 2, 'SIN INTERNET', '58371', 'Bitrix', 2, '2025-05-04 16:10:18'),
```

**Sans ref :**
```sql
(125, 102, 'SIN INTERNET', '', 'Bitrix', 2, '2025-05-07 09:26:56'),
(153, 125, 'SIN INTERNET', '', 'Bitrix', 2, '2025-05-08 10:22:40'),
```

---

## 4. Proposition de correction

### 4.1 Modifications à effectuer

#### A. Migration base de données

1. **Ajouter la colonne `ref_bitrix`** à la table `incident` :
   - Type: `VARCHAR(10)` (suffisant pour 5 chiffres)
   - Nullable: `YES`
   - Index: optionnel pour recherche

```sql
ALTER TABLE incident ADD COLUMN ref_bitrix VARCHAR(10) NULL;
```

#### B. Migration des données existantes

2. **Extraire les refs** des incidents Bitrix où `observations` contient exactement 5 chiffres :

```sql
UPDATE incident 
SET ref_bitrix = observations 
WHERE status = 'Bitrix' 
  AND observations REGEXP '^[0-9]{5}$'
  AND LENGTH(TRIM(observations)) = 5;
```

3. **Pour les observations avec texte** contenant une séquence de 5 chiffres, extraction possible :

```sql
-- Exemple pour MariaDB (regex pour extraire 1ère séquence de 5 chiffres)
-- À adapter selon le moteur SQL
```

#### C. Modèle Python (core/app.py)

4. **Ajouter le champ au modèle Incident** :

```python
ref_bitrix = db.Column(db.String(10), nullable=True)  # Visible si status=Bitrix
```

#### D. Interface utilisateur

5. **Formulaire création/modification incident** :
   - Afficher le champ `ref_bitrix` uniquement quand `status == 'Bitrix'`
   - Validation : 5 chiffres exactement si renseigné
   - Lors du passage en Bitrix : proposer d'extraire la ref des observations si détectée

6. **Fiche incident / Liste** :
   - Afficher la ref Bitrix à côté du badge Bitrix quand présente

#### E. Nettoyage optionnel

7. **Retirer la ref des observations** après migration (optionnel) :
   - Si observations = "58313" uniquement → vider observations
   - Si observations = "58313 - note" → garder "note" dans observations

### 4.2 Ordre d'exécution recommandé

1. Créer la migration Flask-Migrate pour ajouter `ref_bitrix`
2. Exécuter la migration
3. Lancer le script de migration des données (`tools/migrate_bitrix_ref.py`)
4. Mettre à jour le modèle et les formulaires
5. Tester en environnement de développement
6. Déployer

### 4.3 Script d'analyse fourni

Le script `tools/analyze_bitrix_ref.py` permet de :
- Analyser l'état actuel des incidents Bitrix
- Compter les refs extractibles
- Générer un rapport JSON dans `monitoring/logs/`

**Exécution :**
```bash
python tools/analyze_bitrix_ref.py
```

---

## 5. Risques et précautions

| Risque | Mitigation |
|--------|------------|
| Perte de données | Sauvegarder la base avant migration |
| Références ambiguës | Si plusieurs séquences de 5 chiffres, prendre la première ou signaler |
| Rétrocompatibilité | Garder le champ observations tel quel (ne pas supprimer) |

---

## 6. Résumé

| Élément | Statut |
|---------|--------|
| **Faisabilité** | OUI |
| **Incidents concernés** | 1 707 Bitrix |
| **Refs extractibles** | ~850 (format exact) + potentiel dans 775 autres |
| **Action recommandée** | Implémenter ref_bitrix + migration des données |

---

## 7. Implémentation réalisée

Les modifications suivantes ont été appliquées :

- **Modèle** : Champ `ref_bitrix` ajouté au modèle `Incident` (core/app.py)
- **Migration** : Fichier `20260216_100000_ajout_ref_bitrix_incident.py`
- **Formulaires** : Champ ref_bitrix conditionnel (visible si status=Bitrix) dans nouveau_incident.html et modifier_incident.html
- **Affichage** : Ref Bitrix affichée dans fiche_incident.html et incidents.html

**Pour appliquer la migration :**
```bash
flask db upgrade
python tools/migrate_bitrix_ref.py
```

---

*Rapport généré dans le cadre de l'étape 7 - Correction des fonctionnalités (PROMPT.MD)*

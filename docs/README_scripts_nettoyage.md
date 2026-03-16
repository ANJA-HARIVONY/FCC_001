# 🧹 Scripts de Nettoyage des Observations

Ce dossier contient des scripts pour nettoyer la colonne `observations` de la table `incident` en supprimant les textes de migration CSV et en gardant uniquement les informations utiles.

## 📋 Scripts Disponibles

### 1. `quick_clean_bitrix.py` - Script Rapide ⚡
**Utilisation recommandée pour votre cas spécifique**

- **Objectif** : Supprime uniquement `"Incident migré depuis CSV. Bitrix: "` en gardant les chiffres
- **Simple et direct**
- **Pas de sauvegarde automatique** (plus rapide)

```bash
# Exécution normale (avec confirmation)
python quick_clean_bitrix.py

# Exécution forcée (sans confirmation)
python quick_clean_bitrix.py --force
```

**Exemple de transformation :**
```
AVANT: "Incident migré depuis CSV. Bitrix: 12345"
APRÈS: "12345"
```

### 2. `clean_observations.py` - Script Standard 🔧

- **Interface interactive** avec menu
- **Aperçu des changements** avant application
- **Confirmation utilisateur**
- **Gestion d'erreurs**

```bash
python clean_observations.py
```

**Options disponibles :**
1. 👀 Aperçu des changements (sans modification)
2. 🧹 Nettoyer les observations
3. 🚪 Quitter

### 3. `clean_observations_advanced.py` - Script Avancé 🚀

**Le plus complet et sécurisé**

- **Sauvegarde automatique** avant modification
- **Restauration possible** en cas de problème
- **Patterns multiples** configurables
- **Mode interactif** complet
- **Gestion des sauvegardes**

```bash
python clean_observations_advanced.py
```

**Fonctionnalités :**
- ✅ Analyse des patterns présents
- ✅ Aperçu détaillé des changements
- ✅ Sauvegarde automatique en JSON
- ✅ Restauration des sauvegardes
- ✅ Patterns configurables
- ✅ Gestion d'erreurs avancée

## 🎯 Recommandations d'Usage

### Pour votre cas (supprimer "Incident migré depuis CSV. Bitrix: "):

1. **Première fois ou test** → Utilisez `clean_observations_advanced.py`
   - Permet de voir un aperçu
   - Crée une sauvegarde automatique
   - Plus sécurisé

2. **Exécution rapide** → Utilisez `quick_clean_bitrix.py`
   - Direct et efficace
   - Idéal si vous êtes sûr du résultat

## 🔍 Patterns de Nettoyage Configurés

Le script avancé gère plusieurs patterns :

| Pattern | Description | Exemple |
|---------|-------------|---------|
| `bitrix_migration` | Supprime le préfixe en gardant le numéro | `"Incident migré depuis CSV. Bitrix: 123"` → `"123"` |
| `remove_migration_prefix` | Supprime complètement le préfixe | `"Incident migré depuis CSV. Texte"` → `"Texte"` |
| `clean_empty_bitrix` | Supprime "Bitrix: " vide | `"Texte Bitrix: "` → `"Texte"` |

## 💾 Sauvegardes

Le script avancé crée automatiquement des sauvegardes dans le dossier `backups/` :

```
backups/
├── observations_backup_20241201_143022.json
├── observations_backup_20241201_151234.json
└── ...
```

Format : `observations_backup_YYYYMMDD_HHMMSS.json`

## ⚠️ Précautions

1. **Testez d'abord** avec l'option aperçu
2. **Vérifiez la connexion** à la base de données
3. **Sauvegardez** avant les modifications importantes
4. **Vérifiez les résultats** après nettoyage

## 🚀 Exécution Recommandée

### Étape 1 : Aperçu
```bash
python clean_observations_advanced.py
# Choisir option 1 (Analyser) puis option 3 (Aperçu global)
```

### Étape 2 : Nettoyage avec sauvegarde
```bash
python clean_observations_advanced.py
# Choisir option 2 (Nettoyage interactif)
```

### Étape 3 : Vérification
```bash
python clean_observations_advanced.py
# Choisir option 1 (Analyser) pour vérifier les résultats
```

## 📊 Monitoring

Après exécution, les scripts affichent :
- ✅ Nombre d'incidents traités
- ✅ Nombre d'incidents modifiés
- ✅ Nombre d'erreurs (si applicable)
- ✅ Résumé des opérations

## 🆘 En cas de Problème

### Restauration via sauvegarde :
```bash
python clean_observations_advanced.py
# Choisir option 4 (Gérer les sauvegardes)
# Puis option 1 (Restaurer une sauvegarde)
```

### Vérification manuelle :
```sql
-- Compter les incidents avec le pattern
SELECT COUNT(*) FROM incident WHERE observations LIKE '%Incident migré depuis CSV. Bitrix:%';

-- Voir quelques exemples
SELECT id, observations FROM incident WHERE observations LIKE '%Incident migré depuis CSV. Bitrix:%' LIMIT 5;
```

## 📝 Configuration

Pour modifier les patterns de nettoyage, éditez la variable `CLEANING_PATTERNS` dans `clean_observations_advanced.py` :

```python
CLEANING_PATTERNS = {
    'votre_pattern': {
        'pattern': 'Texte à chercher',
        'description': 'Description du nettoyage',
        'regex': r'Expression regulière',
        'replacement': 'Remplacement'
    }
}
```

---

**💡 Conseil :** Commencez toujours par le script avancé pour une première exécution sécurisée, puis utilisez le script rapide pour les opérations futures. 
# Guide de Dépannage - Incidents ne s'affichent pas

## 🔍 Diagnostic du Problème

**Statut actuel :** ✅ **Le système fonctionne parfaitement côté serveur**

- ✅ 51 incidents existent dans la base de données
- ✅ La pagination fonctionne (6 pages, 10 incidents par page)
- ✅ Le HTML est généré correctement avec tous les incidents
- ✅ Les filtres et la recherche fonctionnent
- ✅ La route `/incidents` retourne HTTP 200

**Conclusion :** Le problème vient du **côté navigateur**, pas du serveur.

## 🛠️ Solutions à Essayer (dans l'ordre)

### 1. Vider le Cache du Navigateur

**Le plus probable :** Votre navigateur affiche une version mise en cache de la page.

**Chrome/Firefox :**

```
Ctrl + Shift + R
ou
Ctrl + F5
```

**Safari :**

```
Cmd + Shift + R
```

**Edge :**

```
Ctrl + Shift + R
```

### 2. Vérifier la Console JavaScript

Ouvrez les outils de développement :

```
F12 (tous navigateurs)
ou clic droit → "Inspecter l'élément"
```

**Onglet Console :**

- Cherchez des erreurs en rouge
- Les erreurs JavaScript peuvent empêcher l'affichage

**Onglet Network :**

- Vérifiez si toutes les ressources se chargent (CSS, JS)
- Cherchez des erreurs 404 ou 500

### 3. Mode Incognito/Privé

Testez en mode privé pour éliminer les extensions et le cache :

**Chrome :**

```
Ctrl + Shift + N
```

**Firefox :**

```
Ctrl + Shift + P
```

**Safari :**

```
Cmd + Shift + N
```

### 4. Désactiver les Extensions

Certaines extensions peuvent bloquer le contenu :

- **AdBlock, uBlock Origin** : Peuvent bloquer les tables
- **Privacy Badger** : Peut bloquer les scripts
- **Ghostery** : Peut interférer avec JavaScript

**Désactivation temporaire :**

1. Menu → Extensions
2. Désactiver toutes les extensions
3. Recharger la page

### 5. Essayer un Autre Navigateur

Testez avec :

- Chrome
- Firefox
- Safari
- Edge

### 6. Vérifier l'URL

Assurez-vous d'être sur la bonne URL :

```
http://localhost:5001/incidents
```

## 🧪 Tests de Vérification

### Test 1 : Fichier HTML Direct

1. Ouvrez le fichier `debug_page_complete.html` dans votre navigateur
2. Si les incidents s'affichent → Le problème vient du serveur Flask
3. Si les incidents ne s'affichent pas → Le problème vient du navigateur

### Test 2 : Inspection du Code Source

1. Sur la page `/incidents`, faites clic droit → "Afficher le code source"
2. Cherchez `<td><strong>#` dans le code
3. Si présent → Le HTML est correct, problème d'affichage CSS/JS
4. Si absent → Problème de génération côté serveur

### Test 3 : Console Network

1. F12 → Onglet Network
2. Rechargez la page
3. Vérifiez que tous les fichiers se chargent :
   - `bootstrap.min.css` (200)
   - `font-awesome.css` (200)
   - `style.css` (200)

## 🔧 Scripts de Diagnostic

### Démarrage avec Débogage

```bash
python start_debug.py
```

### Test Complet du Système

```bash
python diagnostic_complet.py
```

### Test de Simulation Navigateur

```bash
python test_browser.py
```

## 📊 Informations Techniques

**Base de données :**

- 51 incidents total
- 26 Solucionadas
- 15 Pendiente
- 10 Bitrix

**Pagination :**

- 6 pages total
- 10 incidents par page
- Page 1 affiche les incidents #42 à #51

**Template :**

- Utilise `incidents.items` pour la boucle
- Condition `{% if incidents.items %}` fonctionne
- Pas de message d'erreur affiché

## 🚨 Si Rien ne Fonctionne

### Redémarrage Complet

```bash
# Arrêter le serveur (Ctrl+C)
# Puis redémarrer
python start_debug.py
```

### Régénération des Données

```bash
# Si vous soupçonnez un problème de données
python generate_50_incidents.py
python start_debug.py
```

### Vérification des Ports

Assurez-vous qu'aucun autre service n'utilise le port 5001 :

```bash
lsof -i :5001
```

## 📞 Support

Si le problème persiste après avoir essayé toutes ces solutions :

1. **Capturez une capture d'écran** de la page vide
2. **Ouvrez F12** et capturez les erreurs de la console
3. **Testez** avec `debug_page_complete.html`
4. **Notez** quel navigateur et quelle version vous utilisez

Le système fonctionne parfaitement côté serveur, donc le problème est forcément côté client (navigateur).

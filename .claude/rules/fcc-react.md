---
paths:
  - "apps/web/**/*.tsx"
  - "apps/web/**/*.ts"
---

# FCC_001 — React (instalaciones)

Écrans dans `apps/web`. Libellés **espagnol**, mêmes champs que le template Flask du domaine. Pas de `useMemo` / `useCallback` sans coût mesuré.

## Nueva instalación

Fichier : `apps/web/src/pages/instalaciones/InstalacionFormPage.tsx`.
Routes : `/instalaciones/nueva`, `/instalaciones/:id/editar`.

- Carte `col-lg-8` + `card shadow-sm border-0 content-card` + `card-header` (`fa-building`).
- Fil d’Ariane : `Instalaciones` → titre. `Volver` du titre et `Cancelar` du bas : hub en création, fiche en édition. `Guardar` avec `fa-save`, désactivé pendant l’envoi.
- Date du jour : `YYYY-MM-DD` du fuseau local. Pas `toISOString()` (UTC).
- Técnico : `SearchAutocomplete` (nom, téléphone, agencia, ciudad). Pas un `<select>` de toute la liste. Pas de préselection du premier técnico. Minimum 2 caractères, 10 résultats.
- Cliente : même recherche (nom, téléphone, ville, adresse). Édition : lien fiche + «(no modificable)». Création : le changement d’adresse passe par Traslado sur la fiche client.
- Édition : badges Tipo et Estado. Pas de lignes de matériel (ajout = salida `instalacion` depuis la fiche).
- Création : «Material entregado» facultatif. Une ligne vide au départ, select **sans** `required`. Lignes sans matériel ignorées. Au moins une ligne reste à l’écran. Clé stable `linea.key`, pas l’index du tableau.
- `?client=` préremplit le client s’il est dans les options.
- Erreurs API et «Seleccione un técnico / un cliente» dans `alert alert-danger`.

Options : `GET /api/instalaciones/options`. Técnico : `id`, `nom`, `telephone`, `agencia`, `ciudad`. Client : `id`, `nom`, `telephone`, `ville`, `adresse`, `categoria`.

## Fiche `/instalaciones/:id`

Fichier : `InstalacionDetailPage.tsx`. Même disposition que `instalaciones/detalle.html`.

- Fil d’Ariane : `Instalaciones` → `#id`. Sous-titre = nom du client.
- Actions : `Volver`, `Copiar información` (`instalacionCopyText`), `Modificar`, `Terminar` (confirmación) ou `Reabrir`, `Eliminar` seulement si `tipo=nueva`.
- Suppression : modale (salidas liées, irréversible). Pas de `window.confirm` pour Eliminar.
- Colonne gauche : Tipo, Estado, Fecha `jj/mm/aaaa`, Técnico, Cliente (lien fiche), Dirección (+ badge «Dirección anterior» si le sitio n’est plus actif, lien Google Maps si GPS), origen si `traslado`, observaciones, Registrada / Última modificación / Terminada el.
- Colonne droite : table Material entregado (`#`, Fecha, Técnico, Materiales, Ver) ou état vide `fa-box-open`. `Añadir material` → salida `instalacion` liée. Traslado : seconde table Reutilizado / Retirado.
- Dates du jour : `formatFecha` sur `YYYY-MM-DD`, sans `Date` (pas de décalage UTC). Heures : `formatFechaHora`.

## Pratiques

- État du formulaire typé. `setForm((prev) => …)`.
- Chargement : drapeau `cancelled` au démontage. Ne monter l’autocomplétion qu’après le chargement (`initialQuery` n’est lu qu’au premier rendu).
- Autocomplétion partagée : `apps/web/src/components/SearchAutocomplete.tsx`. Ne pas la recopier dans la page.
- Obligatoire : `<span className="text-danger">*</span>`. Icônes `aria-hidden`. Bouton clear : `aria-label="Quitar"`.

```tsx
// ❌ BAD
fecha: new Date().toISOString().slice(0, 10)
<select>{tecnicos.map(...)}</select>
key={index}
setForm({ ...form, fecha: event.target.value })

// ✅ GOOD
fecha: todayIso()
<SearchAutocomplete inputId="tecnico_search" ... />
key={linea.key}
setForm((prev) => ({ ...prev, fecha: event.target.value }))
```

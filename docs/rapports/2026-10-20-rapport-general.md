# Rapport général — réécriture React / Node (phases 0 à 8)

Date : 20 octobre 2026. Branche : `feat/reecriture-react-node`.

État dépassé le 21 octobre 2026. Le bilan courant est `docs/rapports/2026-10-21-rapport-general.md`. Les exports, fichiers, RADIUS, Bitrix, SQL et le calcul de ficha cités plus bas comme ouverts sont depuis dans le code.

Ce rapport confronte le plan `docs/plan-reecriture-react-node.md` au code livré et aux tests lancés ce jour. La phase 9 (parité sur copie MariaDB et bascule) n’est pas commencée.

## Tests exécutés

Commande : `npm test` à la racine (build domaine, tests domaine, Prisma generate, tests API, tests web).

| Suite | Résultat |
|---|---|
| `@fcc/domain` | 13 tests, 0 échec |
| `@fcc/api` | 30 tests, 0 échec |
| `@fcc/web` | 13 tests, 0 échec |
| `npm run typecheck` | domaine, API et web : OK |

Les tests web affichent des avertissements React `act(...)` sur le Dashboard et l’en-tête (chargement asynchrone). Ils ne font pas échouer la suite.

Limite : ces tests vérifient des règles métier et le shell, pas une base MariaDB réelle ni un parcours navigateur bout en bout. C’est le travail de la phase 9.

## Lecture par phase

| Phase | Verdict | Ce qui tient | Écart restant |
|---|---|---|---|
| 0 — Gel | tenue | `docs/parite.md` : droits, littéraux, hash | — |
| 1 — Socle | tenue avec réserve | Nest, Prisma sans migration, cookie, CSRF, Werkzeug puis Argon2id, compte inactif refusé, idle 30 min | Session en mémoire du processus, pas Redis ni table `session`. Docker de comparaison non rejoué ici. |
| 2 — Coquille | tenue | Sidebar selon le rôle, pas de menu Operadores, 403, aide à deux sommaires, pagination, client HTTP CSRF | Avertissements `act` dans les tests du shell. |
| 3 — Référentiels | tenue sur le critère | Clients partagés, geo (admin = son agencia), sitio actif unique à la correction d’adresse | Excel de page, RADIUS live, fotos (max 10) |
| 4 — Incidencias | tenue sur le critère 10.4 | Liste, fiche, commentaire, historique de statut, `ref_bitrix` 10 chiffres, notifications à la création du commentaire | Lecture Bitrix live, Excel de page |
| 5 — Materiales | tenue sur le critère | Catálogo partagé, salidas scopées, modale sans `instalacion`, édition → `modificada` | Excel, informe de materiales, fotos, ficha técnico |
| 6 — Instalaciones | tenue sur le critère | Hub, nueva + salida liée, terminar / reabrir, traslado refusé à la suppression, GPS admin, installations du jour | Fotos sitio, action Copiar |
| 7 — Informes | tenue sur le critère | Visibilité `"agence_id": N`, 20 récents, 4 types, texte local espagnol sans clé | Excel d’un informe `generated`. Gemini : branche minimale, pas les prompts Flask complets. |
| 8 — Compte et dashboard | tenue partielle | Perfil (nom, téléphone, mot de passe), usuarios, audit texte, vérification BDD, KPI, apreciación 120 car., recherche, cloche, ficha paginée ≤ 200 | Avatar, export SQL, Excel de la ficha. Le retard de la ficha est le délai depuis la création, pas le calcul Flask Bitrix → Solucionadas. |
| 9 — Parité et bascule | non commencée | — | Jeu de données, comparaison Flask, reprise des tests Python, parcours navigateur, bascule |

## Critères du plan

- Phase 3 : deux agencias voient le même client ; modifier l’adresse ne crée pas un second sitio actif. Couvert par les tests sitio et la règle domaine.
- Phase 4 : un admin de l’agencia A ne voit pas l’incidencia de l’agencia B. Couvert.
- Phase 5 : la modale n’offre pas `instalacion` ; un admin ne voit pas une autre ville. Couvert.
- Phase 6 : deux lignes → instalación + salida `instalacion` ; un traslado ne se supprime pas. Couvert par le contrat de test (pas un insert MariaDB).
- Phase 7 : sans clé, le texte local est en espagnol. Couvert.
- Phase 8 : la sidebar des trois rôles correspond au menu Flask, Operadores est absent. Couvert par le test de navigation web.
- Phase 9 : un opérateur ne peut pas encore faire sa journée uniquement sur React de façon certifiée face au Flask.

## Écrans présents

Dashboard, Incidencias, Clientes (y compris traslado admin), Informes, Materiales, Instalaciones, Usuarios, Trazabilidad, Base de datos, Perfil, Ayuda, recherche `/buscar`, ficha `/atencion-cliente/:id/ficha`.

## Conclusion

Les phases 0 à 8 sont livrées pour le métier quotidien (listes, droits, CRUD, informes locaux, compte, dashboard). La réécriture n’est pas prête pour la bascule : exports Excel, fichiers (fotos, avatar), RADIUS, Bitrix live, export SQL, calcul exact de la ficha, et la comparaison sur une copie MariaDB restent ouverts. Prochaine étape : phase 9.

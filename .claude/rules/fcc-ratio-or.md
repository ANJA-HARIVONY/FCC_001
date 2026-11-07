---
paths:
  - "presentation/**"
---

# FCC_001 — ratio des composants (nombre d'or)

φ = **1.618**. Quand un composant fixe deux longueurs comparables (largeur et hauteur, ou padding inline et padding block), le plus grand côté divisé par le plus petit vaut 1.618, tolérance ±2 % (1,586–1,650).

Calcul : choisir le petit côté, grand côté = petit × 1.618, arrondir au pixel ou à 0,05rem. Repères Fibonacci acceptés : 8/13, 13/21, 21/34, 34/55, 89/144.

Ne s'applique pas à :

- carré ou cercle volontaire (avatar, bouton icône, pastille, miniature photo) — ratio 1
- largeur fluide (`100%`, flex, viewport) ou hauteur `auto`
- filet de 1px
- média au ratio du fichier (drapeau, logo)
- colonnes et grilles déjà fixées dans `fcc-ui` (`col-lg-8`, `row-cols-*`, largeurs de colonnes de liste)

Ne pas rouvrir une paire déjà en place sans demande. Toute paire nouvelle ou modifiée se mesure avant d'être figée.

```css
/* ❌ BAD — 420 / 360 = 1.167 */
.notification-menu { width: 360px; max-height: 420px; }

/* ✅ GOOD — 421 / 260 = 1.619 */
.panel { width: 421px; height: 260px; }
```

```css
/* ❌ BAD — 1.15 / 1.05 = 1.095 */
.stat-card .card-body { padding: 1.05rem 1.15rem; }

/* ✅ GOOD — 1.05 × 1.618 ≈ 1.70 */
.stat-card .card-body { padding: 1.05rem 1.70rem; }
```

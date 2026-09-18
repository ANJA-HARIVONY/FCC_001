---
name: i18n-fcc
description: >-
  Extrait et met à jour les catalogues Babel FCC_001 (es, fr, en) après
  ajout ou modification de chaînes gettext / {{ _('…') }}. Utiliser quand
  l'utilisateur ajoute un flash, un label UI, une erreur API, un prompt
  utilisateur, ou demande i18n, traduction, pybabel, messages.po, .pot, .mo.
---

# i18n — FCC_001

Ne pas réécrire les anciens `msgid` français du `.po`. Les **nouvelles** chaînes utilisateur sont en **espagnol** (`gettext('…')` / `{{ _('…') }}`).

Catalogues : `i18n/translations/{es,fr,en}/LC_MESSAGES/messages.{po,mo}`  
Config extract : `i18n/babel.cfg` (Python + Jinja2). Locale défaut : `es`.

## Checklist

```
- [ ] Chaînes enveloppées (gettext / _ )
- [ ] msgid espagnol pour le nouveau texte
- [ ] extract → update → traduire es/fr/en → compile
- [ ] Pas de secret dans une chaîne
```

## Commandes (racine du dépôt, venv)

```bash
.venv/bin/pybabel extract -F i18n/babel.cfg -k gettext -k ngettext -k lazy_gettext -k _ -o i18n/messages.pot .
.venv/bin/pybabel update -i i18n/messages.pot -d i18n/translations
.venv/bin/pybabel compile -d i18n/translations
```

Si `pybabel` manque : `python -m babel.messages.frontend` (mêmes sous-commandes).

## Traduction

1. Ouvrir les 3 `messages.po`.
2. Remplir les `msgstr` **vides** uniquement.
   - `es` : souvent identique au msgid (déjà ES)
   - `fr` / `en` : traduire
3. Ne pas toucher aux `msgstr` déjà renseignés sauf correction demandée.
4. Compiler, puis vérifier qu’un `.mo` a été régénéré par locale.

## Pièges

- Flash / JSON `error` : même chaîne gettext, **espagnol**.
- Labels métier (`Pendiente`, `Solucionadas`, `Incidencias`) : ne pas les franciser dans `msgstr`.
- Après i18n, ne pas committer sans demande.

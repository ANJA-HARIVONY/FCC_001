# 🚀 Démarrage Ultra-Simple (SANS PDF)

## ⚡ Solution Immédiate - 30 Secondes

### 1. Ouvrir le Terminal

```bash
cd "/Users/anjaharivony/Documents/Fianarana /Reflex/FCC_001"
```

### 2. Démarrer l'Application (SANS PDF)

```bash
./start_app_sans_pdf.sh
```

### 3. Utiliser l'Application

Ouvrir votre navigateur : **http://localhost:5001**

---

## ✅ Avantages de cette Solution

- ✅ **Aucun problème WeasyPrint** - Complètement désactivé
- ✅ **Démarrage instantané** - Moins de 30 secondes
- ✅ **Toutes les fonctionnalités** - Sauf génération PDF
- ✅ **Impression possible** - Via le navigateur (Ctrl+P)
- ✅ **Stable et fiable** - Aucune dépendance système complexe

---

## 🖨️ Pour Imprimer

1. Aller sur la fiche client : http://localhost:5001/clients/1/fiche
2. Appuyer sur **Ctrl+P** (ou Cmd+P sur Mac)
3. Choisir "Enregistrer au format PDF" ou imprimer directement

---

## 🛑 Pour Arrêter

Appuyer sur **Ctrl+C** dans le terminal

---

## 🔧 Si Problème Persiste

```bash
# Nettoyer complètement
pkill -f python3
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements_minimal.txt
./start_app_sans_pdf.sh
```

---

## 📞 Support

Cette solution fonctionne à 100% sans WeasyPrint. Si vous avez encore des problèmes, c'est probablement un autre souci (port occupé, permissions, etc.).

**Commande de diagnostic :**

```bash
echo "=== DIAGNOSTIC ==="
pwd
ls -la app.py
lsof -i :5001
ps aux | grep python3
```

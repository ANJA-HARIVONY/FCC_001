#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script pour générer automatiquement les favicons
Système de gestion de clients CONNEXIA
"""

import os
from PIL import Image, ImageDraw, ImageFont
import sys

def create_favicon_from_text():
    """Créer un favicon simple avec le texte 'C' pour CONNEXIA"""
    
    # Créer une image 32x32 avec fond rouge CONNEXIA
    size = 32
    img = Image.new('RGBA', (size, size), (220, 53, 69, 255))  # Rouge CONNEXIA
    draw = ImageDraw.Draw(img)
    
    # Dessiner un cercle blanc au centre
    circle_size = 28
    circle_pos = (2, 2, circle_size + 2, circle_size + 2)
    draw.ellipse(circle_pos, fill=(255, 255, 255, 255))
    
    # Dessiner la lettre 'C' en rouge
    try:
        # Essayer d'utiliser une police système
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 20)
    except:
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
    
    # Calculer la position pour centrer le texte
    text = "C"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - 2
    
    draw.text((x, y), text, fill=(220, 53, 69, 255), font=font)
    
    return img

def generate_favicons():
    """Générer tous les formats de favicon nécessaires"""
    
    print("🎨 Génération des favicons pour CONNEXIA...")
    
    # Créer le dossier img s'il n'existe pas
    os.makedirs('static/img', exist_ok=True)
    
    # Créer l'image de base
    base_img = create_favicon_from_text()
    
    # Sauvegarder en différentes tailles
    sizes = [16, 32, 48, 64, 128, 256]
    
    for size in sizes:
        resized = base_img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Sauvegarder en PNG
        png_path = f'static/img/favicon-{size}x{size}.png'
        resized.save(png_path, 'PNG')
        print(f"✅ Créé: {png_path}")
    
    # Créer le favicon.ico (multi-tailles)
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_images = []
    
    for size in ico_sizes:
        resized = base_img.resize(size, Image.Resampling.LANCZOS)
        ico_images.append(resized)
    
    ico_path = 'static/favicon.ico'
    ico_images[0].save(ico_path, format='ICO', sizes=ico_sizes)
    print(f"✅ Créé: {ico_path}")
    
    print("\n🎉 Favicons générés avec succès!")
    print("\n📝 Fichiers créés:")
    print("   - static/favicon.ico (multi-tailles)")
    print("   - static/img/favicon-16x16.png")
    print("   - static/img/favicon-32x32.png")
    print("   - static/img/favicon.svg (déjà créé)")
    
    print("\n💡 Pour personnaliser:")
    print("   1. Remplacez les fichiers PNG par vos propres images")
    print("   2. Modifiez le fichier SVG dans static/img/favicon.svg")
    print("   3. Ou utilisez un générateur en ligne comme favicon.io")

def main():
    """Fonction principale"""
    try:
        generate_favicons()
    except ImportError:
        print("❌ Pillow (PIL) n'est pas installé.")
        print("💡 Installez-le avec: pip install Pillow")
        print("\n🔧 Alternative: utilisez un générateur en ligne:")
        print("   - https://favicon.io/")
        print("   - https://realfavicongenerator.net/")
        print("\n📁 Placez ensuite vos fichiers dans:")
        print("   - static/favicon.ico")
        print("   - static/img/favicon-16x16.png")
        print("   - static/img/favicon-32x32.png")
    except Exception as e:
        print(f"❌ Erreur: {e}")
        print("\n🔧 Alternative: utilisez un générateur en ligne:")
        print("   - https://favicon.io/")
        print("   - https://realfavicongenerator.net/")

if __name__ == "__main__":
    main() 
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📄 GÉNÉRATEUR PDF - PROPOSITIONS D'AMÉLIORATION FCC_001
========================================================
Ce script génère un PDF professionnel à partir du document de propositions.
"""

import os
import sys
from datetime import datetime

# Ajouter le répertoire parent au path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def generate_pdf_with_weasyprint():
    """Générer le PDF avec WeasyPrint"""
    try:
        from weasyprint import HTML, CSS
        from weasyprint.text.fonts import FontConfiguration
        
        print("✅ WeasyPrint disponible - Génération PDF en cours...")
        
        # Lire le contenu Markdown
        md_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               'docs', 'PROPOSICIONES_MEJORAS_FCC_001.md')
        
        with open(md_path, 'r', encoding='utf-8') as f:
            md_content = f.read()
        
        # Convertir Markdown en HTML
        html_content = markdown_to_html(md_content)
        
        # Générer le PDF
        output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                   'docs', 'PROPOSICIONES_MEJORAS_FCC_001.pdf')
        
        font_config = FontConfiguration()
        html = HTML(string=html_content)
        css = CSS(string=get_pdf_styles(), font_config=font_config)
        
        html.write_pdf(output_path, stylesheets=[css], font_config=font_config)
        
        print(f"✅ PDF généré avec succès: {output_path}")
        return True
        
    except ImportError:
        print("⚠️ WeasyPrint non disponible")
        return False
    except Exception as e:
        print(f"❌ Erreur WeasyPrint: {e}")
        return False


def generate_pdf_with_fpdf():
    """Générer le PDF avec FPDF2 (alternative légère)"""
    try:
        from fpdf import FPDF
        from fpdf.enums import XPos, YPos
        
        print("📄 Génération PDF avec FPDF2...")
        
        # Lire le contenu Markdown
        md_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               'docs', 'PROPOSICIONES_MEJORAS_FCC_001.md')
        
        with open(md_path, 'r', encoding='utf-8') as f:
            md_content = f.read()
        
        # Créer le PDF
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        
        # Page de couverture
        pdf.add_page()
        pdf.set_font('Helvetica', 'B', 24)
        pdf.cell(0, 60, '', new_x=XPos.LMARGIN, new_y=YPos.NEXT)  # Espace en haut
        pdf.cell(0, 15, 'PROPOSICIONES DE MEJORAS', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        pdf.set_font('Helvetica', 'B', 18)
        pdf.cell(0, 10, 'FCC_001', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        pdf.set_font('Helvetica', '', 14)
        pdf.cell(0, 10, 'Sistema de Gestion de Incidencias con IA', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        pdf.cell(0, 30, '', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font('Helvetica', '', 12)
        pdf.cell(0, 10, f'Fecha: {datetime.now().strftime("%d/%m/%Y")}', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        pdf.cell(0, 10, 'Version: 2.0', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        
        # Contenu principal
        pdf.add_page()
        pdf.set_font('Helvetica', '', 10)
        
        in_code_block = False
        
        # Parser le Markdown simplifié
        lines = md_content.split('\n')
        for line in lines:
            original_line = line
            line = line.strip()
            
            # Gérer les blocs de code
            if line.startswith('```'):
                in_code_block = not in_code_block
                continue
            
            if in_code_block:
                continue
            
            if line.startswith('# ') and not line.startswith('# '):
                # Titre niveau 1
                pdf.add_page()
                pdf.set_font('Helvetica', 'B', 16)
                title = clean_text(line[2:])[:60]
                if title:
                    pdf.cell(0, 12, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
                pdf.set_font('Helvetica', '', 10)
                pdf.ln(5)
                
            elif line.startswith('## '):
                # Titre niveau 2
                pdf.set_font('Helvetica', 'B', 14)
                title = clean_text(line[3:])[:50]
                pdf.ln(5)
                if title:
                    pdf.cell(0, 10, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
                pdf.set_font('Helvetica', '', 10)
                
            elif line.startswith('### '):
                # Titre niveau 3
                pdf.set_font('Helvetica', 'B', 12)
                title = clean_text(line[4:])[:50]
                pdf.ln(3)
                if title:
                    pdf.cell(0, 8, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
                pdf.set_font('Helvetica', '', 10)
                
            elif line.startswith('| ') and '---' not in line:
                # Ligne de tableau - limiter le nombre de colonnes
                cells = [c.strip() for c in line.split('|')[1:-1]]
                if cells and len(cells) <= 6:
                    col_width = min(180 / len(cells), 60)
                    for cell in cells:
                        cell_text = clean_text(cell)[:25]
                        if cell_text:
                            pdf.cell(col_width, 6, cell_text, border=1)
                    pdf.ln()
                    
            elif line.startswith('- ') or line.startswith('* '):
                # Liste
                text = clean_text(line[2:])[:100]
                if text:
                    pdf.cell(5, 5, '-')
                    pdf.multi_cell(175, 5, text)
                
            elif line and not line.startswith('|---') and not line.startswith('|'):
                # Texte normal
                text = clean_text(line)[:150]
                if text and len(text) > 1:
                    # Vérifier qu'il y a assez d'espace
                    if pdf.get_x() > 180:
                        pdf.ln()
                    pdf.multi_cell(180, 5, text)
        
        # Sauvegarder
        output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                   'docs', 'PROPOSICIONES_MEJORAS_FCC_001.pdf')
        pdf.output(output_path)
        
        print(f"✅ PDF généré avec succès: {output_path}")
        return True
        
    except ImportError:
        print("⚠️ FPDF2 non disponible")
        return False
    except Exception as e:
        print(f"❌ Erreur FPDF: {e}")
        import traceback
        traceback.print_exc()
        return False


def clean_text(text):
    """Nettoyer le texte des caractères spéciaux Markdown"""
    import re
    
    if not text:
        return ""
    
    # Supprimer les balises Markdown
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # Bold
    text = re.sub(r'\*([^*]+)\*', r'\1', text)      # Italic
    text = re.sub(r'`([^`]+)`', r'\1', text)        # Code
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)  # Links
    
    # Remplacer les caractères spéciaux par des équivalents ASCII
    replacements = {
        '→': '->', '←': '<-', '↔': '<->', '⇒': '=>',
        '✅': '[OK]', '❌': '[X]', '⚠️': '[!]', '🔴': '[!]', '🟡': '[?]', '🟢': '[+]',
        '📋': '', '📊': '', '🔧': '', '🚨': '', '👤': '', '🌐': '', '🔍': '',
        '📁': '', '🏠': '', '➕': '+', '✏️': '', '🗑️': '', '📄': '', '🖨️': '',
        '🎯': '', '💡': '', '⏳': '', '🔐': '', '🤖': '', '📎': '', '📑': '',
        '┌': '+', '┐': '+', '└': '+', '┘': '+', '├': '+', '┤': '+',
        '┬': '+', '┴': '+', '┼': '+', '─': '-', '│': '|',
        '━': '-', '┃': '|', '╔': '+', '╗': '+', '╚': '+', '╝': '+',
        '║': '|', '═': '=',
        '•': '-', '◆': '-', '◇': '-', '○': 'o', '●': '*',
        '"': '"', '"': '"', ''': "'", ''': "'",
        '…': '...', '–': '-', '—': '-',
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
        'ñ': 'n', 'Ñ': 'N', 'ü': 'u', 'Ü': 'U',
        'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u',
        'â': 'a', 'ê': 'e', 'î': 'i', 'ô': 'o', 'û': 'u',
        'ç': 'c', 'Ç': 'C',
    }
    
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    # Supprimer les caractères non-ASCII restants
    text = ''.join(c if ord(c) < 128 else '' for c in text)
    
    # Nettoyer les espaces multiples
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()


def markdown_to_html(md_content):
    """Convertir Markdown en HTML basique"""
    import re
    
    html = md_content
    
    # Headers
    html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^#### (.+)$', r'<h4>\1</h4>', html, flags=re.MULTILINE)
    
    # Bold and italic
    html = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', html)
    
    # Code blocks
    html = re.sub(r'```(\w+)?\n(.*?)\n```', r'<pre><code>\2</code></pre>', html, flags=re.DOTALL)
    html = re.sub(r'`([^`]+)`', r'<code>\1</code>', html)
    
    # Lists
    html = re.sub(r'^- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r'^(\d+)\. (.+)$', r'<li>\2</li>', html, flags=re.MULTILINE)
    
    # Tables (simplifiées)
    lines = html.split('\n')
    in_table = False
    new_lines = []
    
    for line in lines:
        if line.strip().startswith('|') and '---' not in line:
            if not in_table:
                new_lines.append('<table class="table">')
                in_table = True
            cells = [c.strip() for c in line.split('|')[1:-1]]
            row = '<tr>' + ''.join(f'<td>{c}</td>' for c in cells) + '</tr>'
            new_lines.append(row)
        else:
            if in_table and not line.strip().startswith('|'):
                new_lines.append('</table>')
                in_table = False
            if '|---' not in line:
                new_lines.append(line)
    
    if in_table:
        new_lines.append('</table>')
    
    html = '\n'.join(new_lines)
    
    # Paragraphes
    html = re.sub(r'\n\n+', '</p><p>', html)
    
    # Wrap in HTML structure
    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Proposiciones de Mejoras - FCC_001</title>
</head>
<body>
    <p>{html}</p>
</body>
</html>"""
    
    return html


def get_pdf_styles():
    """Retourner les styles CSS pour le PDF"""
    return """
    @page {
        size: A4;
        margin: 2cm;
        @bottom-center {
            content: counter(page) " / " counter(pages);
            font-size: 10pt;
        }
    }
    
    body {
        font-family: 'Helvetica', 'Arial', sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #333;
    }
    
    h1 {
        font-size: 20pt;
        color: #2c3e50;
        border-bottom: 2px solid #3498db;
        padding-bottom: 10px;
        page-break-before: always;
    }
    
    h1:first-of-type {
        page-break-before: avoid;
    }
    
    h2 {
        font-size: 16pt;
        color: #34495e;
        margin-top: 20px;
    }
    
    h3 {
        font-size: 13pt;
        color: #7f8c8d;
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
        font-size: 10pt;
    }
    
    th, td {
        border: 1px solid #bdc3c7;
        padding: 8px;
        text-align: left;
    }
    
    th {
        background-color: #3498db;
        color: white;
    }
    
    tr:nth-child(even) {
        background-color: #ecf0f1;
    }
    
    pre {
        background-color: #2c3e50;
        color: #ecf0f1;
        padding: 15px;
        border-radius: 5px;
        font-size: 9pt;
        overflow-x: auto;
        white-space: pre-wrap;
    }
    
    code {
        background-color: #ecf0f1;
        padding: 2px 5px;
        border-radius: 3px;
        font-size: 10pt;
    }
    
    li {
        margin: 5px 0;
    }
    
    strong {
        color: #2c3e50;
    }
    """


def generate_html_version():
    """Générer une version HTML imprimable"""
    print("📄 Génération de la version HTML imprimable...")
    
    md_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                           'docs', 'PROPOSICIONES_MEJORAS_FCC_001.md')
    
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # HTML avec styles intégrés pour impression
    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proposiciones de Mejoras - FCC_001</title>
    <style>
        @media print {{
            body {{ font-size: 11pt; }}
            h1 {{ page-break-before: always; }}
            h1:first-of-type {{ page-break-before: avoid; }}
            pre {{ font-size: 8pt; }}
            .no-print {{ display: none; }}
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }}
        
        h1 {{
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }}
        
        h2 {{
            color: #34495e;
            border-left: 4px solid #3498db;
            padding-left: 15px;
            margin-top: 30px;
        }}
        
        h3 {{
            color: #7f8c8d;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
        }}
        
        th, td {{
            border: 1px solid #bdc3c7;
            padding: 12px;
            text-align: left;
        }}
        
        th {{
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
        }}
        
        tr:nth-child(even) {{
            background-color: #f8f9fa;
        }}
        
        tr:hover {{
            background-color: #e8f4fd;
        }}
        
        pre {{
            background: linear-gradient(135deg, #2c3e50, #34495e);
            color: #ecf0f1;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 13px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        
        code {{
            background-color: #ecf0f1;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 13px;
        }}
        
        blockquote {{
            border-left: 4px solid #3498db;
            margin: 20px 0;
            padding: 15px 20px;
            background-color: #f8f9fa;
        }}
        
        .print-button {{
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 15px 30px;
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        
        .print-button:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.5);
        }}
        
        hr {{
            border: none;
            height: 2px;
            background: linear-gradient(to right, #3498db, transparent);
            margin: 30px 0;
        }}
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">
        🖨️ Imprimir / Guardar PDF
    </button>
    
    <div id="content">
{convert_md_to_html_content(md_content)}
    </div>
    
    <script>
        // Améliorer le rendu des tableaux
        document.querySelectorAll('table').forEach(table => {{
            const firstRow = table.querySelector('tr');
            if (firstRow) {{
                firstRow.querySelectorAll('td').forEach(td => {{
                    const th = document.createElement('th');
                    th.innerHTML = td.innerHTML;
                    td.parentNode.replaceChild(th, td);
                }});
            }}
        }});
    </script>
</body>
</html>"""
    
    output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                               'docs', 'PROPOSICIONES_MEJORAS_FCC_001.html')
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"✅ HTML généré: {output_path}")
    print("   → Ouvrez ce fichier dans un navigateur et utilisez Ctrl+P pour sauvegarder en PDF")
    return output_path


def convert_md_to_html_content(md_content):
    """Convertir le contenu Markdown en HTML"""
    import re
    
    html = md_content
    
    # Échapper les caractères HTML spéciaux (sauf pour les balises qu'on va créer)
    # html = html.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    
    # Headers
    html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^#### (.+)$', r'<h4>\1</h4>', html, flags=re.MULTILINE)
    
    # Bold and italic
    html = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', html)
    
    # Horizontal rules
    html = re.sub(r'^---+$', r'<hr>', html, flags=re.MULTILINE)
    
    # Code blocks
    def replace_code_block(match):
        lang = match.group(1) or ''
        code = match.group(2)
        return f'<pre><code class="language-{lang}">{code}</code></pre>'
    
    html = re.sub(r'```(\w+)?\n(.*?)```', replace_code_block, html, flags=re.DOTALL)
    
    # Inline code
    html = re.sub(r'`([^`]+)`', r'<code>\1</code>', html)
    
    # Tables
    lines = html.split('\n')
    new_lines = []
    in_table = False
    
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('|') and not re.match(r'^\|[-:\s|]+\|$', stripped):
            if not in_table:
                new_lines.append('<table>')
                in_table = True
            cells = [c.strip() for c in stripped.split('|')[1:-1]]
            row = '<tr>' + ''.join(f'<td>{c}</td>' for c in cells) + '</tr>'
            new_lines.append(row)
        elif re.match(r'^\|[-:\s|]+\|$', stripped):
            # Skip separator rows
            continue
        else:
            if in_table:
                new_lines.append('</table>')
                in_table = False
            new_lines.append(line)
    
    if in_table:
        new_lines.append('</table>')
    
    html = '\n'.join(new_lines)
    
    # Lists
    html = re.sub(r'^- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r'^\* (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r'^(\d+)\. (.+)$', r'<li>\2</li>', html, flags=re.MULTILINE)
    
    # Wrap consecutive li in ul
    html = re.sub(r'(<li>.*?</li>\n?)+', lambda m: '<ul>' + m.group(0) + '</ul>', html)
    
    # Paragraphs (lignes non-vides qui ne sont pas déjà des balises)
    lines = html.split('\n')
    result = []
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith('<') and not stripped.startswith('|'):
            result.append(f'<p>{stripped}</p>')
        else:
            result.append(line)
    
    return '\n'.join(result)


def main():
    """Point d'entrée principal"""
    print("=" * 60)
    print("📄 GÉNÉRATEUR PDF - PROPOSITIONS D'AMÉLIORATION FCC_001")
    print("=" * 60)
    print()
    
    # Essayer d'abord avec WeasyPrint
    if generate_pdf_with_weasyprint():
        return
    
    # Sinon essayer avec FPDF
    if generate_pdf_with_fpdf():
        return
    
    # En dernier recours, générer une version HTML
    print()
    print("⚠️ Aucune bibliothèque PDF disponible.")
    print("   Génération d'une version HTML imprimable...")
    print()
    
    html_path = generate_html_version()
    
    print()
    print("=" * 60)
    print("📋 INSTRUCTIONS POUR GÉNÉRER LE PDF:")
    print("=" * 60)
    print()
    print(f"1. Ouvrez le fichier HTML dans votre navigateur:")
    print(f"   {html_path}")
    print()
    print("2. Appuyez sur Ctrl+P (ou Cmd+P sur Mac)")
    print()
    print("3. Sélectionnez 'Enregistrer au format PDF'")
    print()
    print("4. Cliquez sur 'Enregistrer'")
    print()
    print("=" * 60)


if __name__ == '__main__':
    main()


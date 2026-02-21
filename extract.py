import sys, os, re

path = os.path.join(os.path.dirname(__file__), 'index.html')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

style_match = re.search(r'<style>([\s\S]*?)</style>', content)
if style_match:
    with open(os.path.join(os.path.dirname(__file__), 'styles.css'), 'w', encoding='utf-8') as f:
        f.write(style_match.group(1).strip())
    content = content.replace(style_match.group(0), '<link rel="stylesheet" href="styles.css">')
    print("Styles extracted")

script_match = re.search(r'<script>\s*(const firebaseConfig[\s\S]*?)</script>', content)
if script_match:
    with open(os.path.join(os.path.dirname(__file__), 'app.js'), 'w', encoding='utf-8') as f:
        f.write(script_match.group(1).strip())
    content = content.replace(script_match.group(0), '<script src="app.js"></script>')
    print("App extracted")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")

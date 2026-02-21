const fs = require('fs');

const path = require('path');
const p = path.join(__dirname, 'index.html');

let content = fs.readFileSync(p, 'utf8');

const styleRegex = /<style>([\s\S]*?)<\/style>/;
const matchStyle = content.match(styleRegex);
if (matchStyle) {
    fs.writeFileSync(path.join(__dirname, 'styles.css'), matchStyle[1].trim(), 'utf8');
    content = content.replace(matchStyle[0], '<link rel="stylesheet" href="styles.css">');
    console.log("Styles extracted.");
}

const scriptRegex = /<script>\s*(const firebaseConfig[\s\S]*?)<\/script>/;
const matchScript = content.match(scriptRegex);
if (matchScript) {
    fs.writeFileSync(path.join(__dirname, 'app.js'), matchScript[1].trim(), 'utf8');
    content = content.replace(matchScript[0], '<script src="app.js"></script>');
    console.log("App script extracted.");
}

fs.writeFileSync(p, content, 'utf8');
console.log("Extraction complete.");

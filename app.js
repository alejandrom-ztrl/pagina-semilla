// MAIN APP BOOTSTRAPsads
const CAT_FLORES = [
    { ref: "PT0012", nom: "Alhelí", t: "F", det: "20g (40ud)" },
    { ref: "PT0024", nom: "Alyssum", t: "F", det: "15g (50ud)" },
    { ref: "PT0075", nom: "Boca de dragón", t: "F", det: "15g (30ud)" },
    { ref: "PT0049", nom: "Caléndula", t: "F", det: "42g (20ud)" },
    { ref: "PT0071", nom: "Clavelina", t: "F", det: "6g (30ud)" },
    { ref: "PT0126", nom: "Mix de flores", t: "F", det: "30g (40ud)" },
    { ref: "PT0120", nom: "Mix de pétalos", t: "F", det: "10g" },
    { ref: "PT0141", nom: "Pensamiento", t: "F", det: "18g (18ud)" },
    { ref: "PT0146", nom: "Pensamiento mini", t: "F", det: "10g (60ud)" },
    { ref: "PT0182", nom: "Tagete", t: "F", det: "42g (20ud)" },
    { ref: "PT0188", nom: "Tulbaghia", t: "F", det: "6g (40ud)" },
    { ref: "PT0159", nom: "Pétalos de rosa", t: "F", det: "9g (100ud)" },
    { ref: "PT0159-50", nom: "Pétalos de rosa (50 ud)", t: "F", det: "5g (50ud)" },
    { ref: "PT0169", nom: "Rosas mini", t: "F", det: "43g (13ud)" },
    { ref: "PT0169-8", nom: "Rosas mini (8 ud)", t: "F", det: "26g (8ud)" },
    { ref: "PT0211", nom: "Micro mix pétalos (60g)", t: "F", det: "60g" },
    { ref: "PT0212", nom: "Micro mix pétalos (120g)", t: "F", det: "120g" },
    { ref: "PT0241", nom: "Aciano (D)", t: "D", det: "5g" },
    { ref: "PT0246", nom: "Caléndula (D)", t: "D", det: "5g" },
    { ref: "PT0254", nom: "Lavanda (D)", t: "D", det: "10g" },
    { ref: "PT0259", nom: "Mix de pétalos (D)", t: "D", det: "5g" },
    { ref: "PT0269", nom: "Pensamiento (D)", t: "D", det: "5g" },
    { ref: "PT0270", nom: "Pensamiento mini (D)", t: "D", det: "5g" },
    { ref: "PT0271", nom: "Pétalos de rosa rojos (D)", t: "D", det: "5g" },
    { ref: "PT0272", nom: "Pétalos de rosa fucsias (D)", t: "D", det: "10g" },
    { ref: "PT0274", nom: "Rosas mini (D)", t: "D", det: "10g" },
    { ref: "PT0276", nom: "Tagete naranja (D)", t: "D", det: "5g" },
    { ref: "PT0280", nom: "Tulbaghia (D)", t: "D", det: "5g" }
];

function initApp() {
    if (sessionStorage.getItem('isla_auth') === 'true') {
        document.getElementById('login-overlay').style.display = 'none';
    }

    database.ref('micro_db_isla').on('value', (snapshot) => {
        const cloudData = snapshot.val();
        if (cloudData) {
            db = cloudData;
            refresh();
            document.getElementById('cloud-status').innerText = "Nube sincronizada";
        } else {
            document.getElementById('cloud-status').innerText = "Nube vacía. Importa tu copia.";
        }
    });

    loadTheme();
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW OK'), err => console.log('SW FAIL'));
    });
}

window.onload = initApp;
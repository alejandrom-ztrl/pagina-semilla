// DATA & PERSISTENCE MODULE
const firebaseConfig = { databaseURL: "https://la-isla-microgreen-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let db = { clientes: [], plantas: [], planes: [], lotes: [], completadas: [], visitas: [], notas: [], ultimoCorrelativo: 0 };
let curMonth = new Date();
const B_AREAS = { "Estándar (25x50)": 1250, "Cuadrada (12x12)": 144, "Pequeña (9x9)": 81 };

function save(keys) {
    if (!keys) {
        database.ref('micro_db_isla').set(db);
        refresh();
    } else {
        const updates = {};
        if (Array.isArray(keys)) {
            keys.forEach(k => updates[k] = db[k]);
        } else {
            updates[keys] = db[keys];
        }
        database.ref('micro_db_isla').update(updates);
    }
}

function importToCloud(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const imported = JSON.parse(ev.target.result);
        if (confirm("Se subirán todos tus datos antiguos a la nube. ¿OK?")) {
            db = imported;
            save();
            alert("¡Datos recuperados con éxito!");
        }
    };
    reader.readAsText(e.target.files[0]);
}

function exportData() {
    const blob = new Blob([JSON.stringify(db)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `isla_db.json`;
    a.click();
}

function clearData() {
    if (confirm("¿BORRAR TODO?")) {
        db = { clientes: [], plantas: [], planes: [], lotes: [], completadas: [], visitas: [], notas: [], ultimoCorrelativo: 0 };
        save();
    }
}

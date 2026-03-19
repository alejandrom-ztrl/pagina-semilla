// MODULO DE ESTADO Y PERSISTENCIA
export function save(keys) {
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

export function importToCloud(e) {
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

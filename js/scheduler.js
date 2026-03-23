// SCHEDULER & CORE LOGIC MODULE
function generateTasks() {
    const body = document.getElementById('calendar-body'); if (!body) return;
    body.innerHTML = ''; const tasks = [];
    (db.planes || []).forEach(plan => {
        const iter = plan.puntual ? 1 : 4;
        for (let i = 0; i < iter; i++) {
            if (plan.tipo === 'INDIVIDUAL') {
                const plt = db.plantas.find(x => x.id === plan.plantaId); if (!plt) return;
                let entrega = new Date(plan.fecha);
                entrega.setDate(entrega.getDate() + (i * plan.frec));
                let s = new Date(entrega);
                s.setDate(s.getDate() - plt.total);
                crearHitos(tasks, s, plt, plan.cant, plan);
            } else {
                let entrega = new Date(plan.fechaEntrega);
                entrega.setDate(entrega.getDate() + (i * plan.frec));
                plan.detalleMix.forEach(item => {
                    const plt = db.plantas.find(x => x.id === item.id); if (!plt) return;
                    let s = new Date(entrega);
                    s.setDate(s.getDate() - plt.total);
                    crearHitos(tasks, s, plt, item.cant, plan);
                });
            }
        }
    });
    const filtradas = tasks.filter(t => t.fecha >= new Date(new Date().setHours(0, 0, 0, 0))).sort((a, b) => a.fecha - b.fecha).slice(0, 30);
    let lastD = "";
    filtradas.forEach(t => {
        const dStr = t.fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase();
        if (dStr !== lastD) { body.innerHTML += `<div class="task-date-title">${dStr}</div>`; lastD = dStr; }
        const isDone = (db.completadas || []).includes(t.tid);
        body.innerHTML += `<div class="task-row ${isDone ? 'completed' : ''}" 
                    onclick="toggleTask('${t.tid}', '${t.tipo}', '${t.pltNombre}', '${t.cli}', '${t.fStr}', '${t.cant}', '${t.bandeja}', '${t.pltId}')">
                    <span class="badge-task bg-${t.tipo}">${t.tipo}</span> 
                    <strong>${t.msg}</strong> (${t.cli})
                </div>`;
    });
}

function crearHitos(tasks, s, plt, cant, plan) {
    const fStr = s.toISOString().split('T')[0];
    const add = (f, t, m) => tasks.push({
        fecha: new Date(f), tipo: t, msg: m, cli: plan.cliente,
        tid: `${t}-${plan.id}-${f.getTime()}`, pltNombre: plt.nombre, pltId: plt.id,
        fStr: fStr, cant: cant, bandeja: plan.bandeja
    });

    if (plt.remojo > 0) {
        let r = new Date(s); r.setDate(r.getDate() - 1);
        add(r, 'remojo', `<i class="fas fa-tint"></i> REMOJAR ${plt.nombre}`);
    }
    const area = B_AREAS[plan.bandeja] || 1250;
    const grPorBandeja = (plt.gramos * (area / 1250)).toFixed(1);
    const grTotales = (grPorBandeja * cant).toFixed(1);
    add(s, 'siembra', `<i class="fas fa-seedling"></i> SEMBRAR ${plt.nombre} (x${cant}) - [${plan.bandeja}] - ${grTotales}g total`);

    let l = new Date(s); l.setDate(l.getDate() + plt.oscuro);
    add(l, 'luz', `<i class="fas fa-sun"></i> A LUZ ${plt.nombre}`);

    let c = new Date(s); c.setDate(c.getDate() + plt.total);
    add(c, 'cosecha', `<i class="fas fa-leaf"></i> COSECHAR ${plt.nombre}`);
}

function toggleTask(id, tipo, pltNombre, cliente, fecha, cant, bandeja, pltId) {
    if (!db.completadas) db.completadas = [];
    const saveKeys = ['completadas'];
    if (db.completadas.includes(id)) {
        db.completadas = db.completadas.filter(x => x !== id);
        if (tipo === 'siembra' && pltId) {
            const pltIdx = db.plantas.findIndex(x => x.id === pltId);
            if (pltIdx > -1) {
                const plt = db.plantas[pltIdx];
                const kgTotales = (plt.gramos * (B_AREAS[bandeja] || 1250) / 1250 * cant) / 1000;
                if (!db.config || db.config.restarStockAuto !== false) {
                    db.plantas[pltIdx].stockKg = (plt.stockKg || 0) + kgTotales;
                    if (!saveKeys.includes('plantas')) saveKeys.push('plantas');
                }
            }
        }
    } else {
        db.completadas.push(id);
        if (tipo === 'siembra') {
            generarLoteAutomatico(pltId, pltNombre, cliente, fecha, cant, bandeja);
            if (!saveKeys.includes('lotes')) saveKeys.push('lotes');
            if (!saveKeys.includes('ultimoCorrelativo')) saveKeys.push('ultimoCorrelativo');
            if (pltId) {
                const pltIdx = db.plantas.findIndex(x => x.id === pltId);
                if (pltIdx > -1) {
                    const plt = db.plantas[pltIdx];
                    const kgTotales = (plt.gramos * (B_AREAS[bandeja] || 1250) / 1250 * cant) / 1000;
                    if (!db.config || db.config.restarStockAuto !== false) {
                        db.plantas[pltIdx].stockKg = Math.max(0, (plt.stockKg || 0) - kgTotales);
                        if (db.plantas[pltIdx].stockKg < (plt.stockMin || 1.0)) alert(`¡BAJO STOCK! ${pltNombre}`);
                        if (!saveKeys.includes('plantas')) saveKeys.push('plantas');
                    }
                }
            }
        }
    }
    save(saveKeys);
}

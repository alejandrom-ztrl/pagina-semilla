// AUXILIARY UTILITIES MODULE
function updateCosechaCliente() {
    const l = db.lotes.find(x => x.codigo === document.getElementById('cosecha-lote').value);
    if (l) document.getElementById('cosecha-cliente').value = l.cliente;
}

function generarEtiquetaCosecha() {
    const loteCod = document.getElementById('cosecha-lote').value;
    const fCosecha = document.getElementById('cosecha-fecha').value;
    const clienteEditado = document.getElementById('cosecha-cliente').value;
    const cantGramos = document.getElementById('cosecha-cant').value;
    const unidad = document.getElementById('cosecha-unidad').value;

    if (!loteCod || !fCosecha || !clienteEditado || !cantGramos) {
        alert("Faltan datos por rellenar");
        return;
    }

    const l = db.lotes.find(x => x.codigo === loteCod);
    if (!l) return;

    if (!l.distribucion) l.distribucion = [];
    if (!l.distribucion.includes(clienteEditado)) {
        l.distribucion.push(clienteEditado);
        save('lotes');
    }

    // Calcula Caducidad (+8 días)
    const f = new Date(fCosecha);
    f.setDate(f.getDate() + 8);
    const cadFormat = `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}`;

    const cortadoParts = fCosecha.split('-');
    const cortadoFormat = `${cortadoParts[2]}/${cortadoParts[1]}`;

    const pNombre = l.plantaNombre.trim().toUpperCase();
    
    document.getElementById('etiq-bg-img').src = `img/PLANTILLA.png?t=` + new Date().getTime();

    document.getElementById('txt-planta').innerText = pNombre;
    document.getElementById('txt-cliente').innerText = clienteEditado;
    document.getElementById('txt-lote').innerText = loteCod;
    document.getElementById('txt-cortado').innerText = cortadoFormat;
    document.getElementById('txt-cad').innerText = cadFormat;
    document.getElementById('txt-cant').innerText = cantGramos + unidad;
    
    document.getElementById('card-etiqueta-print').style.display = 'block';
}

function descargarPNG() {
    html2canvas(document.getElementById('label-cosecha-box'), { useCORS: true }).then(canvas => {
        const link = document.createElement('a'); link.download = `Etiqueta_${document.getElementById('cosecha-lote').value}.png`; link.href = canvas.toDataURL("image/png"); link.click();
    });
}

function changeMonth(d) { curMonth.setMonth(curMonth.getMonth() + d); renderVisitsCal(); }

function toggleVisitsView(v) { document.getElementById('visitas-lista').style.display = v === 'lista' ? 'block' : 'none'; document.getElementById('visitas-calendario').style.display = v === 'calendario' ? 'block' : 'none'; }

function runCalc() { const p = db.plantas.find(x => x.id === document.getElementById('calc-planta').value); if (!p) return; const g = (p.gramos * (parseFloat(document.getElementById('calc-bandeja').value) / 1250)).toFixed(1); const coste = ((g / 1000) * (p.precio || 0)).toFixed(2); document.getElementById('calc-res').innerHTML = `<strong>${g}g</strong> / <span style="color:var(--primary)">Coste: ${coste}€</span>`; }

function filterLotes() { const q = document.getElementById('search-lote-cliente').value.toLowerCase(); renderLotesTable(db.lotes.filter(l => l.cliente.toLowerCase().includes(q) || l.codigo.toLowerCase().includes(q))); }

function filterClientes() { const q = document.getElementById('search-cliente').value.toLowerCase(); renderClientesTable(db.clientes.filter(c => (c.nombreComercial && c.nombreComercial.toLowerCase().includes(q)) || (c.nombre && c.nombre.toLowerCase().includes(q)) || (c.nif && c.nif.toLowerCase().includes(q)))); }

function toggleCalendar() { document.getElementById('calendar-body').classList.toggle('show'); }

function togglePlanModo(m) { document.getElementById('panel-individual').style.display = m === 'individual' ? 'block' : 'none'; document.getElementById('panel-mix').style.display = m === 'mix' ? 'block' : 'none'; }

function updateDiasInfo() { const plt = (db.plantas || []).find(x => x.id === document.getElementById('plan-planta').value); if (plt) { document.getElementById('plan-dias-info').innerText = `Ciclo total: ${plt.total} días`; validateLeadTime(); } }

function validateLeadTime() {
    const d = document.getElementById('plan-fecha').value, pltId = document.getElementById('plan-planta').value; if (!d || !pltId) return;
    const siembra = new Date(d); siembra.setDate(siembra.getDate() - db.plantas.find(x => x.id === pltId).total);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    document.getElementById('date-alert').style.display = siembra < hoy ? "block" : "none";
}

function calcMixLeadTime() {
    const f = document.getElementById('plan-fecha-entrega'), i = document.getElementById('mix-lead-info'); let max = 0;
    document.querySelectorAll('.mix-row').forEach(r => { if (r.querySelector('.mix-chk').checked && parseInt(r.querySelector('.mix-qty').value) > 0) { const p = db.plantas.find(x => x.id === r.querySelector('.mix-chk').value); if (p && p.total > max) max = p.total; } });
    if (max > 0) { const e = new Date(); e.setDate(e.getDate() + max); f.value = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`; i.innerHTML = `✅ Entrega óptima: <strong>${e.toLocaleDateString('es-ES')}</strong>`; }
    else { f.value = ""; i.innerText = "Selecciona plantas."; }
}

function reiniciarLotes() { if (confirm("¿Reiniciar lotes?")) { db.lotes = []; db.ultimoCorrelativo = 0; save(['lotes', 'ultimoCorrelativo']); refresh(); } }

function renderVisitsCal() {
    const grid = document.getElementById('visitas-grid'); if (!grid) return; grid.innerHTML = '';
    document.getElementById('cal-title').innerText = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(curMonth).toUpperCase();
    for (let d = 1; d <= new Date(curMonth.getFullYear(), curMonth.getMonth() + 1, 0).getDate(); d++) {
        const f = `${curMonth.getFullYear()}-${String(curMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        grid.innerHTML += `<div class="calendar-day"><span class="day-num">${d}</span>${(db.visitas || []).filter(v => v.fecha === f).map(v => `<div class="visit-tag">${v.cliente}</div>`).join('')}</div>`;
    }
}

function showToast(msg, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${msg}</span><i class="fas fa-times" onclick="this.parentElement.remove()"></i>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => { toast.remove(); }, 500); }, 5000);
}

function restarBandejaID(id) {
    if (!db.lotes) return;
    const idx = db.lotes.findIndex(l => l.id === id);
    
    if (idx > -1) {
        const planta = db.lotes[idx].plantaNombre;
        let nuevaCant = parseInt(db.lotes[idx].cant) - 1;
        
        if (nuevaCant <= 0) {
            db.lotes.splice(idx, 1);
            showToast(`Lote de ${planta} terminado y eliminado`, "info");
        } else {
            db.lotes[idx].cant = nuevaCant;
            showToast(`Bandeja de ${planta} descontada`, "info");
        }
        
        save('lotes');
        renderLotesTable(db.lotes);
        renderResumenSemanal();
    }
}

function sumarBandejaID(id) {
    if (!db.lotes) return;
    const idx = db.lotes.findIndex(l => l.id === id);
    if (idx > -1) {
        db.lotes[idx].cant = (parseInt(db.lotes[idx].cant) || 0) + 1;
        save('lotes'); renderLotesTable(db.lotes); renderResumenSemanal();
        showToast(`Bandeja añadida al lote`, "info");
    }
}

function restarBandejaPorPlanta(plantaNombre) {
    if (!db.lotes) return;
    
    // Buscar lotes de esa planta y ordenarlos por fecha (más antiguo primero)
    const lotesPlanta = db.lotes
        .filter(l => l.plantaNombre === plantaNombre)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    if (lotesPlanta.length > 0) {
        const loteOldest = lotesPlanta[0];
        // Encontrar índice original en db.lotes
        const idx = db.lotes.findIndex(l => l.id === loteOldest.id);
        
        if (idx > -1) {
            let nuevaCant = parseInt(db.lotes[idx].cant) - 1;
            if (nuevaCant <= 0) {
                db.lotes.splice(idx, 1);
            } else {
                db.lotes[idx].cant = nuevaCant;
            }
            
            save('lotes');
            renderLotesTable(db.lotes);
            renderResumenSemanal();
            showToast(`Bandeja de ${plantaNombre} restada del stock`, "info");
        }
    }
}

function sumarBandejaPorPlanta(plantaNombre) {
    if (!db.lotes) return;
    const lote = db.lotes
        .filter(l => l.plantaNombre === plantaNombre)
        .sort((a,b) => new Date(a.fecha) - new Date(b.fecha))[0];
    if (lote) sumarBandejaID(lote.id);
}

function parseDateLocal(dateStr) {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function getAdjustedDate() {
    const ahora = new Date();
    if (ahora.getHours() >= 14) {
        ahora.setDate(ahora.getDate() + 1);
    }
    return ahora.toISOString().split('T')[0];
}

window.parseDateLocal = parseDateLocal;
window.getAdjustedDate = getAdjustedDate;
window.restarBandejaID = restarBandejaID;
window.sumarBandejaID = sumarBandejaID;
window.restarBandejaPorPlanta = restarBandejaPorPlanta;
window.sumarBandejaPorPlanta = sumarBandejaPorPlanta;
window.showToast = showToast;
window.updateCosechaCliente = updateCosechaCliente;
window.generarEtiquetaCosecha = generarEtiquetaCosecha;
window.descargarPNG = descargarPNG;
window.changeMonth = changeMonth;
window.toggleVisitsView = toggleVisitsView;
window.runCalc = runCalc;
window.filterLotes = filterLotes;
window.filterClientes = filterClientes;
window.toggleCalendar = toggleCalendar;
window.togglePlanModo = togglePlanModo;
window.updateDiasInfo = updateDiasInfo;
window.validateLeadTime = validateLeadTime;
window.calcMixLeadTime = calcMixLeadTime;
window.reiniciarLotes = reiniciarLotes;
window.renderVisitsCal = renderVisitsCal;

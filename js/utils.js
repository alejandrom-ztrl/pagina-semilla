// AUXILIARY UTILITIES MODULE
function updateCosechaCliente() {
    const l = db.lotes.find(x => x.codigo === document.getElementById('cosecha-lote').value);
    if (l) document.getElementById('cosecha-cliente').value = l.cliente;
}

function generarEtiquetaCosecha() {
    const loteCod = document.getElementById('cosecha-lote').value, fCosecha = document.getElementById('cosecha-fecha').value, clienteEditado = document.getElementById('cosecha-cliente').value;
    if (!loteCod || !fCosecha || !clienteEditado) { alert("Datos incompletos"); return; }
    const l = db.lotes.find(x => x.codigo === loteCod); if (!l) return;
    if (!l.distribucion) l.distribucion = [];
    if (!l.distribucion.includes(clienteEditado)) { l.distribucion.push(clienteEditado); save('lotes'); }
    document.getElementById('lbl-cliente-box').innerHTML = `<strong>CLIENTE:</strong> ${clienteEditado.toUpperCase()}`;
    document.getElementById('lbl-prod-box').innerHTML = `<strong>PRODUCTO:</strong> ${l.plantaNombre.toUpperCase()}`;
    document.getElementById('lbl-lote-box').innerHTML = `<strong>LOTE:</strong> ${l.codigo}`;
    document.getElementById('lbl-siembra-box').innerHTML = `<strong>FECHA SIEMBRA:</strong> ${l.fecha}`;
    document.getElementById('lbl-cosecha-box').innerHTML = `-> FECHA COSECHA: ${fCosecha} <-`;
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

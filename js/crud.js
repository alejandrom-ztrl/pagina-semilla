// CRUD & ENTITY MANAGEMENT MODULE
function addPlanta() {
    const p = {
        id: document.getElementById('plt-id').value.toUpperCase(),
        nombre: document.getElementById('plt-nombre').value,
        remojo: parseInt(document.getElementById('plt-remojo').value),
        oscuro: parseInt(document.getElementById('plt-oscuro').value),
        total: parseInt(document.getElementById('plt-total').value),
        gramos: parseInt(document.getElementById('plt-gramos').value),
        precio: parseFloat(document.getElementById('plt-precio').value),
        stockMin: parseFloat(document.getElementById('plt-stock-min').value) || 1.0
    };
    const idx = db.plantas.findIndex(x => x.id === p.id);
    if (idx > -1) {
        p.stockKg = db.plantas[idx].stockKg || 0;
        db.plantas[idx] = p;
    } else {
        p.stockKg = 0;
        db.plantas.push(p);
    }
    save('plantas');
}

function editPlanta(id) {
    const p = db.plantas.find(x => x.id === id);
    if (p) {
        document.getElementById('plt-id').value = p.id;
        document.getElementById('plt-nombre').value = p.nombre || '';
        document.getElementById('plt-remojo').value = p.remojo || 0;
        document.getElementById('plt-oscuro').value = p.oscuro || 0;
        document.getElementById('plt-total').value = p.total || 0;
        document.getElementById('plt-gramos').value = p.gramos || 0;
        document.getElementById('plt-precio').value = p.precio || 0;
        document.getElementById('plt-stock-min').value = p.stockMin || 1.0;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function addCliente() {
    const f = (id) => document.getElementById(id).value;
    const n_com = f('cli-nombre-comercial'), n = f('cli-nombre'), nif = f('cli-nif'), dir = f('cli-dir'), cp = f('cli-cp'), pob = f('cli-pob'), prov = f('cli-prov'), pais = f('cli-pais'), email = f('cli-email'), tel = f('cli-tel'), cobro = f('cli-cobro'), hiddenId = f('cli-id');
    if (n_com || n) {
        if (!db.clientes) db.clientes = [];
        const c = { id: hiddenId ? Number(hiddenId) : Date.now(), nombreComercial: n_com, nombre: n, nif: nif, dir: dir, cp: cp, pob: pob, prov: prov, pais: pais, email: email, tel: tel, cobro: cobro };
        if (hiddenId) { const idx = db.clientes.findIndex(x => x.id == hiddenId); if (idx > -1) db.clientes[idx] = c; }
        else { db.clientes.push(c); }
        ['cli-nombre-comercial', 'cli-nombre', 'cli-nif', 'cli-dir', 'cli-cp', 'cli-pob', 'cli-prov', 'cli-email', 'cli-tel', 'cli-id'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('cli-pais').value = 'España';
        save('clientes');
    }
}

function editCliente(id) {
    const c = db.clientes.find(x => x.id == id);
    if (c) {
        const s = (i, v) => document.getElementById(i).value = v || '';
        s('cli-id', c.id); s('cli-nombre-comercial', c.nombreComercial); s('cli-nombre', c.nombre); s('cli-nif', c.nif); s('cli-dir', c.dir); s('cli-cp', c.cp); s('cli-pob', c.pob); s('cli-prov', c.prov); s('cli-pais', c.pais); s('cli-email', c.email); s('cli-tel', c.tel); s('cli-cobro', c.cobro);
        showSection('clientes'); window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function addPlan() {
    const editId = document.getElementById('plan-id-edicion').value;
    const pltId = document.getElementById('plan-planta').value;
    const cant = parseInt(document.getElementById('plan-cant-ind').value);
    const bandeja = document.getElementById('plan-tipo-bandeja').value;
    const p = { id: editId ? Number(editId) : Date.now(), tipo: 'INDIVIDUAL', cliente: document.getElementById('plan-cliente').value, plantaId: pltId, bandeja: bandeja, cant: cant, frec: parseInt(document.getElementById('plan-frec').value), fecha: document.getElementById('plan-fecha').value, puntual: document.getElementById('plan-puntual').checked };
    if (!editId && pltId) {
        const pltObj = db.plantas.find(x => x.id === pltId);
        if (pltObj && (pltObj.stockKg || 0) < (pltObj.gramos * (B_AREAS[bandeja] || 1250) / 1000 / 1250 * cant)) { if (!confirm("¡Stock bajo! ¿Continuar?")) return; }
    }
    if (p.fecha) {
        if (!db.planes) db.planes = [];
        if (editId) { const idx = db.planes.findIndex(x => x.id == editId); if (idx > -1) db.planes[idx] = p; }
        else { db.planes.push(p); }
        document.getElementById('plan-id-edicion').value = ''; document.getElementById('btn-save-plan').innerText = 'Guardar Individual'; document.getElementById('plan-puntual').checked = false;
        save('planes');
    }
}

function editPlan(id) {
    const p = db.planes.find(x => x.id == id); if (!p) return;
    document.getElementById('plan-id-edicion').value = p.id; document.getElementById('plan-cliente').value = p.cliente; document.getElementById('plan-tipo-bandeja').value = p.bandeja; document.getElementById('plan-frec').value = p.frec; document.getElementById('plan-puntual').checked = p.puntual || false;
    if (p.tipo === 'INDIVIDUAL') { togglePlanModo('individual'); document.getElementById('plan-planta').value = p.plantaId; document.getElementById('plan-cant-ind').value = p.cant; document.getElementById('plan-fecha').value = p.fecha; document.getElementById('btn-save-plan').innerText = 'Actualizar Plan'; updateDiasInfo(); }
    else { togglePlanModo('mix'); document.querySelectorAll('.mix-chk').forEach(c => c.checked = false); document.querySelectorAll('.mix-qty').forEach(q => q.value = 0); p.detalleMix.forEach(item => { const row = Array.from(document.querySelectorAll('.mix-row')).find(r => r.querySelector('.mix-chk').value === item.id); if (row) { row.querySelector('.mix-chk').checked = true; row.querySelector('.mix-qty').value = item.cant; } }); document.getElementById('plan-fecha-entrega').value = p.fechaEntrega; document.getElementById('btn-save-mix').innerText = 'Actualizar Plan Mix'; calcMixLeadTime(); }
    showSection('planes');
}

function addPlanMix() {
    const editId = document.getElementById('plan-id-edicion').value; let sel = []; let stockReq = 0;
    const bandeja = document.getElementById('plan-tipo-bandeja').value;
    document.querySelectorAll('.mix-row').forEach(r => {
        const chk = r.querySelector('.mix-chk'), qty = r.querySelector('.mix-qty');
        if (chk.checked && parseInt(qty.value) > 0) { sel.push({ id: chk.value, cant: parseInt(qty.value) }); }
    });
    const p = { id: editId ? Number(editId) : Date.now(), tipo: 'MIX', cliente: document.getElementById('plan-cliente').value, detalleMix: sel, bandeja: bandeja, frec: parseInt(document.getElementById('plan-frec').value), fechaEntrega: document.getElementById('plan-fecha-entrega').value, puntual: document.getElementById('plan-puntual').checked };
    if (sel.length > 0) {
        if (!db.planes) db.planes = []; if (editId) { const idx = db.planes.findIndex(x => x.id == editId); if (idx > -1) db.planes[idx] = p; } else { db.planes.push(p); }
        save('planes'); document.getElementById('plan-id-edicion').value = ''; document.getElementById('btn-save-mix').innerText = 'Guardar Plan Mix'; document.getElementById('plan-puntual').checked = false; togglePlanModo('individual');
    }
}

function addVisita() {
    if (!db.visitas) db.visitas = [];
    const editId = document.getElementById('visita-id-edicion').value;
    const v = {
        id: editId ? Number(editId) : Date.now(),
        cliente: document.getElementById('visita-cliente').value,
        fecha: document.getElementById('visita-fecha').value,
        hora: document.getElementById('visita-hora').value,
        motivo: document.getElementById('visita-motivo').value
    };

    if (editId) {
        const idx = db.visitas.findIndex(x => x.id == editId);
        if (idx > -1) db.visitas[idx] = v;
    } else {
        db.visitas.push(v);
    }

    // Resetear formulario
    document.getElementById('visita-id-edicion').value = '';
    document.getElementById('btn-save-visita').innerText = 'Registrar Visita';
    ['visita-cliente', 'visita-fecha', 'visita-hora', 'visita-motivo'].forEach(id => document.getElementById(id).value = '');
    
    save('visitas');
}

function editVisita(id) {
    const v = db.visitas.find(x => x.id == id);
    if (v) {
        document.getElementById('visita-id-edicion').value = v.id;
        document.getElementById('visita-cliente').value = v.cliente;
        document.getElementById('visita-fecha').value = v.fecha || '';
        document.getElementById('visita-hora').value = v.hora || '';
        document.getElementById('visita-motivo').value = v.motivo || '';
        document.getElementById('btn-save-visita').innerText = 'Actualizar Visita';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function addStockSemilla() {
    const id = document.getElementById('stock-semilla-id').value, kilos = parseFloat(document.getElementById('stock-semilla-cant').value) || 0;
    if (kilos > 0) { const idx = db.plantas.findIndex(x => x.id === id); if (idx > -1) { db.plantas[idx].stockKg = (db.plantas[idx].stockKg || 0) + kilos; save('plantas'); document.getElementById('stock-semilla-cant').value = '1'; } }
}

function editInsumo(id) {
    const ins = (db.inventario || []).find(x => x.id === id);
    if (ins) { document.getElementById('insumo-id').value = ins.id; document.getElementById('insumo-nombre').value = ins.nombre; document.getElementById('insumo-cant').value = ins.cant; document.getElementById('insumo-unidad').value = ins.unidad; document.getElementById('insumo-nombre').focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
}

function addInsumo() {
    const hiddenId = document.getElementById('insumo-id').value, nombre = document.getElementById('insumo-nombre').value, cant = parseFloat(document.getElementById('insumo-cant').value) || 0, unidad = document.getElementById('insumo-unidad').value;
    if (nombre.trim() !== '') {
        if (!db.inventario) db.inventario = [];
        if (hiddenId) { const idx = db.inventario.findIndex(x => x.id == hiddenId); if (idx > -1) db.inventario[idx] = { id: Number(hiddenId), nombre: nombre, cant: cant, unidad: unidad }; }
        else { db.inventario.push({ id: Date.now(), nombre: nombre, cant: cant, unidad: unidad }); }
        document.getElementById('insumo-id').value = ''; document.getElementById('insumo-nombre').value = ''; document.getElementById('insumo-cant').value = '0'; save('inventario');
    }
}

function toggleStockAuto() {
    if (!db.config) db.config = {};
    db.config.restarStockAuto = document.getElementById('stock-auto-toggle').checked;
    save('config');
}

window.addPlanta = addPlanta;
window.editPlanta = editPlanta;
window.addCliente = addCliente;
window.editCliente = editCliente;
window.addPlan = addPlan;
window.editPlan = editPlan;
window.addPlanMix = addPlanMix;
window.addVisita = addVisita;
window.editVisita = editVisita;
window.addStockSemilla = addStockSemilla;
window.editInsumo = editInsumo;
window.addInsumo = addInsumo;
window.toggleStockAuto = toggleStockAuto;

const firebaseConfig = { databaseURL: "https://la-isla-microgreen-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let db = { clientes: [], plantas: [], planes: [], lotes: [], completadas: [], visitas: [], notas: [], ultimoCorrelativo: 0 };
let curMonth = new Date();
const B_AREAS = { "Estándar (25x50)": 1250, "Cuadrada (12x12)": 144, "Pequeña (9x9)": 81 };

// --- SEGURIDAD HASH ---
async function hashString(str) {
    const buffer = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const SECRET_HASH = "33cf990007d36b063ef5a6a26b15798147235f8e1d40db87466998dd3d12535b";
async function checkLogin() {
    const pwd = document.getElementById('login-pwd').value;
    const hashedInput = await hashString(pwd);
    if (hashedInput === SECRET_HASH) {
        sessionStorage.setItem('isla_auth', 'true');
        document.getElementById('login-overlay').style.display = 'none';
    } else {
        document.getElementById('login-err').style.display = 'block';
    }
}

// --- INICIO ---
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
}

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

function refresh() {
    // Ordenar clientes alfabéticamente
    if (db.clientes) {
        db.clientes.sort((a, b) => {
            const nameA = (a.nombreComercial || a.nombre || "").toUpperCase();
            const nameB = (b.nombreComercial || b.nombre || "").toUpperCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
    }

    const cliOpt = (db.clientes || []).map(c => `<option value="${c.nombreComercial || c.nombre}">${c.nombreComercial || c.nombre}</option>`).join('');
    const pltOpt = (db.plantas || []).map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

    document.getElementById('visita-cliente').innerHTML = cliOpt;
    document.getElementById('plan-cliente').innerHTML = cliOpt;
    document.getElementById('plan-planta').innerHTML = pltOpt;
    document.getElementById('lote-planta').innerHTML = pltOpt;
    document.getElementById('lote-cliente').innerHTML = cliOpt;
    document.getElementById('calc-planta').innerHTML = pltOpt;
    document.getElementById('stock-semilla-id').innerHTML = pltOpt;

    // MODIFICACIÓN: ESTRUCTURA LISTA MIX REFORMADA PARA MÓVIL
    document.getElementById('mix-lista-check').innerHTML = (db.plantas || []).map(p => `
                <div class="plt-check-item mix-row">
                    <div class="mix-left">
                        <span class="mix-name">${p.nombre}</span>
                        <span class="mix-days">${p.total} días ciclo</span>
                    </div>
                    <div class="mix-right">
                        <input type="number" class="mix-qty" value="0" min="0" placeholder="Cant" onchange="calcMixLeadTime()">
                        <input type="checkbox" class="mix-chk" value="${p.id}" onchange="calcMixLeadTime()"> 
                    </div>
                </div>`).join('');

    document.querySelector('#table-planes tbody').innerHTML = (db.planes || []).length === 0 ? `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #999;">No hay planes registrados</td></tr>` : (db.planes || []).map(p => {
        let det = "";
        if (p.tipo === 'MIX') {
            const noms = p.detalleMix.map(item => {
                const pl = db.plantas.find(x => x.id === item.id);
                return pl ? `${pl.nombre} (x${item.cant})` : item.id;
            });
            det = `<strong>MIX:</strong><ul class="mix-detail-list"><li>${noms.join('</li><li>')}</li></ul>`;
        } else {
            const pl = db.plantas.find(x => x.id === p.plantaId);
            det = `Indiv: ${pl ? pl.nombre : p.plantaId} (x${p.cant})`;
        }
        return `<tr><td>${p.cliente}</td><td>${p.tipo}</td><td>${det}<br><small>[${p.bandeja}]</small></td><td><button class="btn btn-info" onclick="editPlan(${p.id})">E</button> <button class="btn btn-danger" onclick="borrar('planes',${p.id})">X</button></td></tr>`;
    }).join('');

    document.querySelector('#table-plantas tbody').innerHTML = (db.plantas || []).length === 0 ? `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #999;">No hay plantas registradas</td></tr>` : (db.plantas || []).map(p => `<tr><td>${p.id}</td><td>${p.nombre}</td><td>${p.remojo}h / ${p.oscuro}d</td><td>${p.total}d</td><td>${p.precio}€</td><td><button class="btn btn-info" onclick="editPlanta('${p.id}')">E</button><button class="btn btn-danger" onclick="borrar('plantas','${p.id}')">X</button></td></tr>`).join('');
    renderClientesTable(db.clientes || []);
    document.querySelector('#table-visitas tbody').innerHTML = (db.visitas || []).length === 0 ? `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #999;">No hay visitas registradas</td></tr>` : (db.visitas || []).map(v => `<tr><td>${v.cliente}</td><td>${v.fecha}</td><td>${v.motivo}</td><td><button class="btn btn-danger" onclick="borrar('visitas',${v.id})">X</button></td></tr>`).join('');

    renderLotesTable(db.lotes || []);

    const lotesOpt = (db.lotes || []).map(l => `<option value="${l.codigo}">${l.codigo} - ${l.plantaNombre} (${l.cliente})</option>`).reverse().join('');
    document.getElementById('cosecha-lote').innerHTML = lotesOpt;
    document.getElementById('stat-clientes').innerText = (db.clientes || []).length;
    document.getElementById('stat-planes').innerText = (db.planes || []).length;
    document.getElementById('stat-lotes').innerText = (db.lotes || []).length;

    updateDiasInfo();
    generateTasks();
    renderVisitsCal();
    renderNotas(db.notas || []);
    renderAlmacenSemillas();
    renderAlmacenInsumos();
}

// --- ALMACÉN FUNCIONES ---
function renderAlmacenSemillas() {
    const tbody = document.getElementById('tbody-almacen-semillas');
    if (!tbody) return;

    // Sort plants by stock
    const sorted = [...(db.plantas || [])].sort((a, b) => (a.stockKg || 0) - (b.stockKg || 0));

    tbody.innerHTML = sorted.length === 0 ? `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #999;">No hay plantas registradas</td></tr>` : sorted.map(p => {
        const stock = p.stockKg || 0;
        const min = p.stockMin || 1.0;
        const lowStock = stock < min;
        const badge = lowStock ? `<span style="background:var(--danger);color:white;padding:3px 8px;border-radius:12px;font-size:0.8rem;font-weight:bold;">¡BAJO!</span>` : `<span style="background:var(--primary);color:white;padding:3px 8px;border-radius:12px;font-size:0.8rem;">OK</span>`;
        return `<tr style="${lowStock ? 'background-color:#fff5f5;' : ''}">
                    <td><strong>${p.id}</strong></td>
                    <td>${p.nombre}</td>
                    <td style="font-weight:bold; color:${lowStock ? 'var(--danger)' : 'var(--text)'};">${stock.toFixed(2)} Kg</td>
                    <td>${badge}</td>
                </tr>`;
    }).join('');
}

function addStockSemilla() {
    const id = document.getElementById('stock-semilla-id').value;
    const kilos = parseFloat(document.getElementById('stock-semilla-cant').value) || 0;
    if (kilos > 0) {
        const idx = db.plantas.findIndex(x => x.id === id);
        if (idx > -1) {
            db.plantas[idx].stockKg = (db.plantas[idx].stockKg || 0) + kilos;
            save('plantas');
            alert(`Añadidos ${kilos} Kg al stock de ${db.plantas[idx].nombre}`);
            document.getElementById('stock-semilla-cant').value = '1';
        }
    }
}

function renderAlmacenInsumos() {
    const tbody = document.getElementById('tbody-almacen-insumos');
    if (!tbody) return;

    tbody.innerHTML = (db.inventario || []).length === 0 ? `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #999;">No hay otros insumos registrados</td></tr>` : (db.inventario || []).map(i => {
        return `<tr>
                    <td>${i.nombre}</td>
                    <td style="font-weight:bold;">${parseFloat(i.cant).toFixed(1)}</td>
                    <td>${i.unidad}</td>
                    <td>
                        <button class="btn btn-info" onclick="editInsumo(${i.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger" onclick="borrar('inventario',${i.id})">X</button>
                    </td>
                </tr>`;
    }).join('');
}

function addInsumo() {
    const hiddenId = document.getElementById('insumo-id').value;
    const nombre = document.getElementById('insumo-nombre').value;
    const cant = parseFloat(document.getElementById('insumo-cant').value) || 0;
    const unidad = document.getElementById('insumo-unidad').value;

    if (nombre.trim() !== '') {
        if (!db.inventario) db.inventario = [];
        if (hiddenId) {
            const idx = db.inventario.findIndex(x => x.id == hiddenId);
            if (idx > -1) {
                db.inventario[idx] = { id: Number(hiddenId), nombre: nombre, cant: cant, unidad: unidad };
            }
        } else {
            db.inventario.push({ id: Date.now(), nombre: nombre, cant: cant, unidad: unidad });
        }

        // reset
        document.getElementById('insumo-id').value = '';
        document.getElementById('insumo-nombre').value = '';
        document.getElementById('insumo-cant').value = '0';
        save('inventario');
    }
}

function editInsumo(id) {
    const ins = (db.inventario || []).find(x => x.id === id);
    if (ins) {
        document.getElementById('insumo-id').value = ins.id;
        document.getElementById('insumo-nombre').value = ins.nombre;
        document.getElementById('insumo-cant').value = ins.cant;
        document.getElementById('insumo-unidad').value = ins.unidad;

        document.getElementById('insumo-nombre').focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
// --- FIN ALMACÉN FUNCIONES ---

// CÁLCULO DE FECHA LÍMITE PARA MIX
function calcMixLeadTime() {
    const fechaInput = document.getElementById('plan-fecha-entrega');
    const infoBox = document.getElementById('mix-lead-info');

    let maxDias = 0;
    document.querySelectorAll('.mix-row').forEach(r => {
        const chk = r.querySelector('.mix-chk');
        const qty = r.querySelector('.mix-qty');
        if (chk.checked && parseInt(qty.value) > 0) {
            const plt = db.plantas.find(x => x.id === chk.value);
            if (plt && plt.total > maxDias) maxDias = plt.total;
        }
    });

    if (maxDias > 0) {
        const hoy = new Date();
        const entrega = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + maxDias);

        // Formatear para input type="date" (YYYY-MM-DD)
        const dd = String(entrega.getDate()).padStart(2, '0');
        const mm = String(entrega.getMonth() + 1).padStart(2, '0'); // Enero es 0
        const yyyy = entrega.getFullYear();
        fechaInput.value = `${yyyy}-${mm}-${dd}`;

        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        infoBox.innerHTML = `✅ Fecha óptima de entrega: <strong>${entrega.toLocaleDateString('es-ES', opciones)}</strong>.<br><small style="color:#666;">Las siembras se escalonarán para estar listas ese mismo día.</small>`;
    } else {
        fechaInput.value = "";
        infoBox.innerText = "Selecciona plantas y cantidades para calcular la fecha de entrega.";
    }
}

function updateDiasInfo() {
    const pltId = document.getElementById('plan-planta').value;
    const plt = (db.plantas || []).find(x => x.id === pltId);
    const infoSpan = document.getElementById('plan-dias-info');
    if (plt && infoSpan) {
        infoSpan.innerText = `Ciclo total de siembra a cosecha: ${plt.total} días`;
        validateLeadTime();
    }
}

function validateLeadTime() {
    const dateVal = document.getElementById('plan-fecha').value;
    const pltId = document.getElementById('plan-planta').value;
    const alertBox = document.getElementById('date-alert');
    if (!dateVal || !pltId) return;
    const plt = db.plantas.find(x => x.id === pltId);
    const entrega = new Date(dateVal);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const siembraNecesaria = new Date(entrega);
    siembraNecesaria.setDate(siembraNecesaria.getDate() - plt.total);
    if (siembraNecesaria < hoy) alertBox.style.display = "block"; else alertBox.style.display = "none";
}

function generateTasks() {
    const body = document.getElementById('calendar-body'); if (!body) return;
    body.innerHTML = ''; const tasks = [];
    (db.planes || []).forEach(plan => {
        for (let i = 0; i < 4; i++) {
            if (plan.tipo === 'INDIVIDUAL') {
                const plt = db.plantas.find(x => x.id === plan.plantaId); if (!plt) return;
                let entrega = new Date(plan.fecha);
                entrega.setDate(entrega.getDate() + (i * plan.frec));
                let s = new Date(entrega);
                s.setDate(s.getDate() - plt.total);
                crearHitos(tasks, s, plt, plan.cant, plan);
            } else {
                // En MIX, la cosecha es exactamente plan.fechaEntrega
                let entrega = new Date(plan.fechaEntrega);
                entrega.setDate(entrega.getDate() + (i * plan.frec));
                plan.detalleMix.forEach(item => {
                    const plt = db.plantas.find(x => x.id === item.id); if (!plt) return;
                    // Se calcula hacia atras desde la fecha global de entrega de este plan
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
        fecha: new Date(f),
        tipo: t,
        msg: m,
        cli: plan.cliente,
        tid: `${t}-${plan.id}-${f.getTime()}`,
        pltNombre: plt.nombre,
        pltId: plt.id,
        fStr: fStr,
        cant: cant,
        bandeja: plan.bandeja
    });

    if (plt.remojo > 0) {
        let r = new Date(s); r.setDate(r.getDate() - 1);
        add(r, 'remojo', `<i class="fas fa-tint"></i> REMOJAR ${plt.nombre}`);
    }

    const area = B_AREAS[plan.bandeja] || 1250;
    const grPorBandeja = (plt.gramos * (area / 1250)).toFixed(1);
    const grTotales = (grPorBandeja * cant).toFixed(1);
    const msgSiembra = `<i class="fas fa-seedling"></i> SEMBRAR ${plt.nombre} (x${cant}) - [${plan.bandeja}] - ${grTotales}g total`;

    add(s, 'siembra', msgSiembra);

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
        // REVERSE STOCK DEDUCTION
        if (tipo === 'siembra' && pltId) {
            const pltIdx = db.plantas.findIndex(x => x.id === pltId);
            if (pltIdx > -1) {
                const plt = db.plantas[pltIdx];
                const area = B_AREAS[bandeja] || 1250;
                const grPorBandeja = plt.gramos * (area / 1250);
                const kgTotales = (grPorBandeja * cant) / 1000;
                db.plantas[pltIdx].stockKg = (plt.stockKg || 0) + kgTotales;
                if (!saveKeys.includes('plantas')) saveKeys.push('plantas');
            }
        }
    } else {
        db.completadas.push(id);
        if (tipo === 'siembra') {
            generarLoteAutomatico(pltId, pltNombre, cliente, fecha, cant, bandeja);
            if (!saveKeys.includes('lotes')) saveKeys.push('lotes');
            if (!saveKeys.includes('ultimoCorrelativo')) saveKeys.push('ultimoCorrelativo');

            // DEDUCT STOCK
            if (pltId) {
                const pltIdx = db.plantas.findIndex(x => x.id === pltId);
                if (pltIdx > -1) {
                    const plt = db.plantas[pltIdx];
                    const area = B_AREAS[bandeja] || 1250;
                    const grPorBandeja = plt.gramos * (area / 1250);
                    const kgTotales = (grPorBandeja * cant) / 1000;
                    db.plantas[pltIdx].stockKg = Math.max(0, (plt.stockKg || 0) - kgTotales);

                    const min = plt.stockMin || 1.0;
                    if (db.plantas[pltIdx].stockKg < min) {
                        alert(`¡Atención! El stock de semillas de ${pltNombre} ha bajado de ${min}Kg. Quedan ${db.plantas[pltIdx].stockKg.toFixed(2)} Kg.`);
                    }
                    if (!saveKeys.includes('plantas')) saveKeys.push('plantas');
                }
            }
        }
    }
    save(saveKeys);
}

function generarLoteAutomatico(pltId, pltNombre, cliente, fecha, cant, bandeja) {
    if (!db.ultimoCorrelativo) db.ultimoCorrelativo = 0;
    db.ultimoCorrelativo++;

    const cod = pltId + fecha.replace(/-/g, '').slice(2) + "-" + db.ultimoCorrelativo;

    if (!db.lotes) db.lotes = [];
    db.lotes.push({
        id: Date.now(),
        codigo: cod,
        plantaNombre: pltNombre,
        cliente: cliente,
        cant: cant,
        fecha: fecha
    });

    // MODIFICACIÓN: SE ELIMINÓ LA LÍNEA DE CANTIDAD DE LA ETIQUETA
    const labelHtml = `
                <strong>CLIENTE:</strong> ${cliente.toUpperCase()}<br>
                <strong>PRODUCTO:</strong> ${pltNombre.toUpperCase()}<br>
                <strong>FECHA SIEMBRA:</strong> ${fecha}<br>
                <strong>LOTE:</strong> ${cod}<br>
                <strong>BANDEJA:</strong> ${bandeja}
            `;
    document.getElementById('label-text').innerHTML = labelHtml;
    document.getElementById('modal-etiqueta').style.display = 'flex';
}

function copyLabel() {
    const text = document.getElementById('label-text').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Etiqueta copiada al portapapeles");
    });
}

function closeLabel() {
    document.getElementById('modal-etiqueta').style.display = 'none';
}

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const items = document.querySelectorAll('.nav-item');
    items.forEach(item => { if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(`showSection('${id}')`)) item.classList.add('active'); });
    document.getElementById(id).classList.add('active');
    if (id === 'visitas') renderVisitsCal();
}
function toggleCalendar() { document.getElementById('calendar-body').classList.toggle('show'); }
function togglePlanModo(m) { document.getElementById('panel-individual').style.display = m === 'individual' ? 'block' : 'none'; document.getElementById('panel-mix').style.display = m === 'mix' ? 'block' : 'none'; }

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
        p.stockMin = p.stockMin;
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

function renderClientesTable(data) { document.getElementById('tbody-clientes').innerHTML = data.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #999;">No hay clientes registrados</td></tr>` : data.map(c => `<tr><td>${c.nombreComercial || c.nombre}</td><td>${c.nif || '-'}</td><td>${c.cobro || '-'}</td><td>${c.tel || '-'}</td><td><button class="btn btn-info" onclick="editCliente(${c.id})">E</button><button class="btn btn-danger" onclick="borrar('clientes',${c.id})">X</button></td></tr>`).join(''); }

function addCliente() {
    const n_com = document.getElementById('cli-nombre-comercial').value;
    const n = document.getElementById('cli-nombre').value;
    const nif = document.getElementById('cli-nif').value;
    const dir = document.getElementById('cli-dir').value;
    const cp = document.getElementById('cli-cp').value;
    const pob = document.getElementById('cli-pob').value;
    const prov = document.getElementById('cli-prov').value;
    const pais = document.getElementById('cli-pais').value;
    const email = document.getElementById('cli-email').value;
    const tel = document.getElementById('cli-tel').value;
    const cobro = document.getElementById('cli-cobro').value;
    const hiddenId = document.getElementById('cli-id').value;

    if (n_com || n) {
        if (!db.clientes) db.clientes = [];
        if (hiddenId) {
            const idx = db.clientes.findIndex(x => x.id == hiddenId);
            if (idx > -1) {
                db.clientes[idx] = {
                    id: Number(hiddenId), nombreComercial: n_com, nombre: n, nif: nif, dir: dir,
                    cp: cp, pob: pob, prov: prov, pais: pais, email: email, tel: tel, cobro: cobro
                };
            }
        } else {
            db.clientes.push({ id: Date.now(), nombreComercial: n_com, nombre: n, nif: nif, dir: dir, cp: cp, pob: pob, prov: prov, pais: pais, email: email, tel: tel, cobro: cobro });
        }

        // reset
        document.getElementById('cli-nombre-comercial').value = '';
        document.getElementById('cli-nombre').value = '';
        document.getElementById('cli-nif').value = '';
        document.getElementById('cli-dir').value = '';
        document.getElementById('cli-cp').value = '';
        document.getElementById('cli-pob').value = '';
        document.getElementById('cli-prov').value = '';
        document.getElementById('cli-pais').value = 'España';
        document.getElementById('cli-email').value = '';
        document.getElementById('cli-tel').value = '';
        document.getElementById('cli-id').value = '';
        save('clientes');
    }
}

function editCliente(id) {
    const c = db.clientes.find(x => x.id == id);
    if (c) {
        document.getElementById('cli-id').value = c.id;
        document.getElementById('cli-nombre-comercial').value = c.nombreComercial || '';
        document.getElementById('cli-nombre').value = c.nombre || '';
        document.getElementById('cli-nif').value = c.nif || '';
        document.getElementById('cli-dir').value = c.dir || '';
        document.getElementById('cli-cp').value = c.cp || '';
        document.getElementById('cli-pob').value = c.pob || '';
        document.getElementById('cli-prov').value = c.prov || '';
        document.getElementById('cli-pais').value = c.pais || '';
        document.getElementById('cli-email').value = c.email || '';
        document.getElementById('cli-tel').value = c.tel || '';
        if (c.cobro) document.getElementById('cli-cobro').value = c.cobro;

        showSection('clientes');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function addPlan() {
    const editId = document.getElementById('plan-id-edicion').value;
    const pltId = document.getElementById('plan-planta').value;
    const cant = parseInt(document.getElementById('plan-cant-ind').value);
    const bandeja = document.getElementById('plan-tipo-bandeja').value;

    const p = {
        id: editId ? Number(editId) : Date.now(),
        tipo: 'INDIVIDUAL',
        cliente: document.getElementById('plan-cliente').value,
        plantaId: pltId,
        bandeja: bandeja,
        cant: cant,
        frec: parseInt(document.getElementById('plan-frec').value),
        fecha: document.getElementById('plan-fecha').value
    };

    // STOCK VALIDATION
    if (!editId && pltId) {
        const pltObj = db.plantas.find(x => x.id === pltId);
        if (pltObj) {
            const area = B_AREAS[bandeja] || 1250;
            const grPorBandeja = pltObj.gramos * (area / 1250);
            const kgTotales = (grPorBandeja * cant) / 1000;
            if ((pltObj.stockKg || 0) < kgTotales) {
                if (!confirm(`⚠️ ATENCIÓN: No tienes stock suficiente de ${pltObj.nombre}.\nNecesitas ${kgTotales.toFixed(2)} Kg por siembra y te quedan ${(pltObj.stockKg || 0).toFixed(2)} Kg.\n\n¿Deseas guardar el Plan de todas formas?`)) return;
            }
        }
    }

    if (p.fecha) {
        if (!db.planes) db.planes = [];
        if (editId) {
            const idx = db.planes.findIndex(x => x.id == editId);
            if (idx > -1) db.planes[idx] = p;
        } else {
            db.planes.push(p);
        }
        document.getElementById('plan-id-edicion').value = '';
        document.getElementById('btn-save-plan').innerText = 'Guardar Individual';
        save('planes');
    }
}

function editPlan(id) {
    const p = db.planes.find(x => x.id == id);
    if (p && p.tipo === 'INDIVIDUAL') {
        togglePlanModo('individual');
        document.getElementById('plan-id-edicion').value = p.id;
        document.getElementById('plan-cliente').value = p.cliente;
        document.getElementById('plan-planta').value = p.plantaId;
        document.getElementById('plan-tipo-bandeja').value = p.bandeja;
        document.getElementById('plan-cant-ind').value = p.cant;
        document.getElementById('plan-frec').value = p.frec;
        document.getElementById('plan-fecha').value = p.fecha;
        document.getElementById('btn-save-plan').innerText = 'Actualizar Plan';
        updateDiasInfo();
        showSection('planes');
    } else {
        alert("La edición de planes MIX aún no está disponible.");
    }
}
function addPlanMix() {
    let sel = [];
    let stockWarnings = [];
    const bandeja = document.getElementById('plan-tipo-bandeja').value;

    document.querySelectorAll('.mix-row').forEach(r => {
        const chk = r.querySelector('.mix-chk');
        const qty = r.querySelector('.mix-qty');

        if (chk.checked && parseInt(qty.value) > 0) {
            const cant = parseInt(qty.value);
            const pltId = chk.value;
            sel.push({ id: pltId, cant: cant });

            // STOCK VALIDATION
            const pltObj = db.plantas.find(x => x.id === pltId);
            if (pltObj) {
                const area = B_AREAS[bandeja] || 1250;
                const grPorBandeja = pltObj.gramos * (area / 1250);
                const kgTotales = (grPorBandeja * cant) / 1000;
                if ((pltObj.stockKg || 0) < kgTotales) {
                    stockWarnings.push(`- ${pltObj.nombre}: Necesitas ${kgTotales.toFixed(2)} Kg (Quedan ${(pltObj.stockKg || 0).toFixed(2)} Kg)`);
                }
            }
        }
    });

    if (stockWarnings.length > 0) {
        if (!confirm(`⚠️ ATENCIÓN: Stock bajo para las siguientes plantas de este Mix:\n` + stockWarnings.join("\n") + `\n\n¿Deseas guardar el Plan Mix de todas formas?`)) return;
    }

    const p = { id: Date.now(), tipo: 'MIX', cliente: document.getElementById('plan-cliente').value, detalleMix: sel, bandeja: bandeja, frec: parseInt(document.getElementById('plan-frec').value), fechaEntrega: document.getElementById('plan-fecha-entrega').value };
    if (sel.length > 0) {
        if (!db.planes) db.planes = [];
        db.planes.push(p);
        save('planes');
        togglePlanModo('individual');
    }
}
function addLoteManual() {
    const pltId = document.getElementById('lote-planta').value; const pltObj = db.plantas.find(x => x.id === pltId);
    if (!db.ultimoCorrelativo) db.ultimoCorrelativo = 0; db.ultimoCorrelativo++;
    const cod = pltId + document.getElementById('lote-fecha').value.replace(/-/g, '').slice(2) + "-" + db.ultimoCorrelativo;
    if (!db.lotes) db.lotes = []; db.lotes.push({ id: Date.now(), codigo: cod, plantaNombre: pltObj.nombre, cliente: document.getElementById('lote-cliente').value, cant: document.getElementById('lote-cant').value, fecha: document.getElementById('lote-fecha').value });
    save(['lotes', 'ultimoCorrelativo']);
}
function generarEtiquetaCosecha() {
    const loteCod = document.getElementById('cosecha-lote').value;
    const fCosecha = document.getElementById('cosecha-fecha').value;
    if (!loteCod || !fCosecha) { alert("Introduzca todos los datos"); return; }

    const l = db.lotes.find(x => x.codigo === loteCod);
    if (!l) return;

    document.getElementById('lbl-cliente-box').innerHTML = `<strong>CLIENTE:</strong> ${l.cliente.toUpperCase()}`;
    document.getElementById('lbl-prod-box').innerHTML = `<strong>PRODUCTO:</strong> ${l.plantaNombre.toUpperCase()}`;
    document.getElementById('lbl-lote-box').innerHTML = `<strong>LOTE:</strong> ${l.codigo}`;
    document.getElementById('lbl-siembra-box').innerHTML = `<strong>FECHA SIEMBRA:</strong> ${l.fecha}`;
    document.getElementById('lbl-cosecha-box').innerHTML = `-> FECHA COSECHA: ${fCosecha} <-`;

    document.getElementById('card-etiqueta-print').style.display = 'block';
}

function descargarPNG() {
    html2canvas(document.getElementById('label-cosecha-box'), { useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Etiqueta_${document.getElementById('cosecha-lote').value}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
}

function renderLotesTable(data) { document.getElementById('tbody-lotes').innerHTML = data.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #999;">No hay lotes registrados</td></tr>` : data.map(l => `<tr><td>${l.codigo}</td><td>${l.plantaNombre}</td><td>${l.cliente}</td><td>${l.cant}</td><td>${l.fecha}</td><td><button class="btn btn-danger" onclick="borrar('lotes',${l.id})">X</button></td></tr>`).join(''); }
function addVisita() { if (!db.visitas) db.visitas = []; db.visitas.push({ id: Date.now(), cliente: document.getElementById('visita-cliente').value, fecha: document.getElementById('visita-fecha').value, hora: document.getElementById('visita-hora').value, motivo: document.getElementById('visita-motivo').value }); save('visitas'); }
function renderVisitsCal() {
    const grid = document.getElementById('visitas-grid'); if (!grid) return; grid.innerHTML = '';
    document.getElementById('cal-title').innerText = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(curMonth).toUpperCase();
    const totalDays = new Date(curMonth.getFullYear(), curMonth.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
        const f = `${curMonth.getFullYear()}-${String(curMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const tags = (db.visitas || []).filter(v => v.fecha === f).map(v => `<div class="visit-tag">${v.cliente}</div>`).join('');
        grid.innerHTML += `<div class="calendar-day"><span class="day-num">${d}</span>${tags}</div>`;
    }
}
function changeMonth(d) { curMonth.setMonth(curMonth.getMonth() + d); renderVisitsCal(); }
function toggleVisitsView(v) { document.getElementById('visitas-lista').style.display = v === 'lista' ? 'block' : 'none'; document.getElementById('visitas-calendario').style.display = v === 'calendario' ? 'block' : 'none'; }
function runCalc() { const p = db.plantas.find(x => x.id === document.getElementById('calc-planta').value); if (!p) return; const g = (p.gramos * (parseFloat(document.getElementById('calc-bandeja').value) / 1250)).toFixed(1); const coste = ((g / 1000) * (p.precio || 0)).toFixed(2); document.getElementById('calc-res').innerHTML = `<strong>${g}g</strong> / <span style="color:var(--primary)">Coste: ${coste}€</span>`; }
function filterLotes() { const q = document.getElementById('search-lote-cliente').value.toLowerCase(); renderLotesTable(db.lotes.filter(l => l.cliente.toLowerCase().includes(q) || l.codigo.toLowerCase().includes(q))); }
function filterClientes() { const q = document.getElementById('search-cliente').value.toLowerCase(); renderClientesTable(db.clientes.filter(c => (c.nombreComercial && c.nombreComercial.toLowerCase().includes(q)) || (c.nombre && c.nombre.toLowerCase().includes(q)) || (c.nif && c.nif.toLowerCase().includes(q)))); }
function borrar(k, id) { if (confirm("¿Borrar?")) { db[k] = db[k].filter(x => x.id != id); save(k); } }
function exportData() { const blob = new Blob([JSON.stringify(db)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `isla_db.json`; a.click(); }
function clearData() { if (confirm("¿BORRAR TODO?")) { db = { clientes: [], plantas: [], planes: [], lotes: [], completadas: [], visitas: [], notas: [], ultimoCorrelativo: 0 }; save(); } }
window.onload = initApp;

function addNota() {
    const texto = document.getElementById('nota-texto').value.trim();
    const fechaInput = document.getElementById('nota-fecha').value;
    if (!texto) return;
    if (!db.notas) db.notas = [];

    let fechaDisplay = new Date().toLocaleDateString('es-ES'); // Por defecto la de creación
    if (fechaInput) {
        // Formato DD/MM/YYYY
        const p = fechaInput.split('-');
        if (p.length === 3) fechaDisplay = `📅 Para: ${p[2]}/${p[1]}/${p[0]}`;
    }

    db.notas.push({
        id: Date.now(),
        texto: texto,
        fecha: fechaDisplay
    });

    document.getElementById('nota-texto').value = '';
    document.getElementById('nota-fecha').value = '';
    save('notas');
}

function renderNotas(data) {
    const grid = document.getElementById('notas-grid');
    if (!grid) return;
    grid.innerHTML = (data || []).slice().reverse().map(n => `
        <div class="post-it">
            <div class="post-it-text">${n.texto}</div>
            <div>
                <button class="btn-delete" onclick="borrar('notas', ${n.id})" title="Eliminar nota"><i class="fas fa-trash"></i></button>
                <span class="post-it-date">${n.fecha || ''}</span>
            </div>
        </div>
    `).join('');
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}
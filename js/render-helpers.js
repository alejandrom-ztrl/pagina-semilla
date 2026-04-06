// RENDERING HELPERS MODULE
function refresh() {
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
    document.getElementById('fl-cliente').innerHTML = cliOpt;
    document.getElementById('plan-planta').innerHTML = pltOpt;
    document.getElementById('lote-planta').innerHTML = pltOpt;
    document.getElementById('lote-cliente').innerHTML = cliOpt;
    document.getElementById('calc-planta').innerHTML = pltOpt;
    document.getElementById('stock-semilla-id').innerHTML = pltOpt;
    
    // Lista de clientes para input sugerido en Cosechas
    const dlCosecha = document.getElementById('dl-clientes-cosecha');
    if (dlCosecha) dlCosecha.innerHTML = cliOpt;

    const frescas = CAT_FLORES.filter(f => f.t === 'F').map(f => `<option value="${f.nom}">${f.nom} [${f.det}]</option>`).join('');
    const deshi = CAT_FLORES.filter(f => f.t === 'D').map(f => `<option value="${f.nom}">${f.nom} [${f.det}]</option>`).join('');

    document.getElementById('fl-producto').innerHTML = `
        <optgroup label="🌸 FLORES FRESCAS">${frescas}</optgroup>
        <optgroup label="🌼 FLORES DESHIDRATADAS">${deshi}</optgroup>
    `;

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

    renderPlanesTable();
    renderPlantasTable();
    renderClientesTable(db.clientes || []);
    renderVisitasTable();
    renderLotesTable(db.lotes || []);

    const lotesOpt = (db.lotes || []).map(l => `<option value="${l.codigo}">${l.codigo} - ${l.plantaNombre} (${l.cliente})</option>`).reverse().join('');
    const dlLoteCosecha = document.getElementById('dl-lotes-cosecha');
    if (dlLoteCosecha) dlLoteCosecha.innerHTML = lotesOpt;
    document.getElementById('stat-clientes').innerText = (db.clientes || []).length;
    document.getElementById('stat-planes').innerText = (db.planes || []).length;
    document.getElementById('stat-lotes').innerText = (db.lotes || []).length;

    updateDiasInfo();
    generateTasks();
    renderVisitsCal();
    renderNotas(db.notas || []);
    renderAlmacenSemillas();
    renderAlmacenInsumos();
    renderFloresTable(db.pedidosFlores || []);
}

function renderPlanesTable() {
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
}

function renderPlantasTable() {
    document.querySelector('#table-plantas tbody').innerHTML = (db.plantas || []).length === 0 ? `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #999;">No hay plantas registradas</td></tr>` : (db.plantas || []).map(p => `<tr><td>${p.id}</td><td>${p.nombre}</td><td>${p.remojo}h / ${p.oscuro}d</td><td>${p.total}d</td><td>${p.precio}€</td><td><button class="btn btn-info" onclick="editPlanta('${p.id}')">E</button><button class="btn btn-danger" onclick="borrar('plantas','${p.id}')">X</button></td></tr>`).join('');
}

function renderClientesTable(data) {
    document.getElementById('tbody-clientes').innerHTML = data.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #999;">No hay clientes registrados</td></tr>` : data.map(c => `<tr><td>${c.nombreComercial || c.nombre}</td><td>${c.nif || '-'}</td><td>${c.cobro || '-'}</td><td>${c.tel || '-'}</td><td><button class="btn btn-info" onclick="editCliente(${c.id})">E</button><button class="btn btn-danger" onclick="borrar('clientes',${c.id})">X</button></td></tr>`).join('');
}

function renderVisitasTable() {
    document.querySelector('#table-visitas tbody').innerHTML = (db.visitas || []).length === 0 ? `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #999;">No hay visitas registradas</td></tr>` : (db.visitas || []).map(v => `<tr><td>${v.cliente}</td><td>${v.fecha}</td><td>${v.hora || '-'}</td><td>${v.motivo}</td><td><button class="btn btn-info" onclick="editVisita(${v.id})">E</button> <button class="btn btn-danger" onclick="borrar('visitas',${v.id})">X</button></td></tr>`).join('');
}

function renderLotesTable(data) {
    document.getElementById('tbody-lotes').innerHTML = data.length === 0
        ? `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #999;">No hay lotes registrados</td></tr>`
        : data.map(l => {
            const distTags = (l.distribucion || []).map(d => `<span class="dist-tag">${d}</span>`).join('');
            return `<tr>
                <td>${l.codigo}</td>
                <td>${l.plantaNombre}</td>
                <td>
                    <div style="font-weight:600;">${l.cliente}</div>
                    <div class="dist-container">${distTags}</div>
                </td>
                <td>${l.cant}</td>
                <td>${l.fecha}</td>
                <td><button class="btn btn-danger" onclick="borrar('lotes',${l.id})">X</button></td>
            </tr>`;
        }).join('');
}

function renderAlmacenSemillas() {
    const toggle = document.getElementById('stock-auto-toggle');
    if (toggle) {
        toggle.checked = !db.config || db.config.restarStockAuto !== false;
    }
    const tbody = document.getElementById('tbody-almacen-semillas');
    if (!tbody) return;
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

function renderFloresTable(data) {
    const tbody = document.getElementById('tbody-flores');
    if (!tbody) return;
    tbody.innerHTML = data.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #999;">No hay pedidos de flores</td></tr>` : data.map(f => `
        <tr>
            <td><strong>${f.cliente}</strong></td>
            <td>${f.producto}</td>
            <td>${f.frecuencia}</td>
            <td>${f.cant}</td>
            <td><button class="btn btn-danger" onclick="borrar('pedidosFlores', ${f.id})">X</button></td>
        </tr>
    `).join('');
}

function renderResumenSemanal() {
    const container = document.getElementById('resumen-semanal-content');
    if (!container) return;
    
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const en21dias = new Date(hoy);
    en21dias.setDate(en21dias.getDate() + 21);

    const salidasPorDia = {};
    const salidasListas = []; // Lotes con fecha de cosecha <= hoy
    const completadas = db.completadas || [];

    // 1. Salidas programadas por Planes (Previsión futura)
    (db.planes || []).forEach(plan => {
        const iter = plan.puntual ? 1 : 4; // Check up to 4 deliveries
        for (let i = 0; i < iter; i++) {
            if (plan.tipo === 'INDIVIDUAL') {
                const plt = db.plantas.find(x => x.id === plan.plantaId); if (!plt) continue;
                let entrega = parseDateLocal(plan.fecha);
                entrega.setHours(0,0,0,0);
                entrega.setDate(entrega.getDate() + (i * plan.frec));
                
                let s = new Date(entrega);
                s.setDate(s.getDate() - plt.total);
                s.setHours(0,0,0,0);
                const tid = `siembra-${plan.id}-${s.getTime()}`;
                if (completadas.includes(tid)) continue;
                
                if (entrega >= hoy && entrega <= en21dias) {
                    const dStr = entrega.toISOString().split('T')[0];
                    if(!salidasPorDia[dStr]) salidasPorDia[dStr] = [];
                    salidasPorDia[dStr].push({ planta: plt.nombre, cant: parseInt(plan.cant), cliente: plan.cliente, isPlan: true });
                }
            } else {
                let entrega = parseDateLocal(plan.fechaEntrega);
                entrega.setHours(0,0,0,0);
                entrega.setDate(entrega.getDate() + (i * plan.frec));
                if (entrega >= hoy && entrega <= en21dias) {
                    const dStr = entrega.toISOString().split('T')[0];
                    if(!salidasPorDia[dStr]) salidasPorDia[dStr] = [];
                    plan.detalleMix.forEach(item => {
                        const plt = db.plantas.find(x => x.id === item.id); if (!plt) return;
                        let s = new Date(entrega);
                        s.setDate(s.getDate() - plt.total);
                        const tid = `siembra-${plan.id}-${s.getTime()}`;
                        if (completadas.includes(tid)) return;
                        salidasPorDia[dStr].push({ planta: plt.nombre, cant: parseInt(item.cant), cliente: plan.cliente, isPlan: true });
                    });
                }
            }
        }
    });

    // 2. Salidas físicas reales por Lotes sembrados
    (db.lotes || []).forEach(lote => {
        const plt = db.plantas.find(x => x.nombre === lote.plantaNombre);
        if (plt) {
            let siembra = parseDateLocal(lote.fecha);
            let cosecha = new Date(siembra);
            cosecha.setDate(cosecha.getDate() + plt.total);
            cosecha.setHours(0,0,0,0);

            if (cosecha <= hoy) {
                // YA ESTÁ LISTA (Cosechada o para hoy)
                salidasListas.push({ id: lote.id, planta: lote.plantaNombre, cant: parseInt(lote.cant), cliente: lote.cliente, fechaCosecha: cosecha, isLote: true });
            } else if (cosecha <= en21dias) {
                // FUTURA (Próximos días)
                const dStr = cosecha.toISOString().split('T')[0];
                if(!salidasPorDia[dStr]) salidasPorDia[dStr] = [];
                salidasPorDia[dStr].push({ id: lote.id, planta: lote.plantaNombre, cant: parseInt(lote.cant), cliente: lote.cliente, isLote: true });
            }
        }
    });

    let html = ``;

    // --- SECCIÓN: BANDEJAS LISTAS (Cosechadas) ---
    html += `<div class="card" style="border-left: 5px solid var(--primary); margin-bottom: 30px;">
        <h3 style="color:var(--primary); margin-top:0;"><i class="fas fa-check-circle"></i> ✅ BANDEJAS LISTAS (Cosechadas)</h3>
        <p style="font-size:0.85rem; color:#666;">Bandejas que ya han cumplido su tiempo de cultivo y están preparadas para salir.</p>`;
    
    if (salidasListas.length === 0) {
        html += `<p style="padding:10px; color:#999; text-align:center;">No hay bandejas listas actualmente.</p>`;
    } else {
        html += `<ul style="list-style:none; padding:0; margin-top:10px;">`;
        salidasListas.forEach(i => {
            const btnRestar = `<button class="btn-micro-minus" onclick="restarBandejaID(${i.id})" title="Restar 1 bandeja"> -1 </button>`;
            const btnSumar = `<button class="btn-micro-plus" onclick="sumarBandejaID(${i.id})" title="Sumar 1 bandeja"> +1 </button>`;
            html += `<li style="padding:10px; border-bottom:1px dashed #e0e0e0; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span style="font-weight:bold; color:var(--primary);">🥬 ${i.planta}</span> 
                            <span style="margin-left:10px; color:#666;">(${i.cliente})</span>
                        </div>
                        <div style="font-weight:bold; font-size:1.1rem;">
                            ${i.cant} ud ${btnRestar} ${btnSumar}
                        </div>
                    </li>`;
        });
        html += `</ul>`;
    }
    html += `</div>`;

    // --- SECCIÓN: PRÓXIMAS SALIDAS (Agenda Futura) ---
    html += `<div class="card" style="margin-bottom: 30px;">
        <h3 style="color:var(--info); margin-top:0;"><i class="fas fa-calendar-alt"></i> 📅 PRÓXIMAS SALIDAS (Previsión 3 Semanas)</h3>
        <p style="font-size:0.85rem; color:#666;">Agenda de lo que se cosechará en los próximos días.</p>`;

    const fechasOrds = Object.keys(salidasPorDia).sort();
    if (fechasOrds.length === 0) {
        html += `<p style="padding:15px; font-weight:bold; color:#777; text-align:center;">No hay salidas programadas a corto plazo.</p>`;
    } else {
        fechasOrds.forEach(f => {
            const fechaObj = new Date(f);
            const fechaStr = fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase();
            const resumenDia = {};
            salidasPorDia[f].forEach(item => {
                if(!resumenDia[item.planta]) resumenDia[item.planta] = [];
                resumenDia[item.planta].push(item);
            });

            html += `<h4 style="margin-top:15px; border-bottom:1px solid var(--border); padding-bottom:3px; color:var(--text); font-size:1rem;">📅 ${fechaStr}</h4>
            <ul style="list-style:none; padding:0; margin-top:5px;">`;
            for(const [planta, items] of Object.entries(resumenDia)) {
                let col = items.map(i => {
                    const btnRestar = i.isLote ? `<button class="btn-micro-minus" onclick="restarBandejaID(${i.id})" title="Restar 1 bandeja"> -1 </button>` : '';
                    const btnSumar = i.isLote ? `<button class="btn-micro-plus" onclick="sumarBandejaID(${i.id})" title="Sumar 1 bandeja"> +1 </button>` : '';
                    return `<strong>${i.cant}</strong> ud ${btnRestar}${btnSumar} &rarr; <em>${i.cliente}</em> ${i.isLote ? '<small style="color:orange">[Lote]</small>' : ''}`;
                });
                html += `<li style="padding:5px 0; font-size:0.9rem;">
                            <span style="font-weight:bold; color:var(--info);">🥬 ${planta}:</span> ${col.join(' | ')}
                        </li>`;
            }
            html += `</ul>`;
        });
    }
    html += `</div>`;

    // --- NUEVA SECCIÓN: PREVISIÓN POR CLIENTE (3 Semanas) ---
    html += `<div class="card" style="margin-bottom: 30px; border-left: 5px solid var(--purple);">
        <h3 style="color:var(--purple); margin-top:0;"><i class="fas fa-users"></i> 🧑‍🍳 PREVISIÓN POR CLIENTE (3 Semanas)</h3>
        <p style="font-size:0.85rem; color:#666;">Bandejas programadas para cada cliente desglosadas por semana (Semana 1 incluye bandejas ya listas).</p>`;

    const resumenClientes = {}; // { cliente: { sem1: { planta: cant }, sem2: {}, sem3: {} } }
    
    function addACliente(cliente, planta, cant, diffDays) {
        if (!resumenClientes[cliente]) {
            resumenClientes[cliente] = { sem1: {}, sem2: {}, sem3: {} };
        }
        let sem;
        if (diffDays < 7) sem = 'sem1';
        else if (diffDays < 14) sem = 'sem2';
        else if (diffDays <= 21) sem = 'sem3';
        else return;

        if (!resumenClientes[cliente][sem][planta]) resumenClientes[cliente][sem][planta] = 0;
        resumenClientes[cliente][sem][planta] += cant;
    }

    // Sumamos lo que ya está listo a la SEMANA 1 (offset 0)
    salidasListas.forEach(item => {
        addACliente(item.cliente, item.planta, item.cant, 0);
    });

    // Sumamos la previsión de los próximos 21 días
    Object.keys(salidasPorDia).forEach(dStr => {
        const fechaObj = new Date(dStr);
        const diffDays = Math.round((fechaObj - hoy) / 86400000); 
        
        salidasPorDia[dStr].forEach(item => {
            addACliente(item.cliente, item.planta, item.cant, diffDays);
        });
    });

    const clientesOrds = Object.keys(resumenClientes).sort();
    if (clientesOrds.length === 0) {
        html += `<p style="padding:15px; font-weight:bold; color:#777; text-align:center;">No hay salidas programadas para clientes en las próximas semanas.</p>`;
    } else {
        html += `<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:15px; margin-top:15px;">`;
        clientesOrds.forEach(cli => {
            html += `<div style="background:#f9f9f9; border:1px solid #ddd; border-radius:8px; padding:15px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                        <h4 style="margin:0 0 15px 0; color:var(--text); font-size:1.2rem; border-bottom:2px solid #ccc; padding-bottom:5px;"><i class="fas fa-utensils"></i> ${cli}</h4>`;
            
            const renderSemana = (semKey, tituloSema) => {
                const plantasObj = resumenClientes[cli][semKey];
                if (Object.keys(plantasObj).length === 0) return '';
                
                let res = `<div style="margin-bottom: 12px; border-left: 3px solid var(--info); padding-left: 10px; background:#fff; padding-top:5px; padding-bottom:5px; border-radius:0 4px 4px 0;">
                              <h5 style="margin:0 0 5px 0; color:var(--info); font-size:0.95rem;">${tituloSema}</h5>
                              <ul style="list-style:none; padding:0; margin:0;">`;
                let totalSem = 0;
                for (const [planta, cant] of Object.entries(plantasObj)) {
                    totalSem += cant;
                    res += `<li style="display:flex; justify-content:space-between; margin-bottom:3px; font-size:0.9rem;">
                                <span>🥬 ${planta}</span>
                                <strong style="color:var(--text);">${cant} ud</strong>
                             </li>`;
                }
                res += `<li style="display:flex; justify-content:space-between; border-top:1px dashed #ccc; padding-top:3px; margin-top:3px; font-size:0.95rem;">
                            <strong>Total Semana:</strong>
                            <strong style="color:var(--primary-dark);">${totalSem} ud</strong>
                        </li></ul></div>`;
                return res;
            };

            const htmlSem1 = renderSemana('sem1', 'Semana 1 (Esta semana)');
            const htmlSem2 = renderSemana('sem2', 'Semana 2 (Próxima semana)');
            const htmlSem3 = renderSemana('sem3', 'Semana 3 (En 2 semanas)');

            if (!htmlSem1 && !htmlSem2 && !htmlSem3) {
                 html += `<p style="font-size:0.9rem; color:#777; font-style:italic;">Sin pedidos programados</p>`;
            } else {
                 html += htmlSem1 + htmlSem2 + htmlSem3;
            }

            html += `</div>`;
        });
        html += `</div>`;
    }
    html += `</div>`;

    // --- SECCIÓN: STOCK FÍSICO TOTAL (Interactiva) ---
    const stockDeBandejas = {};
    (db.lotes || []).forEach(l => {
        if (!stockDeBandejas[l.plantaNombre]) stockDeBandejas[l.plantaNombre] = 0;
        stockDeBandejas[l.plantaNombre] += parseInt(l.cant);
    });

    html += `<div class="card" style="background:#f0f4f8;">
        <h3 style="color:var(--primary-dark); margin-top:0;"><i class="fas fa-boxes"></i> 📦 STOCK FÍSICO TOTAL (Bandejas actuales)</h3>
        <p style="font-size:0.85rem; color:#666;">Bandejas totales que hay en la sala. Puedes restar desde aquí del lote más antiguo.</p>
        <div class="grid-dashboard" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); margin-top:15px;">`;
    
    const sortedStocks = Object.entries(stockDeBandejas).sort((a,b) => b[1] - a[1]);
    if (sortedStocks.length === 0) {
        html += `<p style="grid-column: 1/-1; text-align:center; color:#999; padding:20px;">No hay unidades en stock.</p>`;
    } else {
        sortedStocks.forEach(([planta, cant]) => {
            html += `<div class="card stat-card" style="padding:15px; background:#fff; border:1px solid #c8d6e5; position:relative;">
                <h4 style="margin:0; font-size:0.85rem; color:var(--text);">${planta}</h4>
                <p style="margin:5px 0 0; font-size:1.8rem; color:var(--primary);">${cant}</p>
                <div style="position:absolute; top:10px; right:12px; display:flex; gap:4px;">
                    <button class="btn-micro-minus" style="margin:0;" onclick="restarBandejaPorPlanta('${planta}')">-1</button>
                    <button class="btn-micro-plus" style="margin:0;" onclick="sumarBandejaPorPlanta('${planta}')">+1</button>
                </div>
            </div>`;
        });
    }
    html += `</div></div>`;

    container.innerHTML = html;
}

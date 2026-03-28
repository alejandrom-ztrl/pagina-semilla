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
    const en10dias = new Date(hoy);
    en10dias.setDate(en10dias.getDate() + 10);

    const salidasPorDia = {};
    const completadas = db.completadas || [];

    // Salidas programadas por Planes (solo si NO se ha sembrado aún)
    (db.planes || []).forEach(plan => {
        const iter = plan.puntual ? 1 : 4;
        for (let i = 0; i < iter; i++) {
            if (plan.tipo === 'INDIVIDUAL') {
                const plt = db.plantas.find(x => x.id === plan.plantaId); if (!plt) continue;
                let entrega = new Date(plan.fecha);
                entrega.setDate(entrega.getDate() + (i * plan.frec));
                
                let s = new Date(entrega);
                s.setDate(s.getDate() - plt.total);
                const tid = `siembra-${plan.id}-${s.getTime()}`;
                
                // Si la siembra está completada, ya existe como LOTE REAl (db.lotes), no duplicar.
                if (completadas.includes(tid)) continue;
                
                if (entrega >= hoy && entrega <= en10dias) {
                    const dStr = entrega.toISOString().split('T')[0];
                    if(!salidasPorDia[dStr]) salidasPorDia[dStr] = [];
                    salidasPorDia[dStr].push({ planta: plt.nombre, cant: parseInt(plan.cant), cliente: plan.cliente, isPlan: true });
                }
            } else {
                let entrega = new Date(plan.fechaEntrega);
                entrega.setDate(entrega.getDate() + (i * plan.frec));
                
                if (entrega >= hoy && entrega <= en10dias) {
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

    // Salidas físicas reales por Lotes sembrados
    (db.lotes || []).forEach(lote => {
        const plt = db.plantas.find(x => x.nombre === lote.plantaNombre);
        if (plt) {
            let siembra = new Date(lote.fecha);
            let cosecha = new Date(siembra);
            cosecha.setDate(cosecha.getDate() + plt.total);
            if (cosecha >= hoy && cosecha <= en10dias) {
                const dStr = cosecha.toISOString().split('T')[0];
                if(!salidasPorDia[dStr]) salidasPorDia[dStr] = [];
                salidasPorDia[dStr].push({ planta: lote.plantaNombre, cant: parseInt(lote.cant), cliente: lote.cliente, isLote: true });
            }
        }
    });

    let html = `<div class="card">
        <h3 style="color:var(--primary);"><i class="fas fa-truck"></i> Próximas Salidas (10 días)</h3>
        <p style="font-size:0.9rem; color:#666;">Bandejas listas para salir (cosecha) en los próximos 10 días por agenda o lote.</p>`;

    const fechasOrds = Object.keys(salidasPorDia).sort();
    if (fechasOrds.length === 0) {
        html += `<p style="padding:15px; font-weight:bold; color:#777; text-align:center;">No hay salidas estimadas en los próximos 10 días.</p>`;
    } else {
        fechasOrds.forEach(f => {
            const fechaObj = new Date(f);
            const fechaStr = fechaObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase();
            
            const resumenDia = {};
            salidasPorDia[f].forEach(item => {
                if(!resumenDia[item.planta]) resumenDia[item.planta] = [];
                resumenDia[item.planta].push(item);
            });

            html += `<h4 style="margin-top:20px; border-bottom:2px solid var(--border); padding-bottom:5px; color:var(--text); font-size:1.2rem;">📅 ${fechaStr}</h4>
            <ul style="list-style:none; padding:0; margin-top:10px;">`;
            
            for(const [planta, items] of Object.entries(resumenDia)) {
                let col = items.map(i => {
                    const btnRestar = i.isLote ? `<button class="btn-micro-minus" onclick="restarBandejaLoteByData('${planta}', '${i.cliente}', ${i.cant})" title="Restar 1 bandeja de este lote"> -1 </button>` : '';
                    return `<strong>${i.cant}</strong> ud ${btnRestar} &rarr; <em>${i.cliente}</em> ${i.isLote ? '<small style="color:orange">[Del Lote]</small>' : ''}`;
                });
                let totalDiaPlanta = items.reduce((sum, i) => sum + i.cant, 0);
                html += `<li style="padding:10px 0; border-bottom:1px dashed #e0e0e0;">
                            <div style="font-weight:bold; color:var(--primary); font-size:1.1rem; margin-bottom:5px;">🥬 ${planta} (Total: ${totalDiaPlanta})</div>
                            <div style="font-size:0.9rem; color:var(--text-light); margin-left:15px; line-height:1.6;">• ${col.join('<br>• ')}</div>
                        </li>`;
            }
            html += `</ul>`;
        });
    }

    // NUEVA SECCIÓN: STOCK FÍSICO TOTAL (Todas las bandejas en cultivo/listas)
    const stockDeBandejas = {};
    (db.lotes || []).forEach(l => {
        if (!stockDeBandejas[l.plantaNombre]) stockDeBandejas[l.plantaNombre] = 0;
        stockDeBandejas[l.plantaNombre] += parseInt(l.cant);
    });

    html += `<div style="margin-top:40px; border-top: 3px solid var(--primary); padding-top:20px;">
        <h3 style="color:var(--primary-dark);"><i class="fas fa-boxes"></i> 📦 STOCK FÍSICO TOTAL (Bandejas en curso)</h3>
        <p style="font-size:0.85rem; color:#666;">Bandejas totales que tienes físicamente en la sala en este momento.</p>
        <div class="grid-dashboard" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin-top:15px;">`;
    
    const sortedStocks = Object.entries(stockDeBandejas).sort((a,b) => b[1] - a[1]);
    if (sortedStocks.length === 0) {
        html += `<p style="grid-column: 1/-1; text-align:center; color:#999; padding:20px;">No hay bandejas en stock actualmente.</p>`;
    } else {
        sortedStocks.forEach(([planta, cant]) => {
            html += `<div class="card stat-card" style="padding:15px; background:#f9fbff; border:1px solid #e1e7f0;">
                <h4 style="margin:0; font-size:0.9rem; color:var(--text);">${planta}</h4>
                <p style="margin:5px 0 0; font-size:1.8rem; color:var(--primary);">${cant}</p>
                <small style="color:#888;">bandejas</small>
            </div>`;
        });
    }
    html += `</div></div></div>`;

    container.innerHTML = html;
}

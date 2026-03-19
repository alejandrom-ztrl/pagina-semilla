// EXTENSIONS & UTILITIES MODULE
async function hashString(str) {
    const buffer = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkLogin() {
    const pwd = document.getElementById('login-pwd').value;
    const hashedInput = await hashString(pwd);
    if (hashedInput === "33cf990007d36b063ef5a6a26b15798147235f8e1d40db87466998dd3d12535b") {
        sessionStorage.setItem('isla_auth', 'true');
        document.getElementById('login-overlay').style.display = 'none';
    } else {
        document.getElementById('login-err').style.display = 'block';
    }
}

function globalSearch() {
    const q = document.getElementById('global-search').value.toLowerCase();
    const res = document.getElementById('search-results');
    if (q.length < 2) { res.style.display = 'none'; return; }
    let matches = [];
    (db.clientes || []).forEach(c => {
        if ((c.nombreComercial && c.nombreComercial.toLowerCase().includes(q)) || (c.nombre && c.nombre.toLowerCase().includes(q))) {
            matches.push({ title: c.nombreComercial || c.nombre, sub: `Cliente: ${c.nif || '-'}`, section: 'clientes', id: c.id });
        }
    });
    (db.lotes || []).forEach(l => {
        if (l.codigo.toLowerCase().includes(q) || l.plantaNombre.toLowerCase().includes(q)) {
            matches.push({ title: l.codigo, sub: `Lote: ${l.plantaNombre} (${l.cliente})`, section: 'lotes', id: l.codigo });
        }
    });
    (db.plantas || []).forEach(p => {
        if (p.nombre.toLowerCase().includes(q)) {
            matches.push({ title: p.nombre, sub: `Planta: ${p.id}`, section: 'plantas', id: p.id });
        }
    });
    if (matches.length === 0) { res.innerHTML = '<div style="padding:15px; color:#999;">No hay resultados</div>'; }
    else { res.innerHTML = matches.slice(0, 8).map(m => `<div class="search-item" onclick="goSearch('${m.section}', '${m.id}')"><strong>${m.title}</strong><small style="color:var(--text-light)">${m.sub}</small></div>`).join(''); }
    res.style.display = 'flex';
}

function goSearch(section, id) {
    showSection(section);
    document.getElementById('global-search').value = '';
    document.getElementById('search-results').style.display = 'none';
    if (section === 'clientes') editCliente(id);
    if (section === 'plantas') editPlanta(id);
    if (section === 'lotes') { document.getElementById('search-lote-cliente').value = id; filterLotes(); }
}

function renderStats() {
    const ctxProd = document.getElementById('chart-produccion');
    const ctxRent = document.getElementById('chart-rentabilidad');
    if (!ctxProd || !ctxRent) return;
    if (window.chartProd) window.chartProd.destroy();
    if (window.chartRent) window.chartRent.destroy();
    const labels = []; const dataProd = []; const dataCost = [];
    (db.plantas || []).forEach(p => {
        let totalBandejas = 0;
        (db.planes || []).forEach(pl => {
            if (pl.tipo === 'INDIVIDUAL' && pl.plantaId === p.id) { totalBandejas += parseInt(pl.cant); }
            else if (pl.tipo === 'MIX') { const item = pl.detalleMix.find(i => i.id === p.id); if (item) totalBandejas += parseInt(item.cant); }
        });
        if (totalBandejas > 0) {
            labels.push(p.nombre);
            dataProd.push(totalBandejas * 4);
            dataCost.push((totalBandejas * 4 * (p.gramos / 1000) * (p.precio || 0)).toFixed(2));
        }
    });
    window.chartProd = new Chart(ctxProd, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Producción mensual estimada (Bandejas)', data: dataProd, backgroundColor: 'rgba(27, 160, 96, 0.6)', borderColor: 'rgba(27, 160, 96, 1)', borderWidth: 1 }] }, options: { responsive: true, scales: { y: { beginAtZero: true } } } });
    window.chartRent = new Chart(ctxRent, { type: 'doughnut', data: { labels: labels, datasets: [{ label: 'Inversión en semillas (€/mes)', data: dataCost, backgroundColor: ['#1ba060', '#3498db', '#9b59b6', '#f39c12', '#e74c3c', '#2980b9', '#8e44ad', '#f1c40f'] }] }, options: { responsive: true, plugins: { legend: { position: 'bottom' } } } });
}

function renderPedidoSemillas() {
    const container = document.getElementById('pedido-semillas-content'); if (!container) return;
    container.innerHTML = 'Calculando necesidades...'; const needs = {};
    (db.planes || []).forEach(plan => {
        const iter = plan.puntual ? 1 : 4;
        if (plan.tipo === 'INDIVIDUAL') { const p = db.plantas.find(x => x.id === plan.plantaId); if (!p) return; if (!needs[p.id]) needs[p.id] = 0; needs[p.id] += (parseInt(plan.cant) * iter * (p.gramos / 1000)); }
        else { plan.detalleMix.forEach(item => { const p = db.plantas.find(x => x.id === item.id); if (!p) return; if (!needs[p.id]) needs[p.id] = 0; needs[p.id] += (parseInt(item.cant) * iter * (p.gramos / 1000)); }); }
    });
    let html = '<div class="card"><h3>📦 Resumen de Pedido a 30 días</h3><table style="width:100%; text-align:left;"><thead><tr><th>Planta</th><th>Necesidad (Kg)</th><th>Stock Actual</th><th>Estado</th></tr></thead><tbody>';
    Object.keys(needs).forEach(pid => {
        const p = db.plantas.find(x => x.id === pid);
        const stock = parseFloat(db.inventario ? db.inventario[pid] || 0 : 0);
        const diff = (needs[pid] - stock).toFixed(2);
        const status = stock >= needs[pid] ? '<span style="color:green">✅ Suficiente</span>' : `<span style="color:red">⚠️ Comprar ${diff}Kg</span>`;
        html += `<tr><td>${p ? p.nombre : pid}</td><td>${needs[pid].toFixed(2)} Kg</td><td>${stock.toFixed(2)} Kg</td><td>${status}</td></tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = Object.keys(needs).length === 0 ? '<p>No hay planes activos.</p>' : html;
}

function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert("Tu navegador no soporta notificaciones de escritorio.");
        return;
    }

    if (Notification.permission === 'granted') {
        alert("Las notificaciones ya están activadas. Recibirás avisos al abrir la app.");
        checkNotifications();
        return;
    }

    if (Notification.permission === 'denied') {
        alert("Has bloqueado las notificaciones. Por favor, actívalas en la configuración de tu navegador (clic en el candado junto a la URL).");
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            alert("¡Excelente! Notificaciones activadas.");
            checkNotifications();
        } else {
            alert("Las notificaciones han sido rechazadas.");
        }
    });
}

function checkNotifications() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const hoy = new Date().toISOString().split('T')[0];
    const tasks = [];

    // 1. Tareas de Planes
    (db.planes || []).forEach(plan => {
        const iter = plan.puntual ? 1 : 4;
        for (let i = 0; i < iter; i++) {
            if (plan.tipo === 'INDIVIDUAL') {
                const plt = db.plantas.find(x => x.id === plan.plantaId);
                if (!plt) return;
                let entrega = new Date(plan.fecha);
                entrega.setDate(entrega.getDate() + (i * plan.frec));

                // Siembra
                let s = new Date(entrega); s.setDate(s.getDate() - plt.total);
                if (s.toISOString().split('T')[0] === hoy) tasks.push(`Siembra ${plt.nombre} (${plan.cliente})`);

                // Luz
                let l = new Date(s); l.setDate(l.getDate() + plt.oscuro);
                if (l.toISOString().split('T')[0] === hoy) tasks.push(`Pasar a LUZ ${plt.nombre} (${plan.cliente})`);

                // Cosecha
                if (entrega.toISOString().split('T')[0] === hoy) tasks.push(`Cosecha ${plt.nombre} (${plan.cliente})`);

                // Remojo (si aplica)
                if (plt.remojo > 0) {
                    let r = new Date(s); r.setDate(r.getDate() - 1);
                    if (r.toISOString().split('T')[0] === hoy) tasks.push(`Remojo ${plt.nombre} (${plan.cliente})`);
                }
            } else {
                let entrega = new Date(plan.fechaEntrega);
                entrega.setDate(entrega.getDate() + (i * plan.frec));
                plan.detalleMix.forEach(item => {
                    const plt = db.plantas.find(x => x.id === item.id);
                    if (!plt) return;
                    let s = new Date(entrega); s.setDate(s.getDate() - plt.total);

                    if (s.toISOString().split('T')[0] === hoy) tasks.push(`Siembra ${plt.nombre} (${plan.cliente})`);

                    let l = new Date(s); l.setDate(l.getDate() + (plt.oscuro || 0));
                    if (l.toISOString().split('T')[0] === hoy) tasks.push(`Pasar a LUZ ${plt.nombre} (${plan.cliente})`);

                    if (entrega.toISOString().split('T')[0] === hoy) tasks.push(`Cosecha ${plt.nombre} (${plan.cliente})`);
                });
            }
        }
    });

    // 2. Visitas
    (db.visitas || []).forEach(v => {
        if (v.fecha === hoy) tasks.push(`Visita: ${v.cliente} (${v.hora || ''})`);
    });

    if (tasks.length > 0) {
        new Notification("Tareas de hoy en La Isla", {
            body: `Tienes ${tasks.length} asuntos pendientes: ${tasks.join(", ")}`,
            icon: 'logo.png'
        });
    }
}

window.requestNotificationPermission = requestNotificationPermission;
window.checkNotifications = checkNotifications;
window.globalSearch = globalSearch;
window.goSearch = goSearch;
window.renderStats = renderStats;
window.renderPedidoSemillas = renderPedidoSemillas;

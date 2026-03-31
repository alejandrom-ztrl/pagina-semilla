// OTROS COMPONENTES (NOTAS, FLORES, LOTES, ETC)
function addNota() {
    const texto = document.getElementById('nota-texto').value.trim();
    const fechaInput = document.getElementById('nota-fecha').value;
    if (!texto) return;
    if (!db.notas) db.notas = [];
    let fechaDisplay = new Date().toLocaleDateString('es-ES');
    if (fechaInput) {
        const p = fechaInput.split('-');
        if (p.length === 3) fechaDisplay = `📅 Para: ${p[2]}/${p[1]}/${p[0]}`;
    }
    db.notas.push({ id: Date.now(), texto: texto, fecha: fechaDisplay });
    document.getElementById('nota-texto').value = '';
    document.getElementById('nota-fecha').value = '';
    save('notas');
}

function addPedidoFlor() {
    const p = { id: Date.now(), cliente: document.getElementById('fl-cliente').value, producto: document.getElementById('fl-producto').value, frecuencia: document.getElementById('fl-frecuencia').value, cant: document.getElementById('fl-cant').value };
    if (!db.pedidosFlores) db.pedidosFlores = [];
    db.pedidosFlores.push(p);
    save('pedidosFlores');
}

function generarResumenFlores() {
    const pedidos = db.pedidosFlores || [];
    if (pedidos.length === 0) { alert("No hay pedidos"); return; }
    const resumen = {};
    pedidos.forEach(p => { if (!resumen[p.producto]) resumen[p.producto] = 0; resumen[p.producto] += parseInt(p.cant); });
    let txt = "🌸 PEDIDO DE FLORES - LA ISLA 🌸\n---------------------------------\n";
    for (const prod in resumen) { txt += `• ${prod}: ${resumen[prod]} bandejas\n`; }
    txt += "---------------------------------\nResumen generado: " + new Date().toLocaleDateString();
    document.getElementById('resumen-flores-text').innerText = txt;
    document.getElementById('modal-resumen-flores').style.display = 'flex';
}

function copyResumenFlores() {
    navigator.clipboard.writeText(document.getElementById('resumen-flores-text').innerText).then(() => alert("Copiado"));
}

function closeResumenFlores() { document.getElementById('modal-resumen-flores').style.display = 'none'; }

function closeLabel() { document.getElementById('modal-etiqueta').style.display = 'none'; }

function copyLabel() { navigator.clipboard.writeText(document.getElementById('label-text').innerText).then(() => alert("Copiado")); }

function addLoteManual() {
    const pltId = document.getElementById('lote-planta').value; 
    const pltObj = db.plantas.find(x => x.id === pltId);
    let fechaInput = document.getElementById('lote-fecha').value;
    
    // Si es hoy y tarde, sugerir cambio o aplicar regla 14:00 si el usuario no cambió el default?
    // Por ahora, si es manual, respetamos lo que el usuario ponga, pero el input date suele ser hoy por defecto.
    
    if (!db.ultimoCorrelativo) db.ultimoCorrelativo = 0; db.ultimoCorrelativo++;
    const cod = pltId + fechaInput.replace(/-/g, '').slice(2) + "-" + db.ultimoCorrelativo;
    if (!db.lotes) db.lotes = []; 
    db.lotes.push({ id: Date.now(), codigo: cod, plantaNombre: pltObj.nombre, cliente: document.getElementById('lote-cliente').value, cant: document.getElementById('lote-cant').value, fecha: fechaInput });
    save(['lotes', 'ultimoCorrelativo']);
}

function generarLoteAutomatico(pltId, pltNombre, cliente, fecha, cant, bandeja) {
    const hoyStr = new Date().toISOString().split('T')[0];
    let fechaFinal = fecha;

    // REGLA 14:00: Si se siembra hoy a partir de las 14:00, cuenta como mañana
    if (fecha === hoyStr) {
        fechaFinal = getAdjustedDate();
        if (fechaFinal !== hoyStr) {
            showToast("Siembra después de las 14:00: Registrada con fecha de mañana.", "info");
        }
    }

    if (!db.ultimoCorrelativo) db.ultimoCorrelativo = 0; db.ultimoCorrelativo++;
    const cod = pltId + fechaFinal.replace(/-/g, '').slice(2) + "-" + db.ultimoCorrelativo;
    if (!db.lotes) db.lotes = [];
    db.lotes.push({ id: Date.now(), codigo: cod, plantaNombre: pltNombre, cliente: cliente, cant: cant, fecha: fechaFinal });
    
    document.getElementById('label-text').innerHTML = `<strong>CLIENTE:</strong> ${cliente.toUpperCase()}<br><strong>PRODUCTO:</strong> ${pltNombre.toUpperCase()}<br><strong>FECHA:</strong> ${fechaFinal}<br><strong>LOTE:</strong> ${cod}<br><strong>BANDEJA:</strong> ${bandeja}`;
    document.getElementById('modal-etiqueta').style.display = 'flex';
}

function borrar(k, id) { if (confirm("¿Borrar?")) { db[k] = db[k].filter(x => x.id != id); save(k); } }

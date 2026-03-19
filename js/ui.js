// UI & NAVIGATION MODULE
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const items = document.querySelectorAll('.nav-item');
    items.forEach(item => { if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(`showSection('${id}')`)) item.classList.add('active'); });

    // Estado activo en navegación móvil
    document.querySelectorAll('.nav-item-mobile').forEach(n => n.classList.remove('active'));
    const mobileTab = document.getElementById(`mob-nav-${id}`);
    if (mobileTab) mobileTab.classList.add('active');

    document.getElementById(id).classList.add('active');
    if (id === 'visitas') renderVisitsCal();
    if (id === 'calc') runCalc();
    if (id === 'cosechas') updateCosechaCliente();
    if (id === 'resumen-semanal') renderResumenSemanal();
    if (id === 'stats') renderStats();
    if (id === 'pedido-semillas') renderPedidoSemillas();

    const overlay = document.getElementById('more-menu-overlay');
    if (overlay) overlay.style.display = 'none';
}

function toggleMoreMenu() {
    const overlay = document.getElementById('more-menu-overlay');
    if (overlay) {
        overlay.style.display = (overlay.style.display === 'flex') ? 'none' : 'flex';
    }
}

function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById('theme-btn');
    body.classList.toggle('dark-theme');
    const isDark = body.classList.contains('dark-theme');
    localStorage.setItem('isla_theme', isDark ? 'dark' : 'light');
    if (btn) btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function loadTheme() {
    const theme = localStorage.getItem('isla_theme');
    const btn = document.getElementById('theme-btn');
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        if (btn) btn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

window.showSection = showSection;
window.toggleMoreMenu = toggleMoreMenu;
window.toggleTheme = toggleTheme;
window.loadTheme = loadTheme;

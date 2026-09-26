// script.js - Dashboard de Ventilación Mecánica y CNAF
let allData = [];
let filteredData = [];
let chartPacientesMes = null;
let chartSexo = null;
let chartMotivos = null;
let chartEdades = null;
let chartTendenciaPercentiles = null;
let chartBoxplot = null;
let chartProporcionUso = null;

// Orden cronológico de meses
const ORDER_MESES = [
    'JULIO 2025',
    'AGOSTO 2025',
    'SEPTIEMBRE 2025',
    'OCTUBRE 2025',
    'NOVIEMBRE 2025',
    'DICIEMBRE 2025',
    'ENERO 2026',
    'FEBRERO 2026',
    'MARZO 2026',
    'ABRIL 2026',
    'MAYO 2026',
    'JUNIO 2026',
    'JULIO 2026',
    'AGOSTO 2026',
    'SEPTIEMBRE 2026'
];

document.addEventListener('DOMContentLoaded', function() {
    if (typeof data === 'undefined') {
        document.body.innerHTML = '<h1 style="color:red;text-align:center;padding:50px;">❌ Error: No se encontraron datos</h1>';
        return;
    }
    
    allData = data;
    filteredData = [...allData];
    
    populateFilters();
    setupEventListeners();
    updateDashboard();
});

function populateFilters() {
    // Meses (ordenados cronológicamente)
    const meses = [...new Set(allData.map(d => d.mes))].sort((a, b) => {
        return ORDER_MESES.indexOf(a) - ORDER_MESES.indexOf(b);
    });
    const mesContainer = document.getElementById('mesCheckboxes');
    mesContainer.innerHTML = '';
    meses.forEach(mes => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.innerHTML = `
            <input type="checkbox" class="mes-checkbox" value="${mes}" checked>
            <span>${mes}</span>
        `;
        mesContainer.appendChild(label);
    });

    // Sexos
    const sexos = ['MASCULINO', 'FEMENINO', 'Sin datos'];
    const sexoContainer = document.getElementById('sexoCheckboxes');
    sexoContainer.innerHTML = '';
    sexos.forEach(sexo => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.innerHTML = `
            <input type="checkbox" class="sexo-checkbox" value="${sexo}" checked>
            <span>${sexo}</span>
        `;
        sexoContainer.appendChild(label);
    });

    // Motivos
    const motivos = [...new Set(allData.map(d => d.motivo))].sort();
    const motivoContainer = document.getElementById('motivoCheckboxes');
    motivoContainer.innerHTML = '';
    motivos.forEach(motivo => {
        if (motivo === 'Sin datos' || motivo === '') return;
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.innerHTML = `
            <input type="checkbox" class="motivo-checkbox" value="${motivo}" checked>
            <span>${motivo}</span>
        `;
        motivoContainer.appendChild(label);
    });
}

function setupEventListeners() {
    document.querySelectorAll('.mes-checkbox, .sexo-checkbox, .motivo-checkbox').forEach(cb => {
        cb.addEventListener('change', updateDashboard);
    });

    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    document.getElementById('selectAllMeses').addEventListener('click', function() {
        document.querySelectorAll('.mes-checkbox').forEach(cb => cb.checked = true);
        updateDashboard();
    });
    document.getElementById('deselectAllMeses').addEventListener('click', function() {
        document.querySelectorAll('.mes-checkbox').forEach(cb => cb.checked = false);
        updateDashboard();
    });
    
    document.getElementById('selectAllSexos').addEventListener('click', function() {
        document.querySelectorAll('.sexo-checkbox').forEach(cb => cb.checked = true);
        updateDashboard();
    });
    document.getElementById('deselectAllSexos').addEventListener('click', function() {
        document.querySelectorAll('.sexo-checkbox').forEach(cb => cb.checked = false);
        updateDashboard();
    });
    
    document.getElementById('selectAllMotivos').addEventListener('click', function() {
        document.querySelectorAll('.motivo-checkbox').forEach(cb => cb.checked = true);
        updateDashboard();
    });
    document.getElementById('deselectAllMotivos').addEventListener('click', function() {
        document.querySelectorAll('.motivo-checkbox').forEach(cb => cb.checked = false);
        updateDashboard();
    });
}

function getSelectedMeses() {
    return Array.from(document.querySelectorAll('.mes-checkbox:checked')).map(cb => cb.value);
}

function getSelectedSexos() {
    return Array.from(document.querySelectorAll('.sexo-checkbox:checked')).map(cb => cb.value);
}

function getSelectedMotivos() {
    return Array.from(document.querySelectorAll('.motivo-checkbox:checked')).map(cb => cb.value);
}

function updateDashboard() {
    const selectedMeses = getSelectedMeses();
    const selectedSexos = getSelectedSexos();
    const selectedMotivos = getSelectedMotivos();

    filteredData = allData.filter(d => {
        let match = true;
        if (selectedMeses.length > 0) match = match && selectedMeses.includes(d.mes);
        if (selectedSexos.length > 0) match = match && selectedSexos.includes(d.sexo);
        if (selectedMotivos.length > 0) match = match && selectedMotivos.includes(d.motivo);
        return match;
    });

    updateKPIs();
    updateCharts();
    updateTable();
}

// ============================================
// FUNCIÓN PARA CALCULAR PERCENTILES
// ============================================
function calcularPercentiles(values) {
    if (!values || values.length === 0) {
        return { min: 0, p25: 0, p50: 0, p75: 0, max: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    
    const min = sorted[0];
    const max = sorted[n - 1];
    const p25 = sorted[Math.floor(n * 0.25)] || 0;
    const p50 = sorted[Math.floor(n * 0.50)] || 0;
    const p75 = sorted[Math.floor(n * 0.75)] || 0;
    
    return { min, p25, p50, p75, max };
}

// ============================================
// UPDATE KPIs - CON MÉTRICAS PROBABILÍSTICAS
// ============================================
function updateKPIs() {
    const total = filteredData.length;
    
    // Edad (media condicional)
    const edades = filteredData.map(d => d.edad).filter(e => e > 0 && e < 120);
    const edadProm = edades.length > 0 ? Math.round(edades.reduce((a, b) => a + b, 0) / edades.length) : 0;
    
    // === VNI - Métricas probabilísticas ===
    const vniValues = filteredData.filter(d => d.diasVNI > 0).map(d => d.diasVNI);
    const vniStats = calcularPercentiles(vniValues);
    const vniCount = vniValues.length;
    const vniPctMayor7 = total > 0 ? Math.round((filteredData.filter(d => d.diasVNI > 7).length / total) * 100) : 0;
    
    // === CNAF - Métricas probabilísticas ===
    const cnafValues = filteredData.filter(d => d.diasCNAF > 0).map(d => d.diasCNAF);
    const cnafStats = calcularPercentiles(cnafValues);
    const cnafCount = cnafValues.length;
    const cnafPctMayor7 = total > 0 ? Math.round((filteredData.filter(d => d.diasCNAF > 7).length / total) * 100) : 0;
    
    // === Actualizar KPIs ===
    document.getElementById('kpiTotal').textContent = total;
    document.getElementById('kpiEdad').textContent = edadProm + (edades.length > 0 ? ' (n=' + edades.length + ')' : '');
    
    // VNI KPI
    document.getElementById('kpiVNI').innerHTML = `
        <span style="font-size:0.55em;display:block;color:#718096;font-weight:400;line-height:1.4;">
            Mediana: ${vniStats.p50}d | P75: ${vniStats.p75}d | >7d: ${vniPctMayor7}%
        </span>
        <span style="font-size:0.9em;font-weight:600;color:#4299e1;">
            ${vniCount} pacientes
        </span>
        <span style="font-size:0.5em;display:block;color:#a0aec0;font-weight:400;">
            Rango: ${vniStats.min}-${vniStats.max} días
        </span>
    `;
    
    // CNAF KPI
    document.getElementById('kpiCNAF').innerHTML = `
        <span style="font-size:0.55em;display:block;color:#718096;font-weight:400;line-height:1.4;">
            Mediana: ${cnafStats.p50}d | P75: ${cnafStats.p75}d | >7d: ${cnafPctMayor7}%
        </span>
        <span style="font-size:0.9em;font-weight:600;color:#ed8936;">
            ${cnafCount} pacientes
        </span>
        <span style="font-size:0.5em;display:block;color:#a0aec0;font-weight:400;">
            Rango: ${cnafStats.min}-${cnafStats.max} días
        </span>
    `;
    
    const masculino = filteredData.filter(d => d.sexo === 'MASCULINO').length;
    const femenino = filteredData.filter(d => d.sexo === 'FEMENINO').length;
    document.getElementById('kpiMasculino').textContent = masculino;
    document.getElementById('kpiFemenino').textContent = femenino;
}

// ============================================
// UPDATE CHARTS - CON NUEVOS GRÁFICOS
// ============================================
function updateCharts() {
    // Destruir gráficos anteriores
    if (chartPacientesMes) { chartPacientesMes.destroy(); chartPacientesMes = null; }
    if (chartSexo) { chartSexo.destroy(); chartSexo = null; }
    if (chartMotivos) { chartMotivos.destroy(); chartMotivos = null; }
    if (chartEdades) { chartEdades.destroy(); chartEdades = null; }
    if (chartTendenciaPercentiles) { chartTendenciaPercentiles.destroy(); chartTendenciaPercentiles = null; }
    if (chartBoxplot) { chartBoxplot.destroy(); chartBoxplot = null; }
    if (chartProporcionUso) { chartProporcionUso.destroy(); chartProporcionUso = null; }

    // Obtener meses disponibles y ordenarlos cronológicamente
    const mesesDisponibles = [...new Set(filteredData.map(d => d.mes))];
    const meses = ORDER_MESES.filter(m => mesesDisponibles.includes(m));

    // ============================================
    // GRÁFICO 1: Pacientes por Mes
    // ============================================
    const pacientesPorMes = meses.map(mes => filteredData.filter(d => d.mes === mes).length);

    chartPacientesMes = new Chart(document.getElementById('chartPacientesMes'), {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [{
                label: 'N° Pacientes',
                data: pacientesPorMes,
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderColor: '#667eea',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });

    // ============================================
    // GRÁFICO 2: Distribución por Sexo
    // ============================================
    const masculino = filteredData.filter(d => d.sexo === 'MASCULINO').length;
    const femenino = filteredData.filter(d => d.sexo === 'FEMENINO').length;
    const sinDatosSexo = filteredData.filter(d => d.sexo === 'Sin datos').length;

    chartSexo = new Chart(document.getElementById('chartSexo'), {
        type: 'doughnut',
        data: {
            labels: ['MASCULINO', 'FEMENINO', 'Sin datos'],
            datasets: [{
                data: [masculino, femenino, sinDatosSexo],
                backgroundColor: ['#4299e1', '#ed64a6', '#a0aec0'],
                borderWidth: 3,
                borderColor: 'white'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'bottom' } },
            cutout: '55%'
        }
    });

    // ============================================
    // GRÁFICO 3: Motivos de Conexión
    // ============================================
    const motivos = [...new Set(filteredData.map(d => d.motivo))].filter(m => m !== 'Sin datos' && m !== '');
    const motivosCount = motivos.map(m => filteredData.filter(d => d.motivo === m).length);
    const colores = ['#667eea', '#f6ad55', '#68d391', '#fc8181', '#9f7aea', '#ed8936', '#4299e1', '#ed64a6'];

    chartMotivos = new Chart(document.getElementById('chartMotivos'), {
        type: 'bar',
        data: {
            labels: motivos,
            datasets: [{
                label: 'N° Pacientes',
                data: motivosCount,
                backgroundColor: motivosCount.map((_, i) => colores[i % colores.length]),
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { ticks: { maxRotation: 45, minRotation: 30 } }
            }
        }
    });

    // ============================================
    // GRÁFICO 4: Distribución de Edades
    // ============================================
    const edades = filteredData.map(d => d.edad).filter(e => e > 0 && e < 120);
    const bins = [0, 18, 30, 40, 50, 60, 70, 80, 90, 100];
    const labelsEdad = ['0-17', '18-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-100'];
    const counts = bins.slice(0, -1).map((bin, i) => {
        return edades.filter(e => e >= bin && e < bins[i + 1]).length;
    });

    chartEdades = new Chart(document.getElementById('chartEdades'), {
        type: 'bar',
        data: {
            labels: labelsEdad,
            datasets: [{
                label: 'N° Pacientes',
                data: counts,
                backgroundColor: 'rgba(246, 173, 85, 0.7)',
                borderColor: '#f6ad55',
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });

    // ============================================
    // GRÁFICO 5: Tendencia de Percentiles VNI y CNAF
    // ============================================
    const vniP25 = [];
    const vniP50 = [];
    const vniP75 = [];
    const cnafP25 = [];
    const cnafP50 = [];
    const cnafP75 = [];

    meses.forEach(mes => {
        const vniValues = filteredData.filter(d => d.mes === mes && d.diasVNI > 0).map(d => d.diasVNI);
        const cnafValues = filteredData.filter(d => d.mes === mes && d.diasCNAF > 0).map(d => d.diasCNAF);
        
        const vniStats = calcularPercentiles(vniValues);
        const cnafStats = calcularPercentiles(cnafValues);
        
        vniP25.push(vniStats.p25);
        vniP50.push(vniStats.p50);
        vniP75.push(vniStats.p75);
        cnafP25.push(cnafStats.p25);
        cnafP50.push(cnafStats.p50);
        cnafP75.push(cnafStats.p75);
    });

    chartTendenciaPercentiles = new Chart(document.getElementById('chartTendenciaPercentiles'), {
        type: 'line',
        data: {
            labels: meses,
            datasets: [
                // VNI - P25, P50, P75
                {
                    label: 'VNI P25',
                    data: vniP25,
                    borderColor: 'rgba(66, 153, 225, 0.3)',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 2,
                    fill: false
                },
                {
                    label: 'VNI Mediana (P50)',
                    data: vniP50,
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: '#4299e1',
                    fill: false
                },
                {
                    label: 'VNI P75',
                    data: vniP75,
                    borderColor: 'rgba(66, 153, 225, 0.5)',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    borderWidth: 2,
                    borderDash: [3, 3],
                    pointRadius: 3,
                    fill: false
                },
                // CNAF - P25, P50, P75
                {
                    label: 'CNAF P25',
                    data: cnafP25,
                    borderColor: 'rgba(237, 137, 54, 0.3)',
                    backgroundColor: 'rgba(237, 137, 54, 0.1)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 2,
                    fill: false
                },
                {
                    label: 'CNAF Mediana (P50)',
                    data: cnafP50,
                    borderColor: '#ed8936',
                    backgroundColor: 'rgba(237, 137, 54, 0.1)',
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: '#ed8936',
                    fill: false
                },
                {
                    label: 'CNAF P75',
                    data: cnafP75,
                    borderColor: 'rgba(237, 137, 54, 0.5)',
                    backgroundColor: 'rgba(237, 137, 54, 0.1)',
                    borderWidth: 2,
                    borderDash: [3, 3],
                    pointRadius: 3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: { 
                        font: { size: 10 },
                        usePointStyle: true,
                        padding: 10
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'Días', font: { size: 11 } }
                }
            }
        }
    });

    // ============================================
    // GRÁFICO 6: Boxplot Simplificado (Barras con percentiles)
    // ============================================
    const vniBoxplotData = meses.map(mes => {
        const values = filteredData.filter(d => d.mes === mes && d.diasVNI > 0).map(d => d.diasVNI);
        return calcularPercentiles(values);
    });
    
    const cnafBoxplotData = meses.map(mes => {
        const values = filteredData.filter(d => d.mes === mes && d.diasCNAF > 0).map(d => d.diasCNAF);
        return calcularPercentiles(values);
    });

    // Crear datasets para boxplot (barras apiladas para mostrar rangos)
    const boxplotLabels = meses;
    const vniMinData = vniBoxplotData.map(d => d.min);
    const vniP25Data = vniBoxplotData.map(d => d.p25 - d.min);
    const vniP50Data = vniBoxplotData.map(d => d.p50 - d.p25);
    const vniP75Data = vniBoxplotData.map(d => d.p75 - d.p50);
    const vniMaxData = vniBoxplotData.map(d => d.max - d.p75);

    chartBoxplot = new Chart(document.getElementById('chartBoxplot'), {
        type: 'bar',
        data: {
            labels: boxplotLabels,
            datasets: [
                // VNI
                {
                    label: 'VNI - Mínimo',
                    data: vniMinData,
                    backgroundColor: 'rgba(66, 153, 225, 0.3)',
                    borderColor: 'rgba(66, 153, 225, 0.5)',
                    borderWidth: 1,
                    borderRadius: 0
                },
                {
                    label: 'VNI - P25',
                    data: vniP25Data,
                    backgroundColor: 'rgba(66, 153, 225, 0.5)',
                    borderColor: 'rgba(66, 153, 225, 0.7)',
                    borderWidth: 1,
                    borderRadius: 0
                },
                {
                    label: 'VNI - Mediana',
                    data: vniP50Data,
                    backgroundColor: 'rgba(66, 153, 225, 0.8)',
                    borderColor: '#4299e1',
                    borderWidth: 2,
                    borderRadius: 0
                },
                {
                    label: 'VNI - P75',
                    data: vniP75Data,
                    backgroundColor: 'rgba(66, 153, 225, 0.5)',
                    borderColor: 'rgba(66, 153, 225, 0.7)',
                    borderWidth: 1,
                    borderRadius: 0
                },
                {
                    label: 'VNI - Máximo',
                    data: vniMaxData,
                    backgroundColor: 'rgba(66, 153, 225, 0.3)',
                    borderColor: 'rgba(66, 153, 225, 0.5)',
                    borderWidth: 1,
                    borderRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: { font: { size: 9 }, usePointStyle: true, padding: 8 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            const stats = vniBoxplotData[index];
                            if (context.dataset.label.includes('Mínimo')) {
                                return 'Mínimo: ' + stats.min;
                            } else if (context.dataset.label.includes('P25')) {
                                return 'P25: ' + stats.p25;
                            } else if (context.dataset.label.includes('Mediana')) {
                                return 'Mediana: ' + stats.p50;
                            } else if (context.dataset.label.includes('P75')) {
                                return 'P75: ' + stats.p75;
                            } else if (context.dataset.label.includes('Máximo')) {
                                return 'Máximo: ' + stats.max;
                            }
                            return context.dataset.label + ': ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                x: { 
                    stacked: true,
                    ticks: { maxRotation: 45, minRotation: 30, font: { size: 8 } }
                },
                y: { 
                    stacked: true,
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'Días', font: { size: 11 } }
                }
            }
        }
    });

    // ============================================
    // GRÁFICO 7: Proporción de uso VNI y CNAF
    // ============================================
    const vniUso = filteredData.filter(d => d.diasVNI > 0).length;
    const vniNoUso = filteredData.filter(d => d.diasVNI === 0).length;
    const cnafUso = filteredData.filter(d => d.diasCNAF > 0).length;
    const cnafNoUso = filteredData.filter(d => d.diasCNAF === 0).length;

    chartProporcionUso = new Chart(document.getElementById('chartProporcionUso'), {
        type: 'bar',
        data: {
            labels: ['VNI', 'CNAF'],
            datasets: [
                {
                    label: 'Usaron dispositivo',
                    data: [vniUso, cnafUso],
                    backgroundColor: ['rgba(66, 153, 225, 0.8)', 'rgba(237, 137, 54, 0.8)'],
                    borderRadius: 4
                },
                {
                    label: 'No usaron dispositivo',
                    data: [vniNoUso, cnafNoUso],
                    backgroundColor: ['rgba(66, 153, 225, 0.2)', 'rgba(237, 137, 54, 0.2)'],
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: { usePointStyle: true, padding: 15 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.datasetIndex === 0 
                                ? (context.dataIndex === 0 ? vniUso + vniNoUso : cnafUso + cnafNoUso)
                                : (context.dataIndex === 0 ? vniUso + vniNoUso : cnafUso + cnafNoUso);
                            const pct = total > 0 ? Math.round((context.parsed.y / total) * 100) : 0;
                            return context.dataset.label + ': ' + context.parsed.y + ' (' + pct + '%)';
                        }
                    }
                }
            },
            scales: {
                x: { stacked: true },
                y: { 
                    stacked: true,
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'N° Pacientes', font: { size: 11 } }
                }
            }
        }
    });
}

// ============================================
// UPDATE TABLE
// ============================================
function updateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#a0aec0;">📭 No hay datos para los filtros seleccionados</td></tr>';
        return;
    }

    // Ordenar por mes (cronológico) y luego por edad
    const sortedData = [...filteredData].sort((a, b) => {
        const mesA = ORDER_MESES.indexOf(a.mes);
        const mesB = ORDER_MESES.indexOf(b.mes);
        if (mesA !== mesB) return mesA - mesB;
        return a.edad - b.edad;
    });

    sortedData.slice(0, 100).forEach(d => {
        const tr = document.createElement('tr');
        const mesShort = d.mes.split(' ')[0].toLowerCase();
        tr.innerHTML = `
            <td><span class="badge badge-${mesShort}">${d.mes}</span></td>
            <td>${d.edad}</td>
            <td>${d.sexo}</td>
            <td>${d.motivo}</td>
            <td>${d.diasVNI}</td>
            <td>${d.diasCNAF}</td>
        `;
        tbody.appendChild(tr);
    });
}

function resetFilters() {
    document.querySelectorAll('.mes-checkbox, .sexo-checkbox, .motivo-checkbox').forEach(cb => cb.checked = true);
    updateDashboard();
}

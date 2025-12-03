let currentWiMode = 'manual';
let mainChart = null;

// Configuración Chart.js
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#6b7280';
Chart.defaults.scale.grid.color = '#f3f4f6';

const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('input', calculateAll);
});

document.getElementById('tab-manual').addEventListener('click', () => setWiMode('manual'));
document.getElementById('tab-calc').addEventListener('click', () => setWiMode('calc'));

// Inicializar
calculateAll();

function setWiMode(mode) {
    currentWiMode = mode;
    
    // Cambiar estilo de pestañas
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + mode).classList.add('active');

    // Ocultar/Mostrar contenedores
    document.getElementById('mode-manual').classList.add('hidden');
    document.getElementById('mode-calc').classList.add('hidden');
    
    // Quitar la clase hidden SOLO del modo seleccionado
    document.getElementById('mode-' + mode).classList.remove('hidden');

    calculateAll();
}

function calculateAll() {
    let v = parseFloat(document.getElementById('v').value) || 18;
    let D = parseFloat(document.getElementById('d').value) || 1;
    
    let Wi, F80;

    // Lógica 100% independiente por pestaña
    if (currentWiMode === 'manual') {
        // Pestaña Manual: Lee Wi manual y F80 manual
        Wi = parseFloat(document.getElementById('wi-manual').value);
        F80 = parseFloat(document.getElementById('f80-manual').value);
    } else {
        // Pestaña Bond: Lee inputs de Bond y F80 de Bond
        let W = parseFloat(document.getElementById('bond-w').value);
        let P80_bond = parseFloat(document.getElementById('bond-p80').value);
        // Aquí tomamos el F80 de la pestaña de cálculo
        F80 = parseFloat(document.getElementById('f80-calc').value);

        if (W > 0 && P80_bond > 0 && F80 > 0 && F80 > P80_bond) {
            let term = (1 / Math.sqrt(P80_bond)) - (1 / Math.sqrt(F80));
            Wi = W / (10 * term);
            document.getElementById('wi-calculated-result').value = Wi.toFixed(2);
        } else {
            Wi = 0;
            document.getElementById('wi-calculated-result').value = "-";
        }
    }

    if (!Wi || Wi <= 0 || !F80 || F80 <= 0) return;

    let numerator = 6.3 * Math.pow(F80, 0.29) * Math.pow(Wi, 0.4);
    let denominator = Math.pow((v * D), 0.25);
    let db_mm = numerator / denominator;
    let db_in = db_mm / 25.4;

    document.getElementById('db-theoretical').innerText = db_in.toFixed(2);
    document.getElementById('db-theoretical-mm').innerText = `${db_mm.toFixed(1)} mm`;

    let db_real = parseFloat(document.getElementById('db-real').value) || 0;
    updateStatus(db_in, db_real);

    updateChart(F80, Wi, v, D, db_real);
}

function updateStatus(teorico, real) {
    if (real === 0) return;
    
    let diff = ((real - teorico) / teorico) * 100;
    let msg = "";
    let color = "#ccc";

    if (Math.abs(diff) < 5) {
        msg = "Eficiencia Óptima: El tamaño real es ideal.";
        color = "#10b981";
    } else if (diff > 0) {
        msg = `Sobredimensionado: +${diff.toFixed(1)}% del ideal.`;
        color = "#f59e0b";
    } else {
        msg = `Subdimensionado: -${Math.abs(diff).toFixed(1)}% del ideal.`;
        color = "#ef4444";
    }

    document.getElementById('efficiency-msg').innerText = msg;
    document.getElementById('status-dot').style.backgroundColor = color;
}

function updateChart(currentF80, Wi, v, D, realDb) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    let labels = [];
    let dataTheo = [];
    
    let start = currentF80 * 0.5;
    let end = currentF80 * 1.5;
    let step = (end - start) / 10;

    for (let x = start; x <= end; x += step) {
        let num = 6.3 * Math.pow(x, 0.29) * Math.pow(Wi, 0.4);
        let den = Math.pow((v * D), 0.25);
        let y_in = (num / den) / 25.4;
        labels.push(x.toFixed(0));
        dataTheo.push(y_in);
    }

    if (mainChart) mainChart.destroy();

    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Curva Teórica',
                    data: dataTheo,
                    borderColor: '#111827',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.4,
                    borderDash: [5, 5]
                },
                {
                    label: 'Real',
                    data: [{x: currentF80, y: realDb}],
                    borderColor: '#2563eb',
                    backgroundColor: '#2563eb',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    type: 'scatter'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: { boxWidth: 10, usePointStyle: true }
                }
            },
            scales: {
                x: { 
                    type: 'linear', 
                    position: 'bottom', 
                    title: { display: true, text: 'F80 (Alimentación)', font: {size: 10} },
                    grid: { display: false }
                },
                y: { 
                    title: { display: false },
                    grid: { borderDash: [2, 4] }
                }
            }
        }
    });
}
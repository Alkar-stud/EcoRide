import { apiUrl } from '../config.js';
import { sendFetchRequest, getToken } from '../../js/script.js';

// Fonction pour charger Chart.js dynamiquement
function loadChartJsIfNeeded(callback) {
  if (window.Chart) {
    callback();
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js';
  script.onload = callback;
  document.head.appendChild(script);
}

// Place tout ton code qui utilise Chart.js dans une fonction
function startAdminStats() {
  const ridesChartCtx = document.getElementById('rides-per-day-chart');
  const creditsChartCtx = document.getElementById('credits-per-day-chart');

  let ridesChart, creditsChart;

  async function fetchStats(limit = 12) {
    try {
      const res = await sendFetchRequest(
        apiUrl + 'ecoride/admin/checkCredits/' + limit,
        getToken()
      );
      if (res?.success && Array.isArray(res.data?.dailyStats)) {
        const labels = res.data.dailyStats.map(item => item.rideDate);
        const ridesData = res.data.dailyStats.map(item => item.nbRides);
        const creditsData = res.data.dailyStats.map(item => item.dailyGain);

        renderRidesChart(labels, ridesData);
        renderCreditsChart(labels, creditsData);
      }
    } catch (e) {
      console.error('Erreur lors du chargement des statistiques', e);
    }
  }

  function renderRidesChart(labels, data) {
    if (ridesChart) ridesChart.destroy();
    ridesChart = new Chart(ridesChartCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Covoiturages',
          data,
          backgroundColor: colorSecondary
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  function renderCreditsChart(labels, data) {
    if (creditsChart) creditsChart.destroy();
    creditsChart = new Chart(creditsChartCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Crédits gagnés',
          data,
          backgroundColor: colorPrimary
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // Lance le chargement au chargement de la page/statistiques
  if (ridesChartCtx && creditsChartCtx) {
    fetchStats();
  }
}

// Charge Chart.js uniquement si on est sur la page admin
if (window.location.pathname === '/ecoride/admin') {
  loadChartJsIfNeeded(startAdminStats);
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const colorPrimary = getCssVar('--color-primary') || 'rgba(54, 162, 235, 0.7)';
const colorSecondary = getCssVar('--color-secondary') || 'rgba(75, 192, 192, 0.7)';
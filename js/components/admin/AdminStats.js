import { apiService } from '../../core/ApiService.js';
import { getToken } from '../../script.js';

export class AdminStats {
    constructor() {
        this.statsPane = document.getElementById('stats-pane');
        this.ridesChart = null;
        this.creditsChart = null;
        this.usersChart = null;
        this.nbMonths = 12; // Valeur par défaut
    }

    async load(nbMonths = 12) {
        this.nbMonths = nbMonths;
        this.injectHtml();
        await this.loadStats(this.nbMonths);
    }

    injectHtml() {
        this.statsPane.innerHTML = `
            <h2>Statistiques</h2>
            <div class="mb-3">
                <label for="nb-months-select" class="form-label">Nombre de mois à afficher :</label>
                <select id="nb-months-select" class="form-select" style="width:auto;display:inline-block;">
                    ${[3, 6, 12, 24].map(m => `<option value="${m}"${m === this.nbMonths ? ' selected' : ''}>${m} mois</option>`).join('')}
                </select>
            </div>
            <div class="row">
                <div class="col-md-6 mb-4">
                    <h5 class="text-center">Nombre de covoiturages par jour</h5>
                    <canvas id="rides-per-day-chart"></canvas>
                </div>
                <div class="col-md-6 mb-4">
                    <h5 class="text-center">Crédits gagnés par jour</h5>
                    <canvas id="credits-per-day-chart"></canvas>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12 mb-4">
                    <h5 class="text-center">Coût des nouveaux utilisateurs par jour</h5>
                    <canvas id="users-cost-per-day-chart"></canvas>
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-md-6">
                    <div id="total-user-cost" class="alert alert-info"></div>
                </div>
                <div class="col-md-6">
                    <div id="total-new-users" class="alert alert-info"></div>
                </div>
            </div>
        `;

        // Listener pour le select
        const select = document.getElementById('nb-months-select');
        if (select) {
            select.value = this.nbMonths;
            select.addEventListener('change', (e) => {
                const val = parseInt(e.target.value, 10);
                this.load(val);
            });
        }
    }

    async loadStats(nbMonths = 12) {
        if (!window.Chart) {
            await this.loadChartJs();
        }

        const colorPrimary = this.getCssVar('--color-primary') || 'rgba(54, 162, 235, 0.7)';
        const colorSecondary = this.getCssVar('--color-secondary') || 'rgba(75, 192, 192, 0.7)';
        const colorTertiary = this.getCssVar('--color-tertiary') || 'rgba(255, 99, 132, 0.7)';

        let stats, userStats, totalUserCost;
        try {
            const response = await apiService.get(`ecoride/admin/checkCredits/${nbMonths}`, getToken());
            const res = await response.json();
            if (res?.success && Array.isArray(res.data?.dailyStats)) {
                stats = res.data.dailyStats;
                userStats = res.data.userStats || [];
                totalUserCost = res.data.totalUserCost || 0;
            } else {
                throw new Error('Aucune donnée reçue');
            }
        } catch (e) {
            this.statsPane.innerHTML += `<div class="alert alert-danger mt-3">Erreur lors du chargement des statistiques.</div>`;
            console.error(e);
            return;
        }

        // 1 barre par jour (JJ/MM/AAAA)
        const labels = stats.map(item => {
            const d = new Date(item.rideDate);
            return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        });
        const ridesData = stats.map(item => item.nbRides);
        const creditsData = stats.map(item => item.dailyGain);

        this.renderRidesChart(labels, ridesData, colorSecondary);
        this.renderCreditsChart(labels, creditsData, colorPrimary);

        // --- Partie coût des nouveaux utilisateurs ---
        const userLabels = userStats.map(item => {
            const d = new Date(item.userDate);
            return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        });
        const userCostData = userStats.map(item => item.dailyCost);
        const userCountData = userStats.map(item => item.nbUsers);

        this.renderUsersCostChart(userLabels, userCostData, colorTertiary);

        // Affichage du coût total et du nombre total de nouveaux utilisateurs
        const totalUsers = userStats.reduce((sum, item) => sum + (item.nbUsers || 0), 0);
        document.getElementById('total-user-cost').innerHTML = `<strong>Coût total nouveaux utilisateurs :</strong> ${totalUserCost} €`;
        document.getElementById('total-new-users').innerHTML = `<strong>Total nouveaux utilisateurs :</strong> ${totalUsers}`;
    }

    renderRidesChart(labels, data, color) {
        const ctx = document.getElementById('rides-per-day-chart').getContext('2d');
        if (this.ridesChart) this.ridesChart.destroy();
        this.ridesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Covoiturages',
                    data,
                    backgroundColor: color
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    renderCreditsChart(labels, data, color) {
        const ctx = document.getElementById('credits-per-day-chart').getContext('2d');
        if (this.creditsChart) this.creditsChart.destroy();
        this.creditsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Crédits gagnés',
                    data,
                    backgroundColor: color
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    renderUsersCostChart(labels, data, color) {
        const ctx = document.getElementById('users-cost-per-day-chart').getContext('2d');
        if (this.usersChart) this.usersChart.destroy();
        this.usersChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Coût nouveaux utilisateurs (€)',
                    data,
                    backgroundColor: color
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    async loadChartJs() {
        return new Promise(resolve => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    getCssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }
}
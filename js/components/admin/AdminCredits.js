import { apiService } from '../../core/ApiService.js';
import { getToken } from '../../script.js';

export class AdminCredits {
    constructor() {
        this.creditsTotal = document.getElementById('credits-total');
        this.arrow = document.getElementById('credits-arrow');
        this.varValue = document.getElementById('credits-var-value');
    }

    async load() {
        try {
            // Récupère le crédit de départ et le crédit total
            const [startCreditRes, totalCreditRes] = await Promise.all([
                apiService.get('ecoride/START_CREDIT', getToken()).then(r => r.json()),
                apiService.get('ecoride/TOTAL_CREDIT', getToken()).then(r => r.json())
            ]);
            const credits = totalCreditRes?.data.parameterValue ?? 0;
            const start = startCreditRes?.data.parameterValue ?? 0;
            const variation = credits - start;

            if (this.creditsTotal && this.arrow && this.varValue) {
                this.creditsTotal.textContent = credits;
                this.varValue.textContent = (variation >= 0 ? '+' : '') + variation;
                if (variation >= 0) {
                    this.arrow.innerHTML = '<span class="text-success">&#8593;</span>';
                    this.varValue.classList.remove('text-danger');
                    this.varValue.classList.add('text-success');
                } else {
                    this.arrow.innerHTML = '<span class="text-danger">&#8595;</span>';
                    this.varValue.classList.remove('text-success');
                    this.varValue.classList.add('text-danger');
                }
            }
        } catch (e) {
            if (this.creditsTotal) this.creditsTotal.textContent = 'Erreur';
            if (this.varValue) this.varValue.textContent = '';
            console.error('Erreur lors de la mise à jour des crédits :', e);
        }
    }
}

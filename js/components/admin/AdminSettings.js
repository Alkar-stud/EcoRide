import { apiService } from '../../core/ApiService.js';
import { getToken } from '../../script.js';

export class AdminSettings {
    constructor() {
        this.settingsPane = document.getElementById('settings-pane');
    }

    load() {
        this.injectHtml();
        this.loadParams();

        // Listeners
        document.getElementById('param-search-form').addEventListener('submit', e => {
            e.preventDefault();
            this.loadParams(document.getElementById('param-search-input').value.trim());
        });
        document.getElementById('param-reset-btn').addEventListener('click', () => {
            document.getElementById('param-search-input').value = '';
            this.loadParams();
        });
        document.getElementById('params-table-body').addEventListener('click', e => this.handleSaveParam(e));
    }

    injectHtml() {
        if (this.settingsPane.innerHTML.trim()) return;
        this.settingsPane.innerHTML = `
            <h2>Gestion des paramètres</h2>
            <form id="param-search-form" class="mb-3 d-flex">
                <input id="param-search-input" class="form-control me-2" placeholder="Rechercher un libellé...">
                <button class="btn btn-primary" type="submit">Rechercher</button>
                <button class="btn btn-secondary ms-2" type="button" id="param-reset-btn">Réinitialiser</button>
            </form>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Libellé</th>
                        <th>Valeur</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="params-table-body"></tbody>
            </table>
        `;
    }

    async loadParams(filterLibelle = '') {
        // Appel API pour récupérer les paramètres
        const params = await apiService.get(`/api/admin/params?libelle=${encodeURIComponent(filterLibelle)}`, getToken()).then(r => r.json());
        const tbody = document.getElementById('params-table-body');
        tbody.innerHTML = params.map(param => `
            <tr>
                <td>${param.libelle}</td>
                <td>
                    <input type="text" class="form-control" value="${param.valeur}" data-id="${param.id}">
                </td>
                <td>
                    <button class="btn btn-success btn-sm save-param-btn" data-id="${param.id}">Enregistrer</button>
                </td>
            </tr>
        `).join('');
    }

    async handleSaveParam(e) {
        if (e.target.classList.contains('save-param-btn')) {
            const id = e.target.getAttribute('data-id');
            const input = document.querySelector(`input[data-id="${id}"]`);
            const valeur = input.value;
            await apiService.post(`/api/admin/params/${id}`, { valeur }, getToken());
            alert('Paramètre enregistré !');
        }
    }
}

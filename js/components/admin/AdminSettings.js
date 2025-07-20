import { apiService } from '../../core/ApiService.js';
import { getToken } from '../../script.js';

export class AdminSettings {
    constructor() {
        this.settingsPane = document.getElementById('settings-pane');
    }

    load() {
        this.injectHtml();
        this.loadParams();

        // Listeners (après injection du HTML !)
        document.getElementById('searchButton').addEventListener('click', (e) => {
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
        this.settingsPane.innerHTML = `
            <h2>Gestion des paramètres</h2>
            <form id="param-search-form" class="mb-3 d-flex align-items-center" autocomplete="off">
                <input id="param-search-input" class="form-control me-2" placeholder="Rechercher par libellé..." style="max-width:250px;">
                <button class="btn btn-primary" id="searchButton" type="button">Rechercher</button>
                <button class="btn btn-secondary ms-2" type="button" id="param-reset-btn">Réinitialiser</button>
            </form>
            <div id="params-msg" class="mb-2"></div>
            <div class="table-responsive">
                <table class="table table-bordered align-middle" id="params-table">
                    <thead>
                        <tr>
                            <th>Libellé</th>
                            <th>Valeur</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="params-table-body"></tbody>
                </table>
            </div>
        `;
    }

    async loadParams(filterLibelle = '') {
        const tbody = document.getElementById('params-table-body');
        const msgDiv = document.getElementById('params-msg');
        tbody.innerHTML = '';
        msgDiv.textContent = '';

        try {
            let res;
            if (filterLibelle) {
                res = await apiService.get(
                    `ecoride/${encodeURIComponent(filterLibelle)}`,
                    getToken()
                ).then(r => r.json());

                // On force la data en tableau pour homogénéiser l'affichage
                if (res?.success && res.data) {
                    res.data = Array.isArray(res.data) ? res.data : [res.data];
                }
            } else {
                res = await apiService.get(
                    'ecoride/list',
                    getToken()
                ).then(r => r.json());
            }
            if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
                tbody.innerHTML = res.data.map(param => `
                    <tr data-id="${param.id}">
                        <td>${param.libelle}</td>
                        <td>
                            <input type="text" class="form-control param-value-input" value="${param.parameterValue}" style="max-width:120px;display:inline-block;">
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary save-param-btn">Enregistrer</button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = `<tr><td colspan="3" class="text-muted">Aucun paramètre trouvé.</td></tr>`;
            }
        } catch (e) {
            console.error("Erreur lors du chargement des paramètres:", e);
            msgDiv.textContent = "Erreur lors du chargement des paramètres.";
            msgDiv.className = "text-danger mb-2";
        }
    }

    async handleSaveParam(e) {
        if (!e.target.classList.contains('save-param-btn')) return;
        const row = e.target.closest('tr');
        const id = row.getAttribute('data-id');
        const input = row.querySelector('.param-value-input');
        const value = input.value.trim();
        const msgDiv = document.getElementById('params-msg');
        msgDiv.textContent = '';
        msgDiv.className = '';

        if (!value) {
            msgDiv.textContent = "La valeur ne peut pas être vide.";
            msgDiv.className = "text-danger mb-2";
            return;
        }

        e.target.disabled = true;
        try {
            const res = await apiService.send(
                `ecoride/${id}`,
                getToken(),
                'PUT',
                JSON.stringify({ parameterValue: value })
            );
            const data = await res.json();
            if (data?.success) {
                msgDiv.textContent = "Paramètre mis à jour.";
                msgDiv.className = "text-success mb-2";
                this.loadParams(document.getElementById('param-search-input').value.trim());
            } else {
                msgDiv.textContent = data?.message || "Erreur lors de la mise à jour.";
                msgDiv.className = "text-danger mb-2";
            }
        } catch (err) {
            msgDiv.textContent = "Erreur lors de la mise à jour.";
            msgDiv.className = "text-danger mb-2";
        }
        e.target.disabled = false;
    }
}

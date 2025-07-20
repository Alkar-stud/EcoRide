import { apiService } from '../../core/ApiService.js';
import { getToken } from '../../script.js';

export class AdminAccounts {
    constructor() {
        this.accountsPane = document.getElementById('accounts-pane');
        this.employeeResult = document.getElementById('employee-search-result');
        this.userResult = document.getElementById('user-search-result');
        this.employeeEmpty = document.getElementById('employee-empty');
        this.userEmpty = document.getElementById('user-empty');
        this.employeesBtn = document.getElementById('tab-employees');
        this.usersBtn = document.getElementById('tab-users');
        this.employeesPane = document.getElementById('employees-pane');
        this.usersPane = document.getElementById('users-pane');
        this.employeeForm = document.getElementById('employee-create-form');
        this.employeeMsg = document.getElementById('employee-create-msg');
        this.searchForm = document.getElementById('account-search-form');
        this.searchQuery = document.getElementById('search-query');
        this.isEmployee = document.getElementById('isEmployee');
        this.employeePagination = document.getElementById('employee-pagination');
    }

    load() {
        this.initListeners();
        // Affiche la liste des employés par défaut
        if (this.employeesBtn.classList.contains('active')) {
            this.loadEmployees(1, 10);
        }
    }

    initListeners() {
        // Sous-onglets employés/utilisateurs
        if (this.employeesBtn && this.usersBtn && this.employeesPane && this.usersPane) {
            this.employeesBtn.addEventListener('click', () => {
                this.employeesBtn.classList.add('active');
                this.usersBtn.classList.remove('active');
                this.employeesPane.classList.remove('d-none');
                this.usersPane.classList.add('d-none');
                this.loadEmployees(1, 10);
            });
            this.usersBtn.addEventListener('click', () => {
                this.usersBtn.classList.add('active');
                this.employeesBtn.classList.remove('active');
                this.usersPane.classList.remove('d-none');
                this.employeesPane.classList.add('d-none');
                // Optionnel : charger la liste des utilisateurs ici
            });
        }

        // Création d'un employé
        if (this.employeeForm) {
            this.employeeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const pseudo = document.getElementById('employee-pseudo').value.trim();
                const email = document.getElementById('employee-email').value.trim();
                this.employeeMsg.textContent = '';
                this.employeeMsg.className = 'mt-2';
                if (!pseudo || !email) {
                    this.employeeMsg.textContent = 'Veuillez remplir tous les champs.';
                    this.employeeMsg.classList.add('text-danger');
                    return;
                }
                try {
                    const response = await apiService.post(
                        'ecoride/admin/add',
                        { pseudo, email },
                        getToken()
                    ).then(r => r.json());
                    if (response?.success) {
                        this.employeeMsg.textContent = "Employé créé avec succès.";
                        this.employeeMsg.classList.add('text-success');
                        this.employeeForm.reset();
                        this.loadEmployees(1, 10);
                    } else {
                        this.employeeMsg.textContent = (response?.message) ? response.message : "Erreur lors de la création.";
                        this.employeeMsg.classList.add('text-danger');
                    }
                } catch (err) {
                    this.employeeMsg.textContent = "Erreur lors de la création.";
                    this.employeeMsg.classList.add('text-danger');
                }
            });
        }

        // Recherche utilisateur/employé
        if (this.searchForm) {
            this.searchForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const query = this.searchQuery.value.trim();
                const employeeChecked = this.isEmployee.checked;
                this.employeeResult.innerHTML = '';
                this.userResult.innerHTML = '';
                if (this.employeeEmpty) this.employeeEmpty.style.display = '';
                if (this.userEmpty) this.userEmpty.style.display = '';
                if (!query) return;
                const body = { searchParameter: query, isEmployee: employeeChecked };
                try {
                    const response = await apiService.post(
                        'ecoride/admin/searchUser',
                        body,
                        getToken()
                    ).then(r => r.json());
                    if (employeeChecked) {
                        this.employeesBtn.classList.add('active');
                        this.usersBtn.classList.remove('active');
                        this.employeesPane.classList.remove('d-none');
                        this.usersPane.classList.add('d-none');
                    } else {
                        this.usersBtn.classList.add('active');
                        this.employeesBtn.classList.remove('active');
                        this.usersPane.classList.remove('d-none');
                        this.employeesPane.classList.add('d-none');
                    }
                    if (response?.success && response.data) {
                        const user = response.data;
                        const html = this.renderUserCard(user);
                        if (employeeChecked) {
                            this.employeeResult.innerHTML = html;
                            if (this.employeeEmpty) this.employeeEmpty.style.display = 'none';
                        } else {
                            this.userResult.innerHTML = html;
                            if (this.userEmpty) this.userEmpty.style.display = 'none';
                        }
                        this.bindToggleActiveButtons('.toggle-active-btn', () => this.searchForm.dispatchEvent(new Event('submit')));
                    } else {
                        const msg = `<div class="alert alert-warning mb-2">${response?.message || 'Aucun résultat.'}</div>`;
                        if (employeeChecked) {
                            this.employeeResult.innerHTML = msg;
                            if (this.employeeEmpty) this.employeeEmpty.style.display = 'none';
                        } else {
                            this.userResult.innerHTML = msg;
                            if (this.userEmpty) this.userEmpty.style.display = 'none';
                        }
                    }
                } catch (err) {
                    const msg = `<div class="alert alert-danger mb-2">Erreur lors de la recherche.</div>`;
                    if (employeeChecked) {
                        this.employeeResult.innerHTML = msg;
                        if (this.employeeEmpty) this.employeeEmpty.style.display = 'none';
                    } else {
                        this.userResult.innerHTML = msg;
                        if (this.userEmpty) this.userEmpty.style.display = 'none';
                    }
                }
            });
        }
    }

    renderUserCard(user) {
        return `
            <div class="card mb-2">
                <div class="card-body">
                    <h5 class="card-title mb-1">${user.pseudo}</h5>
                    <div class="mb-1"><strong>Email :</strong> ${user.email}</div>
                    <div class="mb-1"><strong>Statut :</strong> 
                        ${user.isActive ? '<span class="badge bg-success">Actif</span>' : '<span class="badge bg-secondary">Inactif</span>'}
                    </div>
                    <button 
                        class="btn btn-sm ${user.isActive ? 'btn-warning' : 'btn-success'} mt-2 toggle-active-btn"
                        data-id="${user.id}"
                        data-active="${user.isActive ? 'true' : 'false'}"
                    >
                        ${user.isActive ? 'Désactiver' : 'Réactiver'}
                    </button>
                </div>
            </div>
        `;
    }

    bindToggleActiveButtons(selector, refreshCallback) {
        document.querySelectorAll(selector).forEach(btn => {
            btn.addEventListener('click', async () => {
                const userId = btn.getAttribute('data-id');
                const currentActive = btn.getAttribute('data-active') === 'true';
                const willBeActive = !currentActive;
                const action = willBeActive ? 'réactiver' : 'désactiver';
                if (!confirm(`Voulez-vous vraiment ${action} ce compte ?`)) return;
                try {
                    const res = await apiService.put(
                        `ecoride/admin/setActive/${userId}?active=${willBeActive}`,
                        {},
                        getToken()
                    ).then(r => r.json());
                    if (res?.success) {
                        if (typeof refreshCallback === 'function') refreshCallback();
                    } else {
                        alert(res?.message || "Erreur lors du changement de statut.");
                    }
                } catch (err) {
                    alert("Erreur lors du changement de statut.");
                }
            });
        });
    }

    async loadEmployees(page = 1, limit = 10) {
        this.employeeResult.innerHTML = '';
        if (this.employeePagination) this.employeePagination.innerHTML = '';
        if (this.employeeEmpty) this.employeeEmpty.style.display = '';
        try {
            const res = await apiService.get(
                `ecoride/admin/listEmployees?page=${page}&limit=${limit}`,
                getToken()
            ).then(r => r.json());
            if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
                if (this.employeeEmpty) this.employeeEmpty.style.display = 'none';
                this.employeeResult.innerHTML = res.data.map(emp => this.renderUserCard(emp)).join('');
                this.bindToggleActiveButtons('.toggle-active-btn', () => this.loadEmployees(page, limit));
                // Pagination
                if (this.employeePagination && res.total > limit) {
                    const totalPages = Math.ceil(res.total / limit);
                    let pagHtml = '<ul class="pagination justify-content-center">';
                    for (let i = 1; i <= totalPages; i++) {
                        pagHtml += `<li class="page-item${i === page ? ' active' : ''}">
                            <button class="page-link" data-page="${i}">${i}</button>
                        </li>`;
                    }
                    pagHtml += '</ul>';
                    this.employeePagination.innerHTML = pagHtml;
                    this.employeePagination.querySelectorAll('button.page-link').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const newPage = parseInt(btn.getAttribute('data-page'));
                            if (newPage !== page) this.loadEmployees(newPage, limit);
                        });
                    });
                }
            } else {
                this.employeeResult.innerHTML = '';
                if (this.employeeEmpty) this.employeeEmpty.style.display = '';
            }
        } catch (err) {
            this.employeeResult.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des employés.</div>';
            if (this.employeeEmpty) this.employeeEmpty.style.display = 'none';
        }
    }
}

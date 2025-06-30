import { apiUrl } from '../config.js';
import { sendFetchRequest, getToken } from '../../js/script.js';

// Récupère et affiche les crédits et la variation
async function updateCredits() {
  try {
    const [startCredit, totalCredit] = await Promise.all([
      sendFetchRequest(apiUrl + 'ecoride/START_CREDIT', getToken()),
      sendFetchRequest(apiUrl + 'ecoride/TOTAL_CREDIT', getToken())
    ]);
    const credits = totalCredit?.parameterValue ?? 0;
    const start = startCredit?.parameterValue ?? 0;
    const variation = credits - start;

    const creditsTotal = document.getElementById('credits-total');
    const arrow = document.getElementById('credits-arrow');
    const varValue = document.getElementById('credits-var-value');

    if (creditsTotal && arrow && varValue) {
      creditsTotal.textContent = credits;
      varValue.textContent = (variation >= 0 ? '+' : '') + variation;
      if (variation >= 0) {
        arrow.innerHTML = '<span class="text-success">&#8593;</span>';
        varValue.classList.remove('text-danger');
        varValue.classList.add('text-success');
      } else {
        arrow.innerHTML = '<span class="text-danger">&#8595;</span>';
        varValue.classList.remove('text-success');
        varValue.classList.add('text-danger');
      }
    }
  } catch (e) {
    console.error('Erreur lors de la mise à jour des crédits :', e);
    const creditsTotal = document.getElementById('credits-total');
    const varValue = document.getElementById('credits-var-value');
    if (creditsTotal) creditsTotal.textContent = 'Erreur';
    if (varValue) varValue.textContent = '';
  }
}
updateCredits();

// Gestion des onglets principaux
const statsBtn = document.getElementById('tab-stats');
const accountsBtn = document.getElementById('tab-accounts');
const settingsBtn = document.getElementById('tab-settings');
const statsPane = document.getElementById('stats-pane');
const accountsPane = document.getElementById('accounts-pane');
const settingsPane = document.getElementById('settings-pane');

if (statsBtn && accountsBtn && statsPane && accountsPane) {
  statsBtn.addEventListener('click', function () {
    statsBtn.classList.add('active');
    accountsBtn.classList.remove('active');
    settingsBtn.classList.remove('active');
    statsPane.classList.remove('d-none');
    accountsPane.classList.add('d-none');
    settingsPane.classList.add('d-none');
  });
  accountsBtn.addEventListener('click', function () {
    accountsBtn.classList.add('active');
    statsBtn.classList.remove('active');
    settingsBtn.classList.remove('active');
    accountsPane.classList.remove('d-none');
    statsPane.classList.add('d-none');
    settingsPane.classList.add('d-none');
  });
  settingsBtn.addEventListener('click', function () {
    accountsBtn.classList.remove('active');
    statsBtn.classList.remove('active');
    settingsBtn.classList.add('active');
    statsPane.classList.add('d-none');
    accountsPane.classList.add('d-none');
    settingsPane.classList.remove('d-none');
  });
}

// Gestion des sous-onglets employés/utilisateurs
const employeesBtn = document.getElementById('tab-employees');
const usersBtn = document.getElementById('tab-users');
const employeesPane = document.getElementById('employees-pane');
const usersPane = document.getElementById('users-pane');

if (employeesBtn && usersBtn && employeesPane && usersPane) {
  employeesBtn.addEventListener('click', function () {
    employeesBtn.classList.add('active');
    usersBtn.classList.remove('active');
    employeesPane.classList.remove('d-none');
    usersPane.classList.add('d-none');
  });
  usersBtn.addEventListener('click', function () {
    usersBtn.classList.add('active');
    employeesBtn.classList.remove('active');
    usersPane.classList.remove('d-none');
    employeesPane.classList.add('d-none');
  });
}

// Création d'un employé
const employeeForm = document.getElementById('employee-create-form');
if (employeeForm) {
  employeeForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const pseudo = document.getElementById('employee-pseudo').value.trim();
    const email = document.getElementById('employee-email').value.trim();
    const msgDiv = document.getElementById('employee-create-msg');
    msgDiv.textContent = '';
    msgDiv.className = 'mt-2';

    if (!pseudo || !email) {
      msgDiv.textContent = 'Veuillez remplir tous les champs.';
      msgDiv.classList.add('text-danger');
      return;
    }

    try {
      const response = await sendFetchRequest(
        apiUrl + 'ecoride/admin/add',
        getToken(),
        'POST',
        JSON.stringify({ pseudo, email })
      );
      if (response?.success) {
        msgDiv.textContent = "Employé créé avec succès.";
        msgDiv.classList.add('text-success');
        employeeForm.reset();
      } else {
        msgDiv.textContent = (response?.message) ? response.message : "Erreur lors de la création.";
        msgDiv.classList.add('text-danger');
      }
    } catch (err) {
      console.error('Erreur lors de la création de l\'employé :', err);
      msgDiv.textContent = "Erreur lors de la création.";
      msgDiv.classList.add('text-danger');
    }
  });
}

// Recherche utilisateur/employé
const searchForm = document.getElementById('account-search-form');
const searchQuery = document.getElementById('search-query');
const isEmployee = document.getElementById('isEmployee');
const employeeResult = document.getElementById('employee-search-result');
const userResult = document.getElementById('user-search-result');
const employeeEmpty = document.getElementById('employee-empty');
const userEmpty = document.getElementById('user-empty');


/**
 * Génère le HTML d'une carte utilisateur/employé.
 * @param {Object} user - L'objet utilisateur/employé.
 * @param {string} btnClass - Classe CSS du bouton.
 * @param {string} btnId - ID du bouton (optionnel, sinon classe générique).
 * @returns {string}
 */
function renderUserCard(user, btnClass = 'toggle-active-btn', btnId = '') {
  return `
    <div class="card mb-2">
      <div class="card-body">
        <h5 class="card-title mb-1">${user.pseudo}</h5>
        <div class="mb-1"><strong>Email :</strong> ${user.email}</div>
        <div class="mb-1"><strong>Statut :</strong> 
          ${user.isActive ? '<span class="badge bg-success">Actif</span>' : '<span class="badge bg-secondary">Inactif</span>'}
        </div>
        <button 
          class="btn btn-sm ${user.isActive ? 'btn-warning' : 'btn-success'} mt-2 ${btnClass}"
          ${btnId ? `id="${btnId}"` : ''}
          data-id="${user.id}"
          data-active="${user.isActive ? 'true' : 'false'}"
        >
          ${user.isActive ? 'Désactiver' : 'Réactiver'}
        </button>
      </div>
    </div>
  `;
}

/**
 * Ajoute l'écouteur sur les boutons activer/désactiver.
 * @param {string} selector - Sélecteur CSS pour les boutons.
 * @param {Function} refreshCallback - Fonction à rappeler après modification.
 */
function bindToggleActiveButtons(selector, refreshCallback) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener('click', async function () {
      const userId = btn.getAttribute('data-id');
      const currentActive = btn.getAttribute('data-active') === 'true';
      const willBeActive = !currentActive;
      const action = willBeActive ? 'réactiver' : 'désactiver';
      if (!confirm(`Voulez-vous vraiment ${action} ce compte ?`)) return;
      try {
        const res = await sendFetchRequest(
          apiUrl + `ecoride/admin/setActive/${userId}?active=${willBeActive}`,
          getToken(),
          'PUT'
        );
        if (res?.success) {
          if (typeof refreshCallback === 'function') refreshCallback();
        } else {
          alert(res?.message || "Erreur lors du changement de statut.");
        }
      } catch (err) {
        console.error('Erreur lors du changement de statut :', err);
        alert("Erreur lors du changement de statut.");
      }
    });
  });
}


if (searchForm) {
  searchForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const query = searchQuery.value.trim();
    const employeeChecked = isEmployee.checked;

    // Réinitialise les résultats
    employeeResult.innerHTML = '';
    userResult.innerHTML = '';
    if (employeeEmpty) employeeEmpty.style.display = '';
    if (userEmpty) userEmpty.style.display = '';

    if (!query) return;

    // Prépare la requête
    const body = {
      searchParameter: query
    };
    if (typeof employeeChecked === 'boolean') {
      body.isEmployee = employeeChecked;
    }
    try {
      const response = await sendFetchRequest(
        apiUrl + 'ecoride/admin/searchUser',
        getToken(),
        'POST',
        JSON.stringify(body)
      );

      // Affichage du résultat + activation du bon onglet
      if (employeeChecked) {
        employeesBtn.classList.add('active');
        usersBtn.classList.remove('active');
        employeesPane.classList.remove('d-none');
        usersPane.classList.add('d-none');
      } else {
        usersBtn.classList.add('active');
        employeesBtn.classList.remove('active');
        usersPane.classList.remove('d-none');
        employeesPane.classList.add('d-none');
      }

      if (response?.success && response.data) {
        const user = response.data;
        const html = renderUserCard(user, 'toggle-active-btn', 'toggle-active-btn');
        if (employeeChecked) {
            employeeResult.innerHTML = html;
            if (employeeEmpty) employeeEmpty.style.display = 'none';
        } else {
            userResult.innerHTML = html;
            if (userEmpty) userEmpty.style.display = 'none';
        }
        bindToggleActiveButtons('#toggle-active-btn', () => searchForm.dispatchEvent(new Event('submit')));
    } else if (response?.error) {
        const msg = `<div class="alert alert-warning mb-2">${response.message || 'Aucun résultat.'}</div>`;
        if (employeeChecked) {
          employeeResult.innerHTML = msg;
          if (employeeEmpty) employeeEmpty.style.display = 'none';
        } else {
          userResult.innerHTML = msg;
          if (userEmpty) userEmpty.style.display = 'none';
        }
      }
    } catch (err) {
      console.error('Erreur lors de la recherche :', err);
      const msg = `<div class="alert alert-danger mb-2">Erreur lors de la recherche.</div>`;
      if (employeeChecked) {
        employeeResult.innerHTML = msg;
        if (employeeEmpty) employeeEmpty.style.display = 'none';
      } else {
        userResult.innerHTML = msg;
        if (userEmpty) userEmpty.style.display = 'none';
      }
    }
  });
}


async function loadEmployees(page = 1, limit = 10) {
  const employeeResult = document.getElementById('employee-search-result');
  const employeeEmpty = document.getElementById('employee-empty');
  const pagination = document.getElementById('employee-pagination');
  employeeResult.innerHTML = '';
  if (pagination) pagination.innerHTML = '';
  if (employeeEmpty) employeeEmpty.style.display = '';

  try {
    const res = await sendFetchRequest(
      apiUrl + `ecoride/admin/listEmployees?page=${page}&limit=${limit}`,
      getToken()
    );
    if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
      if (employeeEmpty) employeeEmpty.style.display = 'none';
      employeeResult.innerHTML = res.data.map(emp => `
        <div class="card mb-2">
          <div class="card-body">
            <h5 class="card-title mb-1">${emp.pseudo}</h5>
            <div class="mb-1"><strong>Email :</strong> ${emp.email}</div>
            <div class="mb-1"><strong>Statut :</strong> 
              ${emp.isActive ? '<span class="badge bg-success">Actif</span>' : '<span class="badge bg-secondary">Inactif</span>'}
            </div>
            <button 
              class="btn btn-sm ${emp.isActive ? 'btn-warning' : 'btn-success'} mt-2 toggle-active-btn"
              data-id="${emp.id}"
              data-active="${emp.isActive ? 'true' : 'false'}"
            >
              ${emp.isActive ? 'Désactiver' : 'Réactiver'}
            </button>
          </div>
        </div>
      `).join('');

      // Ajout gestion bouton activer/désactiver pour chaque fiche
      document.querySelectorAll('.toggle-active-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
          const userId = btn.getAttribute('data-id');
          const currentActive = btn.getAttribute('data-active') === 'true';
          const willBeActive = !currentActive;
          const action = willBeActive ? 'réactiver' : 'désactiver';
          if (!confirm(`Voulez-vous vraiment ${action} ce compte ?`)) return;
          try {
            const res = await sendFetchRequest(
            apiUrl + `ecoride/admin/setActive/${userId}?active=${willBeActive}`,
            getToken(),
            'PUT'
            );
            if (res?.success) {
              loadEmployees(page, limit);
            } else {
              alert(res?.message || "Erreur lors du changement de statut.");
            }
          } catch (err) {
            console.error('Erreur lors du changement de statut :', err);
            alert("Erreur lors du changement de statut.");
          }
        });
      });

      // Pagination
      if (pagination && res.total > limit) {
        const totalPages = Math.ceil(res.total / limit);
        let pagHtml = '<ul class="pagination justify-content-center">';
        for (let i = 1; i <= totalPages; i++) {
          pagHtml += `<li class="page-item${i === page ? ' active' : ''}">
            <button class="page-link" data-page="${i}">${i}</button>
          </li>`;
        }
        pagHtml += '</ul>';
        pagination.innerHTML = pagHtml;

        // Gestion des clics sur la pagination
        pagination.querySelectorAll('button.page-link').forEach(btn => {
          btn.addEventListener('click', function () {
            const newPage = parseInt(this.getAttribute('data-page'));
            if (newPage !== page) loadEmployees(newPage, limit);
          });
        });
      }
    } else {
      employeeResult.innerHTML = '';
      if (employeeEmpty) employeeEmpty.style.display = '';
    }
  } catch (err) {
    console.error('Erreur lors du chargement des employés :', err);
    employeeResult.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des employés.</div>';
    if (employeeEmpty) employeeEmpty.style.display = 'none';
  }
}

// Chargement initial de la liste à l'ouverture de l'onglet Employés
if (employeesBtn) {
  employeesBtn.addEventListener('click', function () {
    loadEmployees(1, 10);
  });
}
// Optionnel : charger la liste au chargement de la page si l’onglet Employés est actif
if (employeesBtn.classList.contains('active')) {
  loadEmployees(1, 10);
}
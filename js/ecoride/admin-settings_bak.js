import { apiUrl } from '../config.js';
import { sendFetchRequest, getToken } from '../../js/script.js';

// Sélecteurs
const settingsPane = document.getElementById('settings-pane');

// Génère le HTML d'une ligne de paramètre
function renderParamRow(param) {
  return `
    <tr data-id="${param.id}">
      <td>${param.libelle}</td>
      <td>
        <input type="text" class="form-control param-value-input" value="${param.parameterValue}" style="max-width:120px;display:inline-block;">
      </td>
      <td>
        <button class="btn btn-sm btn-primary save-param-btn">Enregistrer</button>
      </td>
    </tr>
  `;
}

// Affiche la liste des paramètres
async function loadParams(filterLibelle = '') {
  const tableBody = document.getElementById('params-table-body');
  const msgDiv = document.getElementById('params-msg');
  tableBody.innerHTML = '';
  msgDiv.textContent = '';

  try {
    let res;
    if (filterLibelle) {
      res = await sendFetchRequest(
        apiUrl + 'ecoride/' + encodeURIComponent(filterLibelle),
        getToken(),
        'GET'
      );
      // On force la data en tableau pour homogénéiser l'affichage
      if (res?.success && res.data) {
        res.data = Array.isArray(res.data) ? res.data : [res.data];
      }
    } else {
      res = await sendFetchRequest(apiUrl + 'ecoride/list', getToken());
    }

    if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
      tableBody.innerHTML = res.data.map(renderParamRow).join('');
    } else {
      tableBody.innerHTML = `<tr><td colspan="3" class="text-muted">Aucun paramètre trouvé.</td></tr>`;
    }
  } catch (e) {
    console.error("Erreur lors du chargement des paramètres:", e);
    msgDiv.textContent = "Erreur lors du chargement des paramètres.";
    msgDiv.className = "text-danger mb-2";
  }
}

// Gère la sauvegarde d'un paramètre
async function handleSaveParam(e) {
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
    const res = await sendFetchRequest(
      apiUrl + 'ecoride/' + id,
      getToken(),
      'PUT',
      JSON.stringify({ parameterValue: value })
    );
    if (res?.success) {
      msgDiv.textContent = "Paramètre mis à jour.";
      msgDiv.className = "text-success mb-2";
      loadParams(document.getElementById('param-search-input').value.trim());
    } else {
      msgDiv.textContent = res?.message || "Erreur lors de la mise à jour.";
      msgDiv.className = "text-danger mb-2";
    }
  } catch (err) {
    msgDiv.textContent = "Erreur lors de la mise à jour.";
    msgDiv.className = "text-danger mb-2";
  }
  e.target.disabled = false;
}

// Gère la recherche
function handleSearch(e) {
  e.preventDefault();
  const input = document.getElementById('param-search-input');
  loadParams(input.value.trim());
}

// Injection du HTML dans l'onglet paramètres si ce n'est pas déjà fait
function injectSettingsHtml() {
  if (document.getElementById('params-table')) return;
  settingsPane.innerHTML = `
    <h2>Gestion des paramètres</h2>
    <form id="param-search-form" class="mb-3 d-flex align-items-center" autocomplete="off">
      <input type="text" class="form-control me-2" id="param-search-input" placeholder="Rechercher par libellé..." style="max-width:250px;">
      <button type="submit" class="btn btn-secondary">Rechercher</button>
      <button type="button" class="btn btn-outline-secondary ms-2" id="param-reset-btn">Réinitialiser</button>
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

// Initialisation
function initAdminSettings() {
  injectSettingsHtml();
  loadParams();

  // Recherche
  document.getElementById('param-search-form').addEventListener('submit', handleSearch);
  document.getElementById('param-reset-btn').addEventListener('click', function () {
    document.getElementById('param-search-input').value = '';
    loadParams();
  });

  // Sauvegarde
  document.getElementById('params-table-body').addEventListener('click', handleSaveParam);
}

// Lance l'init quand on affiche l'onglet paramètres
const settingsBtn = document.getElementById('tab-settings');
if (settingsBtn && settingsPane) {
  settingsBtn.addEventListener('click', initAdminSettings);
  // Optionnel : si déjà actif au chargement
  if (settingsBtn.classList.contains('active')) {
    initAdminSettings();
  }
}
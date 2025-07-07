//Module pour gérer les fonctions utilitaires

export async function refreshTab(tabId) {
    const tab = document.getElementById(tabId);
    if (tab) {
        const url = tab.dataset.url;
        const response = await fetch(url);
        if (response.ok) {
            const content = await response.text();
            tab.innerHTML = content;
        } else {
            console.error("Erreur lors du chargement de l'onglet :", response.statusText);
        }
    } else {
        console.error("Onglet non trouvé :", tabId);
    }
}
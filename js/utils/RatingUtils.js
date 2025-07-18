/**
 * Affiche une note sous forme d'étoiles
 * @param {number} gradeValue - Note sur 10
 * @param {HTMLElement} container - Conteneur HTML pour les étoiles
 */
export function setGradeStyle(gradeValue, container = document.getElementById("starsContainer")) {
    // Vérifie si le conteneur existe
    if (!container) return;
    
    // Nettoie le conteneur
    container.innerHTML = "";

    if (!gradeValue || isNaN(gradeValue)) {

        // Si la note n'est pas valide, on affiche 5 étoiles vides
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("i");
            star.classList.add("bi", "bi-star");
            container.appendChild(star);
        }
        container.setAttribute("title", "Pas encore de note");
        return;
    }

    // La note est un nombre entre 0 et 10, on la ramène sur 5
    gradeValue = gradeValue / 2;

    // Détermine la couleur selon la note
    let colorClass = "";
    if (gradeValue >= 3) {
        colorClass = "text-success";
    } else if (gradeValue >= 1.5 && gradeValue < 3) {
        colorClass = "text-warning";
    } else {
        colorClass = "text-danger";
    }

    // Génère les 5 étoiles avec la bonne couleur
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement("i");
        star.classList.add("bi", colorClass);

        if (gradeValue >= i) {
            star.classList.add("bi-star-fill");
        } else if (gradeValue >= i - 0.5) {
            star.classList.add("bi-star-half");
        } else {
            star.classList.add("bi-star");
        }
        container.appendChild(star);
    }
}

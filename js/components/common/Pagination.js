export class Pagination {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.container - Élément DOM où insérer la pagination (en bas de la liste)
     * @param {number} options.currentPage - Page courante (1-based)
     * @param {number} options.totalPages - Nombre total de pages
     * @param {function} options.onPageChange - Callback appelé avec le numéro de page lors d'un clic
     */
    constructor({ container, currentPage, totalPages, onPageChange }) {
        this.container = container;
        this.currentPage = currentPage;
        this.totalPages = totalPages;
        this.onPageChange = onPageChange;

        this.render();
    }

    render() {
        // Supprime une ancienne pagination si présente
        const old = this.container.parentElement.querySelector('.pagination-wrapper');
        if (old) old.remove();

        if (this.totalPages <= 1) return;

        // Création du wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'pagination-wrapper d-flex justify-content-center mt-3';

        // Création de la pagination Bootstrap
        let html = '<nav><ul class="pagination mb-0">';
        // Précédent
        html += `<li class="page-item${this.currentPage === 1 ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${this.currentPage - 1}">Précédent</a>
        </li>`;
        // Pages
        for (let i = 1; i <= this.totalPages; i++) {
            html += `<li class="page-item${i === this.currentPage ? ' active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>`;
        }
        // Suivant
        html += `<li class="page-item${this.currentPage === this.totalPages ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${this.currentPage + 1}">Suivant</a>
        </li>`;
        html += '</ul></nav>';

        wrapper.innerHTML = html;

        // Insertion après le container (sous la liste/table)
        this.container.parentElement.appendChild(wrapper);

        // Ajout des listeners
        wrapper.querySelectorAll('a.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.getAttribute('data-page'));
                if (!isNaN(page) && page >= 1 && page <= this.totalPages && page !== this.currentPage) {
                    this.onPageChange(page);
                }
            });
        });
    }
}

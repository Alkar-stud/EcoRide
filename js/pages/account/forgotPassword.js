import { apiService } from '../../core/ApiService.js';

export class ForgotPasswordForm {
    constructor() {
        this.form = document.getElementById('forgotPasswordForm');
        this.emailInput = document.getElementById('forgotEmailInput');
        this.btnForgotPassword = document.getElementById('btnForgotPassword');
        this.msgDiv = document.getElementById('forgotPasswordMsg');
        this.initListeners();
    }

    initListeners() {
        this.btnForgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            this.sendReinitPassword();
        });
    }

    async sendReinitPassword() {
        this.msgDiv.textContent = '';
        this.msgDiv.className = 'text-center mt-2';

        const email = this.emailInput.value.trim();
        if (!email) {
            this.msgDiv.textContent = "Veuillez saisir votre adresse email.";
            this.msgDiv.classList.add('text-danger');
            return;
        }

        try {
            const response = await apiService.post('forgotPassword', { email });
            const res = await response.json();

            if (res?.success) {
                this.msgDiv.textContent = "Un email de réinitialisation a été envoyé si l'adresse existe.";
                this.msgDiv.classList.add('text-success');
            } else {
                this.msgDiv.textContent = res?.message || "Une erreur est survenue.";
                this.msgDiv.classList.add('text-danger');
            }
        } catch (err) {
            this.msgDiv.textContent = "Erreur lors de la demande. Veuillez réessayer.";
            this.msgDiv.classList.add('text-danger');
        }
    }
}

// Instanciation automatique
new ForgotPasswordForm();
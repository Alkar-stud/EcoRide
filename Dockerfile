# Utiliser une image de base avec Apache
FROM php:8.2-apache

# Activer les modules Apache nécessaires et modifier la configuration d'Apache pour écouter sur le port 3000
RUN a2enmod rewrite headers ssl && \
    sed -i 's/80/3000/g' /etc/apache2/ports.conf && \
    sed -i 's/:80/:3000/g' /etc/apache2/sites-enabled/000-default.conf && \
    sed -i 's/:80/:3000/g' /etc/apache2/sites-available/000-default.conf

# Copier les fichiers du site web dans le répertoire par défaut d'Apache
COPY . /var/www/html

# Exposer le port 3000
EXPOSE 3000

# Commande par défaut pour démarrer Apache
CMD ["apache2-foreground"]
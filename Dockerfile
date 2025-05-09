# Utiliser une image de base avec Apache
FROM php:7.4-apache

# Activer les modules Apache nécessaires
RUN a2enmod rewrite && \
    a2enmod headers && \
    a2enmod ssl

# Copier les fichiers du site web dans le répertoire par défaut d'Apache
COPY . /var/www/html

# Exposer le port 3000
EXPOSE 3000

# Commande par défaut pour démarrer Apache
CMD ["apache2-foreground"]
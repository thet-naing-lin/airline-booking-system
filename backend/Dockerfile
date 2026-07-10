FROM php:8.4-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    nginx \
    unzip \
    zip \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy composer files first (for caching)
COPY composer.json composer.lock ./

# Install dependencies
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# Copy the rest of the application
COPY . .

# Generate autoloader
RUN composer dump-autoload --optimize

# Storage permissions
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

# Nginx config
RUN echo 'server {' > /etc/nginx/sites-available/default && \
    echo '    listen 80;' >> /etc/nginx/sites-available/default && \
    echo '    server_name _;' >> /etc/nginx/sites-available/default && \
    echo '    root /var/www/public;' >> /etc/nginx/sites-available/default && \
    echo '    index index.php;' >> /etc/nginx/sites-available/default && \
    echo '    location / {' >> /etc/nginx/sites-available/default && \
    echo '        try_files $uri $uri/ /index.php?$query_string;' >> /etc/nginx/sites-available/default && \
    echo '    }' >> /etc/nginx/sites-available/default && \
    echo '    location ~ \.php$ {' >> /etc/nginx/sites-available/default && \
    echo '        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;' >> /etc/nginx/sites-available/default && \
    echo '        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;' >> /etc/nginx/sites-available/default && \
    echo '        include fastcgi_params;' >> /etc/nginx/sites-available/default && \
    echo '    }' >> /etc/nginx/sites-available/default && \
    echo '    location ~ /\.(?!well-known) {' >> /etc/nginx/sites-available/default && \
    echo '        deny all;' >> /etc/nginx/sites-available/default && \
    echo '    }' >> /etc/nginx/sites-available/default && \
    echo '}' >> /etc/nginx/sites-available/default

# Entrypoint script
RUN echo '#!/bin/bash' > /var/www/entrypoint.sh && \
    echo 'php artisan migrate --force' >> /var/www/entrypoint.sh && \
    echo 'service nginx start' >> /var/www/entrypoint.sh && \
    echo 'php-fpm' >> /var/www/entrypoint.sh && \
    echo 'tail -f /dev/null' >> /var/www/entrypoint.sh && \
    chmod +x /var/www/entrypoint.sh

# Expose port 80 (Nginx)
EXPOSE 80

# Start the application
CMD ["/var/www/entrypoint.sh"]

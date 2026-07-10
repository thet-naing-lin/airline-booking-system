FROM php:8.4-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
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

# Create entrypoint script
RUN echo '#!/bin/bash' > /var/www/entrypoint.sh && \
    echo 'php artisan migrate --force' >> /var/www/entrypoint.sh && \
    echo 'php artisan db:seed --force' >> /var/www/entrypoint.sh && \
    echo 'php artisan serve --host=0.0.0.0 --port=${PORT:-8000}' >> /var/www/entrypoint.sh && \
    chmod +x /var/www/entrypoint.sh

# Expose port
EXPOSE 8000

# Start the application
CMD ["/var/www/entrypoint.sh"]

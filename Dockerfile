# =============================================================================
# FCC_001 - Application de Gestion d'Incidents Client
# Dockerfile optimisé pour production
# =============================================================================

# Étape 1: Image de base avec Python 3.11 slim
FROM python:3.11-slim-bookworm AS base

# Labels pour la documentation
LABEL maintainer="FCC_001 Team"
LABEL version="1.0.0"
LABEL description="Application Flask de gestion d'incidents client"

# Variables d'environnement de base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Créer un utilisateur non-root pour la sécurité
RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

# Répertoire de travail
WORKDIR /app

# =============================================================================
# Étape 2: Installation des dépendances système
# =============================================================================
FROM base AS builder

# Installer les dépendances système nécessaires pour WeasyPrint et les packages Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Dépendances de compilation
    build-essential \
    gcc \
    # Dépendances pour WeasyPrint et PDF
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    libcairo2 \
    libcairo2-dev \
    libgirepository1.0-dev \
    gir1.2-pango-1.0 \
    # Dépendances pour les polices
    fonts-liberation \
    fonts-dejavu-core \
    # Dépendances pour MySQL/MariaDB
    default-libmysqlclient-dev \
    pkg-config \
    # Utilitaires
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Créer l'environnement virtuel
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copier et installer les dépendances Python
COPY config/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r /app/requirements.txt

# =============================================================================
# Étape 3: Image de production finale
# =============================================================================
FROM base AS production

# Installer uniquement les dépendances runtime (pas de compilation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Dépendances runtime pour WeasyPrint
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libcairo2 \
    gir1.2-pango-1.0 \
    # Polices pour PDF
    fonts-liberation \
    fonts-dejavu-core \
    fonts-freefont-ttf \
    # Client MySQL (pour debug/connexion)
    default-mysql-client \
    # Utilitaires (healthcheck)
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copier l'environnement virtuel depuis le builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copier le code de l'application
COPY --chown=appuser:appgroup . /app/

# Créer les répertoires nécessaires
RUN mkdir -p /app/logs /app/instance /app/monitoring/logs /app/monitoring/backups /app/presentation/uploads && \
    chown -R appuser:appgroup /app

# Copier et configurer le script d'entrée
COPY --chown=appuser:appgroup docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Changer vers l'utilisateur non-root
USER appuser

# Variables d'environnement de production
ENV FLASK_ENV=production \
    FLASK_APP=core/app.py \
    PYTHONPATH=/app \
    PORT=5001

# Exposer le port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5001/ || exit 1

# Point d'entrée
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Commande par défaut (Gunicorn)
CMD ["gunicorn", "--config", "config/gunicorn.conf.py", "core.app:app"]


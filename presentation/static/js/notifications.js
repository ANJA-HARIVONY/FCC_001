/**
 * Sistema de Notificaciones para Incidencias Pendientes
 * Verifica cada 30 minutos si hay incidencias pendientes > 30 minutos
 * Muestra notificaciones toast amarillas en la esquina superior derecha
 */

class NotificationSystem {
    constructor() {
        this.container = document.getElementById('notification-container');
        this.checkInterval = 30 * 60 * 1000; // 30 minutos en milisegundos
        this.commentCheckInterval = 30 * 1000; // contador de comentarios mas reactivo
        this.notificationDuration = 5 * 1000; // 5 segundos en milisegundos
        this.isActive = true;
        this.shownNotifications = new Set(); // Para evitar duplicados
        this.commentCountEl = document.getElementById('comment-notification-count');
        this.commentHeaderCountEl = document.getElementById('comment-notification-header-count');
        this.commentListEl = document.getElementById('comment-notification-list');
        // Etat audio pour le son ding-dong
        this.audioContext = null;
        this.audioUnlocked = false;
        // Suivi des notifications de commentaires deja connues (pour detecter les nouvelles)
        this.knownCommentNotificationIds = new Set();
        this.commentNotificationsInitialized = false;

        this.init();
    }
    
    init() {
        // Verificar inmediatamente al cargar la página
        this.checkPendingIncidents();
        this.checkCommentNotifications();
        
        // Configurar verificación periódica cada 30 minutos
        setInterval(() => {
            if (this.isActive) {
                this.checkPendingIncidents();
            }
        }, this.checkInterval);

        setInterval(() => {
            if (this.isActive) {
                this.checkCommentNotifications();
            }
        }, this.commentCheckInterval);

        // Debloquer le contexte audio au premier geste utilisateur
        // (les navigateurs bloquent l'autoplay tant qu'il n'y a pas eu d'interaction)
        this.setupAudioUnlock();
    }

    setupAudioUnlock() {
        const unlock = () => {
            this.ensureAudioContext();
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(() => {});
            }
            this.audioUnlocked = true;
            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('click', unlock, { once: false });
        window.addEventListener('keydown', unlock, { once: false });
        window.addEventListener('touchstart', unlock, { once: false });
    }

    ensureAudioContext() {
        if (this.audioContext) {
            return this.audioContext;
        }
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            return null;
        }
        try {
            this.audioContext = new AudioCtx();
        } catch (error) {
            console.warn('No se pudo inicializar AudioContext', error);
            this.audioContext = null;
        }
        return this.audioContext;
    }

    playDingDong() {
        const ctx = this.ensureAudioContext();
        if (!ctx) {
            return;
        }
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        // Deux tonalites enchainees: "ding" plus aigu puis "dong" plus grave
        const now = ctx.currentTime;
        this.playTone(ctx, 880, now, 0.35);            // Ding (A5)
        this.playTone(ctx, 587.33, now + 0.32, 0.45);  // Dong (D5)
    }

    playTone(ctx, frequency, startTime, duration) {
        try {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, startTime);
            // Enveloppe ADSR simple pour eviter les clicks et adoucir le son
            const peak = 0.18;
            gain.gain.setValueAtTime(0.0001, startTime);
            gain.gain.exponentialRampToValueAtTime(peak, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
            oscillator.connect(gain);
            gain.connect(ctx.destination);
            oscillator.start(startTime);
            oscillator.stop(startTime + duration + 0.05);
        } catch (error) {
            console.warn('Error al reproducir tono', error);
        }
    }
    
    async checkPendingIncidents() {
        try {
            const response = await fetch('/api/incidents-pendientes');
            const data = await response.json();
            
            if (data.success && data.notifications && data.notifications.length > 0) {
                // Mostrar notificaciones para incidencias nuevas
                let playedSound = false;
                data.notifications.forEach(incident => {
                    const notificationId = `incident-${incident.id}`;
                    
                    // Solo mostrar si no se ha mostrado ya en esta sesión
                    if (!this.shownNotifications.has(notificationId)) {
                        this.showNotification(incident);
                        this.shownNotifications.add(notificationId);

                        // Reproducir el ding-dong una sola vez por lote, solo
                        // si el usuario ya interactuo con la pagina (autoplay).
                        if (!playedSound && this.audioUnlocked) {
                            this.playDingDong();
                            playedSound = true;
                        }

                        // Remover de la lista después de 1 hora para permitir nuevas notificaciones
                        setTimeout(() => {
                            this.shownNotifications.delete(notificationId);
                        }, 60 * 60 * 1000); // 1 hora
                    }
                });
            }
        } catch (error) {
            console.error('Error al verificar incidencias pendientes:', error);
        }
    }

    async checkCommentNotifications() {
        if (!this.commentCountEl || !this.commentListEl) {
            return;
        }

        try {
            const response = await fetch('/api/notificaciones/comentarios');
            const data = await response.json();

            if (!data.success) {
                console.error('Error al verificar notificaciones de comentarios:', data.error);
                return;
            }

            this.updateCommentNotificationUi(data.count || 0, data.notifications || []);
        } catch (error) {
            console.error('Error al verificar notificaciones de comentarios:', error);
        }
    }

    updateCommentNotificationUi(count, notifications) {
        this.updateCountBadge(this.commentCountEl, count);
        this.updateCountBadge(this.commentHeaderCountEl, count);

        // Detectar las notificaciones nuevas para reproducir el ding-dong
        // Al primer chequeo, solo se memoriza el estado existente sin sonido,
        // para no spammear al usuario con notificaciones ya antiguas.
        const currentIds = new Set();
        let hasNewNotification = false;
        notifications.forEach(notification => {
            if (notification && notification.id != null) {
                const idKey = String(notification.id);
                currentIds.add(idKey);
                if (this.commentNotificationsInitialized
                    && !this.knownCommentNotificationIds.has(idKey)) {
                    hasNewNotification = true;
                }
            }
        });
        this.knownCommentNotificationIds = currentIds;
        if (!this.commentNotificationsInitialized) {
            this.commentNotificationsInitialized = true;
        } else if (hasNewNotification && this.audioUnlocked) {
            this.playDingDong();
        }

        if (!notifications.length) {
            this.commentListEl.innerHTML = '<div class="dropdown-item-text small text-muted">No hay notificaciones sin leer.</div>';
            return;
        }

        this.commentListEl.innerHTML = notifications.map(notification => {
            const message = this.escapeHtml(notification.message);
            const createdAt = this.escapeHtml(notification.cree_le || '');
            const url = this.escapeAttribute(notification.url || '#');

            return `
                <a class="dropdown-item notification-menu-item" href="${url}">
                    <div class="fw-semibold text-wrap">${message}</div>
                    <small class="text-muted">
                        <i class="fas fa-clock me-1"></i>${createdAt}
                    </small>
                </a>
            `;
        }).join('');
    }

    updateCountBadge(element, count) {
        if (!element) {
            return;
        }
        element.textContent = count > 99 ? '99+' : String(count);
        element.classList.toggle('d-none', count <= 0);
    }

    escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    }

    escapeAttribute(value) {
        return this.escapeHtml(value).replace(/"/g, '&quot;');
    }
    
    showNotification(incident) {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        
        // Determinar si es una notificación reciente (≤ 2h) o antigua (> 2h)
        const isRecent = this.isRecentNotification(incident.tiempo_transcurrido);
        notification.className = isRecent ? 'notification-toast notification-recent' : 'notification-toast';
        notification.setAttribute('data-incident-id', incident.id);
        
        notification.innerHTML = `
            <div class="notification-header">
                <div style="display: flex; align-items: center;">
                    <i class="fas fa-exclamation-triangle notification-icon"></i>
                    <span class="notification-title">Incidencia Pendiente</span>
                </div>
                <button class="notification-close" onclick="notificationSystem.closeNotification(this.closest('.notification-toast'))">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-body">
                <div><strong>Operador:</strong> <span class="notification-operador">${incident.operateur_nom}</span></div>
                <div><strong>Tarea nº:</strong> <span class="notification-client"><a href="/incidents/${incident.id}/fiche_incident">#${incident.id}</a></span></div>
                <div><strong>Cliente:</strong> <span class="notification-client">${incident.client_nom}</span></div>
                <div><strong>Asunto:</strong> ${incident.intitule}</div>
                <div class="notification-tiempo">⏰ Tiempo transcurrido: ${incident.tiempo_transcurrido}</div>
            </div>
        `;
        
        // Agregar al contenedor
        this.container.appendChild(notification);
        
        // Auto-cerrar después de 15 segundos
        setTimeout(() => {
            this.closeNotification(notification);
        }, this.notificationDuration);
    }
    
    isRecentNotification(tiempoTranscurrido) {
        // Parser le temps pour déterminer si ≤ 2h
        // Format attendu: "2h 15m" ou "1h 30m" ou "45m" ou "3h"
        const hoursMatch = tiempoTranscurrido.match(/(\d+)h/);
        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        
        return hours <= 2;
    }
    
    closeNotification(notification) {
        if (notification && notification.parentNode) {
            // Agregar clase de animación de salida
            notification.classList.add('hiding');
            
            // Remover del DOM después de la animación
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300); // Duración de la animación de salida
        }
    }
    
    // Método para pausar/reanudar el sistema
    toggleActive() {
        this.isActive = !this.isActive;
    }
    
    // Método para limpiar todas las notificaciones
    clearAllNotifications() {
        const notifications = this.container.querySelectorAll('.notification-toast');
        notifications.forEach(notification => {
            this.closeNotification(notification);
        });
        this.shownNotifications.clear();
    }
}

// Inicializar el sistema cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar si el contenedor existe
    if (document.getElementById('notification-container')) {
        window.notificationSystem = new NotificationSystem();
    }
});

// Función global para cerrar notificaciones (usada en el HTML)
function closeNotification(element) {
    if (window.notificationSystem) {
        window.notificationSystem.closeNotification(element);
    }
}

// Funciones de utilidad para desarrollo/debug
window.debugNotifications = {
    // Forzar verificación inmediata
    check: () => {
        if (window.notificationSystem) {
            window.notificationSystem.checkPendingIncidents();
        }
    },
    
    // Alternar sistema activo/inactivo
    toggle: () => {
        if (window.notificationSystem) {
            window.notificationSystem.toggleActive();
        }
    },
    
    // Limpiar todas las notificaciones
    clear: () => {
        if (window.notificationSystem) {
            window.notificationSystem.clearAllNotifications();
        }
    },
    
    // Mostrar notificación de prueba
    test: () => {
        if (window.notificationSystem) {
            const testIncident = {
                id: 999,
                intitule: 'Problema de conectividad - PRUEBA',
                client_nom: 'Cliente de Prueba',
                operateur_nom: 'Operador Test',
                tiempo_transcurrido: '2h 15m',
                fecha_creacion: '08/01/2025 10:30'
            };
            window.notificationSystem.showNotification(testIncident);
        }
    },

    // Probar el sonido ding-dong
    playSound: () => {
        if (window.notificationSystem) {
            window.notificationSystem.playDingDong();
        }
    }
};

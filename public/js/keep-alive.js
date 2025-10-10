// Keep-Alive para mantener la sesión activa
(function() {
    'use strict';

    // Configuración
    const PING_INTERVAL = 25 * 1000; // 25 segundos
    const PING_URL = '/api/keep-alive';
    const MAX_RETRIES = 3;
    let retryCount = 0;
    let isActive = true;
    let pingInterval;

    // Función para hacer ping al servidor
    async function pingServer() {
        if (!isActive) return;

        try {
            const response = await fetch(PING_URL, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                retryCount = 0; // Reiniciar contador de reintentos
                console.log(`[${new Date().toISOString()}] Keep-alive ping successful`);
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Keep-alive error:`, error);
            
            // Reintentar en caso de error
            retryCount++;
            if (retryCount >= MAX_RETRIES) {
                console.warn(`[${new Date().toISOString()}] Max retries reached, stopping keep-alive`);
                stopKeepAlive();
            }
        }
    }

    // Iniciar el keep-alive
    function startKeepAlive() {
        if (pingInterval) return;
        
        console.log(`[${new Date().toISOString()}] Starting keep-alive (interval: ${PING_INTERVAL/1000}s)`);
        
        // Hacer ping inmediatamente
        pingServer();
        
        // Y luego cada intervalo
        pingInterval = setInterval(pingServer, PING_INTERVAL);
        
        // También hacer ping cuando la pestaña vuelve a estar visible
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Detener el keep-alive
    function stopKeepAlive() {
        if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
            console.log(`[${new Date().toISOString()}] Keep-alive stopped`);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    }

    // Manejar cambios de visibilidad
    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            if (!pingInterval) {
                startKeepAlive();
            } else {
                // Hacer ping inmediatamente cuando la pestaña vuelve a estar visible
                pingServer();
            }
        }
    }

    // Iniciar cuando el documento esté listo
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // Esperar un poco para que otros scripts se carguen
        setTimeout(startKeepAlive, 1000);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(startKeepAlive, 1000);
        });
    }

    // Limpiar al cerrar la pestaña
    window.addEventListener('beforeunload', () => {
        isActive = false;
        stopKeepAlive();
    });
})();

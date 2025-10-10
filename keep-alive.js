// ====================================
// KEEP-ALIVE DEL SERVIDOR
// ====================================
if (typeof require !== 'undefined' && require.main === module) {
    // Este código solo se ejecutará en el servidor
    const fetch = require('node-fetch');
    require('dotenv').config();

    // URL de tu aplicación (cámbiala por la URL de tu aplicación cuando esté desplegada)
    const APP_URL = process.env.APP_URL || 'http://localhost:3002';
    // Tiempo entre pings en milisegundos (14 minutos = 840,000 ms)
    const PING_INTERVAL = 14 * 60 * 1000;

    /**
     * Función para hacer ping a la aplicación
     */
    async function pingApp() {
        try {
            console.log(`[${new Date().toISOString()}] Enviando ping a la aplicación...`);
            const response = await fetch(APP_URL);
            const data = await response.text();
            console.log(`[${new Date().toISOString()}] Ping exitoso:`, data.substring(0, 100) + '...');
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error al hacer ping:`, error.message);
        }
    }

    // Iniciar el keep-alive
    console.log(`[${new Date().toISOString()}] Iniciando keep-alive del servidor...`);
    pingApp(); // Ejecutar inmediatamente al inicio
    setInterval(pingApp, PING_INTERVAL); // Luego cada 14 minutos
}

// ====================================
// KEEP-ALIVE DEL CLIENTE
// ====================================
if (typeof window !== 'undefined') {
    // Este código solo se ejecutará en el navegador
    document.addEventListener('DOMContentLoaded', function() {
        // URL de la API para hacer ping (puede ser la misma que la página principal o un endpoint específico)
        const PING_URL = window.location.origin;
        // Tiempo entre pings en milisegundos (5 minutos = 300,000 ms)
        const CLIENT_PING_INTERVAL = 5 * 60 * 1000;
        
        // Función para hacer ping desde el cliente
        async function clientPing() {
            try {
                console.log(`[${new Date().toISOString()}] [Cliente] Enviando ping...`);
                const response = await fetch(PING_URL, {
                    method: 'HEAD', // Usamos HEAD para minimizar el tráfico
                    cache: 'no-store' // Evitar caché
                });
                console.log(`[${new Date().toISOString()}] [Cliente] Ping exitoso, estado:`, response.status);
            } catch (error) {
                console.error(`[${new Date().toISOString()}] [Cliente] Error al hacer ping:`, error.message);
            }
        }

        // Iniciar el keep-alive del cliente
        console.log(`[${new Date().toISOString()}] [Cliente] Iniciando keep-alive del cliente...`);
        clientPing(); // Ejecutar inmediatamente al cargar la página
        const clientInterval = setInterval(clientPing, CLIENT_PING_INTERVAL);

        // También podemos usar el evento de visibilidad para ser más eficientes
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                // Cuando la pestaña vuelve a estar visible, hacer un ping
                clientPing();
            }
        });
    });
}

console.log(`🚀 Iniciando keep-alive para ${APP_URL}`);
console.log(`🔄 Haciendo ping cada ${PING_INTERVAL / 60000} minutos\n`);

// Hacer ping inmediatamente al iniciar
pingApp();

// Configurar intervalo para hacer ping periódicamente
setInterval(pingApp, PING_INTERVAL);

// Manejar cierre del proceso
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo keep-alive...');
    process.exit(0);
});

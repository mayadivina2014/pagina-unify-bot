const fetch = require('node-fetch');
require('dotenv').config();

// URL de tu aplicación (cámbiala por la URL de tu aplicación cuando esté desplegada)
const APP_URL = process.env.APP_URL || 'http://localhost:3002';
// Tiempo entre pings en milisegundos (25 minutos = 1,500,000 ms)
const PING_INTERVAL = 25 * 60 * 1000;

/**
 * Función para hacer ping a la aplicación
 */
async function pingApp() {
    try {
        const response = await fetch(APP_URL);
        const data = await response.json();
        console.log(`[${new Date().toISOString()}] Ping exitoso:`, data.message);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error al hacer ping:`, error.message);
    }
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

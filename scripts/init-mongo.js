require('dotenv').config();
const mongoose = require('mongoose');
const ServerConfig = require('../models/ServerConfig');

async function init() {
    try {
        const options = {
            ...JSON.parse(process.env.MONGODB_OPTIONS),
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            family: 4
        };

        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, options);
        console.log('✅ Conexión a MongoDB establecida correctamente');

        // Verificar si la colección ya existe
        const collections = await mongoose.connection.db.listCollections({ name: 'serverconfigs' }).toArray();
        
        if (collections.length === 0) {
            console.log('🔨 Creando colección serverconfigs...');
            await mongoose.connection.db.createCollection('serverconfigs');
            console.log('✅ Colección serverconfigs creada correctamente');
        } else {
            console.log('ℹ️  La colección serverconfigs ya existe');
        }

        // Crear índices si es necesario
        console.log('🔍 Creando índices...');
        await ServerConfig.init();
        console.log('✅ Índices creados correctamente');

        // Cerrar la conexión
        await mongoose.connection.close();
        console.log('👋 Conexión cerrada');
    } catch (error) {
        console.error('❌ Error en el script de inicialización:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Manejar promesas no manejadas
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

init();

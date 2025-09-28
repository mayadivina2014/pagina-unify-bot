const mongoose = require('mongoose');

const welcomeMessageSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: '' },
    message: { type: String, default: '¡Bienvenido {user} al servidor!' },
    imageUrl: { type: String, default: '' },
    embed: {
        enabled: { type: Boolean, default: false },
        title: { type: String, default: '¡Bienvenido!' },
        description: { type: String, default: 'Bienvenido {user} a {server}!' },
        color: { type: String, default: '#0099ff' },
        thumbnail: { type: Boolean, default: true },
        footer: { type: String, default: 'Gracias por unirte' }
    }
});

const serverConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    guildName: { type: String, required: true },
    welcome: welcomeMessageSchema,
    // Agregaremos más configuraciones aquí más adelante
}, { timestamps: true });

// Crear el modelo
const ServerConfig = mongoose.model('ServerConfig', serverConfigSchema);

// Método para inicializar índices
ServerConfig.init = async function() {
    try {
        // Crear índice único en guildId
        await this.collection.createIndex({ guildId: 1 }, { unique: true });
        console.log('✅ Índice creado en guildId');
        
        // Agregar más índices según sea necesario
        // await this.collection.createIndex({ /* campos */ });
        
        return true;
    } catch (error) {
        console.error('Error al crear índices:', error);
        throw error;
    }
};

module.exports = ServerConfig;

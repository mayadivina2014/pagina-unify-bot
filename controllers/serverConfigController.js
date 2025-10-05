const ServerConfig = require('../models/ServerConfig');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

// Obtener o crear configuración del servidor
exports.getOrCreateConfig = async (guildId, guildName) => {
    let config = await ServerConfig.findOne({ guildId });
    
    if (!config) {
        config = new ServerConfig({
            guildId,
            guildName,
            welcome: {
                enabled: false,
                message: '¡Bienvenido {user} al servidor!',
                channelId: '',
                imageUrl: '',
                embed: {
                    enabled: true,
                    title: '¡Bienvenido!',
                    description: 'Bienvenido {user} a {server}!',
                    color: '#0099ff',
                    thumbnail: true,
                    footer: 'Gracias por unirte'
                }
            }
        });
        await config.save();
    } else if (config.guildName !== guildName) {
        // Actualizar el nombre del servidor si ha cambiado
        config.guildName = guildName;
        await config.save();
    }
    
    return config;
};

// Obtener canales del servidor
exports.getServerChannels = async (guildId) => {
    try {
        const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN);
        
        // Obtener canales de texto del servidor
        const channels = await rest.get(Routes.guildChannels(guildId));
        
        // Filtrar solo canales de texto
        const textChannels = channels
            .filter(channel => channel.type === 0) // 0 = GUILD_TEXT
            .map(channel => ({
                id: channel.id,
                name: channel.name,
                type: 'text'
            }));
            
        return { success: true, channels: textChannels };
    } catch (error) {
        console.error('Error al obtener canales del servidor:', error);
        return { success: false, error: 'No se pudieron cargar los canales del servidor' };
    }
}
// Actualizar configuración de bienvenida
exports.updateWelcomeConfig = async (guildId, welcomeData) => {
    try {
        // Ensure default values for variables
        const defaultWelcome = {
            enabled: false,
            message: '¡Bienvenido {user.mention} al servidor!',
            channelId: '',
            imageUrl: '',
            embed: {
                enabled: true,
                title: '¡Bienvenido!',
                description: 'Bienvenido {user.mention} a {guild.name}!',
                color: '#0099ff',
                thumbnail: true,
                footer: 'Gracias por unirte'
            }
        };

        // Merge with provided data
        const config = {
            ...defaultWelcome,
            ...welcomeData,
            embed: {
                ...defaultWelcome.embed,
                ...(welcomeData.embed || {})
            }
        };

        // Save to database
        const updatedConfig = await ServerConfig.findOneAndUpdate(
            { guildId },
            { $set: { welcome: config } },
            { new: true, upsert: true }
        );

        return { 
            success: true, 
            config,
            message: 'Configuración de bienvenida actualizada correctamente'
        };
    } catch (error) {
        console.error('Error updating welcome config:', error);
        return { 
            success: false, 
            error: 'Error al guardar la configuración',
            details: error.message
        };
    }
};

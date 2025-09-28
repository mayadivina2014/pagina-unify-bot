const fetch = require('node-fetch');

// Función para verificar si el bot está en un servidor específico
async function isBotInGuild(guildId) {
    try {
        const botUserId = process.env.DISCORD_CLIENT_ID;
        if (!botUserId) {
            console.error('DISCORD_CLIENT_ID no está definido en las variables de entorno');
            return false;
        }

        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (!botToken) {
            console.error('DISCORD_BOT_TOKEN no está definido en las variables de entorno');
            return false;
        }

        console.log(`🔍 Verificando bot en servidor ${guildId} con ID de aplicación ${botUserId}`);

        const response = await fetch(`https://discord.com/api/guilds/${guildId}/members/${botUserId}`, {
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 segundos de timeout
        });

        console.log(`📊 Respuesta de Discord para servidor ${guildId}:`, {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (response.status === 200) {
            console.log(`✅ Bot SÍ está en el servidor ${guildId}`);
            return true;
        } else if (response.status === 404) {
            console.log(`❌ Bot NO está en el servidor ${guildId}`);
            return false;
        } else if (response.status === 403) {
            console.log(`🚫 Sin permisos para verificar el bot en el servidor ${guildId}`);
            return false;
        } else if (response.status === 401) {
            console.log(`🔑 Token inválido para verificar el bot en el servidor ${guildId}`);
            return false;
        } else {
            try {
                const errorData = await response.json();
                console.error(`⚠️ Error inesperado al verificar el bot en el servidor ${guildId}:`, {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData
                });
            } catch (parseError) {
                console.error(`⚠️ Error inesperado al verificar el bot en el servidor ${guildId}:`, {
                    status: response.status,
                    statusText: response.statusText,
                    body: await response.text()
                });
            }
            return false;
        }
    } catch (error) {
        console.error(`💥 Excepción al verificar el bot en el servidor ${guildId}:`, error.message);
        return false;
    }
}

// Verificar la conexión a MongoDB
async function checkMongoDBConnection() {
    try {
        // Verificar el estado de la conexión
        const state = mongoose.connection.readyState;
        if (state !== 1) { // 1 = conectado
            console.error(`Estado de la conexión a MongoDB: ${state}`);
            return false;
        }
        
        // Ejecutar un comando simple para verificar la conexión
        await mongoose.connection.db.admin().ping();
        return true;
    } catch (error) {
        console.error('Error al verificar la conexión a MongoDB:', error);
        return false;
    }
}

// Obtener los servidores del usuario
exports.getUserGuilds = async (user) => {
    try {
        // Asegurar que user.guilds es un array (o un array vacío si es null/undefined)
        const userGuilds = user?.guilds ? (Array.isArray(user.guilds) ? user.guilds : []) : [];
        
        if (userGuilds.length === 0) {
            return [];
        }

        // Filtrar solo los servidores donde el usuario es administrador
        const adminGuilds = userGuilds.filter(guild => {
            const permissions = BigInt(guild.permissions || 0);
            const hasAdmin = (permissions & 0x8n) === 0x8n; // ADMINISTRATOR
            const canManageGuild = (permissions & 0x20n) === 0x20n; // MANAGE_GUILD
            return hasAdmin || canManageGuild;
        });

        // Verificar en cuáles de estos servidores está el bot
        const guildsWithBotStatus = [];
        
        for (const guild of adminGuilds) {
            try {
                const botInGuild = await isBotInGuild(guild.id);
                
                // Construir la URL del ícono del servidor
                let iconUrl = null;
                if (guild.icon) {
                    iconUrl = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128`;
                    
                    // Verificar si la URL es accesible
                    try {
                        const response = await fetch(iconUrl, { method: 'HEAD' });
                        if (!response.ok) {
                            // Si falla, intentar con formato png
                            iconUrl = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
                        }
                    } catch (error) {
                        console.error(`Error al verificar el ícono del servidor ${guild.id}:`, error);
                        iconUrl = null;
                    }
                }
                
                guildsWithBotStatus.push({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon,
                    iconUrl: iconUrl,
                    botInGuild,
                    hasAdmin: true
                });
            } catch (error) {
                console.error(`Error al procesar el servidor ${guild.id}:`, error);
            }
        }

        return guildsWithBotStatus;
    } catch (error) {
        console.error('Error en getUserGuilds:', error);
        return [];
    }
};

// Controlador para el dashboard
exports.getDashboard = async (req, res, next) => {
    if (!req.user) {
        return res.redirect('/');
    }

    try {
        // Asegurarnos de que req.user.guilds sea un array
        const userGuilds = Array.isArray(req.user.guilds) ? req.user.guilds : [];
        
        // Verificar en qué servidores tiene permisos de administración
        const guildsWithBotStatus = [];

        // Procesar los servidores uno por uno para mejor manejo de errores
        for (const guild of userGuilds) {
            try {
                // Verificar si es dueño (0x8) o tiene permisos de administrar servidor (0x20)
                const permissions = BigInt(guild.permissions || 0);
                const isOwner = (permissions & 0x8n) === 0x8n; // ADMINISTRATOR
                const canManageGuild = (permissions & 0x20n) === 0x20n; // MANAGE_GUILD
                const hasAdmin = isOwner || canManageGuild;

                console.log(`Procesando servidor: ${guild.name} (${guild.id}) - Admin: ${hasAdmin}`);

                // Verificar si el bot está en el servidor solo si el usuario tiene permisos
                let botInGuild = false;
                if (hasAdmin) {
                    console.log(`Verificando si el bot está en el servidor: ${guild.name}`);
                    botInGuild = await isBotInGuild(guild.id);
                    console.log(`Bot ${botInGuild ? 'sí' : 'no'} está en el servidor: ${guild.name}`);
                }

                // Construir la URL del ícono del servidor
                let iconUrl = null;
                if (guild.icon) {
                    // Usar formato webp para mejor calidad y rendimiento
                    iconUrl = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128`;

                    // Verificar si la URL es accesible
                    try {
                        const response = await fetch(iconUrl, { method: 'HEAD' });
                        if (!response.ok) {
                            // Si falla, intentar con formato png
                            iconUrl = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
                        }
                    } catch (error) {
                        console.error(`Error al verificar el ícono del servidor ${guild.id}:`, error);
                        iconUrl = null;
                    }
                }

                guildsWithBotStatus.push({
                    ...guild,
                    hasAdmin,
                    botInGuild,
                    iconUrl: iconUrl // Será null si no hay ícono o no es accesible
                });
            } catch (error) {
                console.error(`Error procesando el servidor ${guild.id}:`, error);
                // Continuar con el siguiente servidor en caso de error
                continue;
            }
        }

        // Filtrar solo los servidores donde el usuario es administrador
        const managedGuilds = guildsWithBotStatus.filter(guild => guild.hasAdmin);

        console.log('Servidores administrados:', managedGuilds.map(g => `${g.name} (${g.id}) - Bot: ${g.botInGuild ? 'Sí' : 'No'}`));
        
        // Renderizar la vista con las variables necesarias
        res.render('dashboard', { 
            title: 'Dashboard - Unify Bot',
            user: req.user || null,
            guilds: managedGuilds,
            dashboard: true,  // Asegurar que dashboard esté definido
            layout: 'layouts/main'
        });
    } catch (error) {
        console.error('Error en el dashboard:', error);
        res.status(500).send('Error al cargar el dashboard');
    }
};

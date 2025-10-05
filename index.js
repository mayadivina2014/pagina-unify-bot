require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const fetch = require('node-fetch');
const cors = require('cors');
const mongoose = require('mongoose');

// **IMPORTANTE: Módulo EJS-Mate**
const ejsMate = require('ejs-mate'); 
// Importar controladores (asumiendo que existen)
const dashboardController = require('./controllers/dashboardController');
const serverConfigController = require('./controllers/serverConfigController');
const authRoutes = require('./routes/auth');


// Configuración de MongoDB
const connectDB = async () => {
    try {
        // CORRECCIÓN DE ROBUSTEZ: Asegurarse de que MONGODB_OPTIONS no sea null o undefined
        const mongoOptionsRaw = process.env.MONGODB_OPTIONS || '{}';
        const options = {
            ...JSON.parse(mongoOptionsRaw),
            serverSelectionTimeoutMS: process.env.NODE_ENV === 'production' ? 30000 : 5000, // 30s en prod, 5s en dev
            socketTimeoutMS: 45000, // Tiempo de espera de los sockets
            family: 4, // Usar IPv4
            maxPoolSize: process.env.NODE_ENV === 'production' ? 10 : 5, // Pool de conexiones
            retryWrites: true,
            retryReads: true
        };
        
        console.log('Intentando conectar a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, options);
        console.log('✅ Conexión a MongoDB establecida correctamente');
    } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error.message);
        console.error('Stack trace:', error.stack);
        // Forzar la salida del proceso si no se puede conectar a MongoDB
        process.exit(1);
    }
};

// Función para verificar la conexión a MongoDB
async function checkMongoDBConnection() {
    try {
        const state = mongoose.connection.readyState;
        if (state === 1) { // 1 = conectado
            // Ejecutar un comando simple para verificar la conexión
            await mongoose.connection.db.admin().ping();
            return true;
        }

        // Si no está conectado pero estamos en desarrollo, no bloquear
        if (process.env.NODE_ENV === 'development') {
            console.warn(`MongoDB no está disponible (estado: ${state}). Continuando sin base de datos...`);
            return false;
        }

        console.error(`Estado de la conexión a MongoDB: ${state}`);
        return false;
    } catch (error) {
        // Si estamos en desarrollo, no bloquear por errores de MongoDB
        if (process.env.NODE_ENV === 'development') {
            console.warn('Error al verificar MongoDB (modo desarrollo):', error.message);
            return false;
        }
        console.error('Error al verificar la conexión a MongoDB:', error);
        return false;
    }
}

// Conectar a la base de datos
connectDB().catch(error => {
    console.error('Error en la conexión a MongoDB:', error);
    process.exit(1);
});

// Manejar eventos de conexión de Mongoose
mongoose.connection.on('error', err => {
    console.error('Error de conexión a MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Desconectado de MongoDB');
});

// Manejar cierre de la aplicación
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('Conexión a MongoDB cerrada debido a la terminación de la aplicación');
        process.exit(0);
    } catch (error) {
        console.error('Error al cerrar la conexión a MongoDB:', error);
        process.exit(1);
    }
});

const app = express();
const PORT = process.env.PORT || 3002;

// Configurar CORS
const corsOptions = {
    origin: function (origin, callback) {
        // Permitir solicitudes sin origen (como aplicaciones móviles o curl)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:3002',
            'http://localhost:3000',
            'https://unify-dashboard.onrender.com', // Tu dominio específico de render.com
            process.env.FRONTEND_URL // Si tienes un dominio personalizado
        ].filter(Boolean);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`Origen no permitido: ${origin}`);
            callback(new Error('No permitido por CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// 📢 CORRECCIÓN: Configuración de EJS-Mate para resolver el error 'layout is not defined'
app.engine('ejs', ejsMate); 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main'); // Especificar el layout por defecto
app.set('layout extractScripts', true); // Extraer scripts al final del body
app.set('layout extractStyles', true);  // Extraer estilos en el head

// Middlewares para procesar el cuerpo de la solicitud (JSON y URL-encoded)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar variables globales para las vistas
app.use((req, res, next) => {
    res.locals.title = 'Unify Bot';
    next();
});

// Configuración de Passport
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Configurar la estrategia de Discord
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'guilds', 'guilds.members.read'],
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        // Obtener los servidores del usuario
        const userGuilds = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }).then(res => res.json());

        // Añadir los servidores al perfil del usuario
        profile.guilds = userGuilds;
        
        // Guardar el token de acceso para usarlo después (ej: refresh)
        profile.accessToken = accessToken;

        return done(null, profile);
    } catch (error) {
        console.error('Error al obtener los servidores:', error);
        return done(error, null);
    }
}));

// Configuración de sesión
app.use(session({
    secret: process.env.SESSION_SECRET || 'tu_secreto_seguro',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Usar solo en HTTPS en producción
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 1 día
    }
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Configurar connect-flash
const flash = require('connect-flash');
app.use(flash());

// Middleware para hacer que el usuario y los mensajes flash estén disponibles en todas las vistas
app.use((req, res, next) => {
    res.locals.user = req.user;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// Configuración de archivos estáticos
const staticOptions = {
    setHeaders: (res, filePath) => {
        // Configurar los tipos MIME correctamente
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.wav': 'audio/wav',
            '.mp4': 'video/mp4',
            '.woff': 'application/font-woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject',
            '.otf': 'font/otf',
            '.wasm': 'application/wasm'
        };

        const ext = path.extname(filePath).toLowerCase();
        if (mimeTypes[ext]) {
            res.set('Content-Type', mimeTypes[ext]);
        }
    }
};

// Configurar encabezados de seguridad
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://code.jquery.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
        "font-src 'self' https: data: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.gstatic.com; " +
        "img-src 'self' data: https: http: blob:; " +
        "connect-src 'self' http://localhost:3002 https://discord.com https://cdn.discordapp.com ws://localhost:3002 https://cdn.jsdelivr.net; " +
        "frame-src 'self' https://discord.com;"
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Configuración mejorada para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
    etag: true,
    lastModified: true,
    maxAge: '1d',
    setHeaders: (res, path) => {
        // Deshabilitar el almacenamiento en caché para desarrollo
        if (process.env.NODE_ENV === 'development') {
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            res.set('Surrogate-Control', 'no-store');
        }
        
        // Configurar los tipos MIME correctamente
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
        
        // Verificar si el path es una cadena y tiene extensión
        if (typeof path === 'string') {
            const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
            if (mimeTypes[ext]) {
                res.set('Content-Type', mimeTypes[ext]);
            }
        }
    }
}));

// Middleware para depuración de archivos estáticos
app.use((req, res, next) => {
    console.log(`Solicitud a: ${req.originalUrl}`);
    next();
});

// Ruta para el favicon.ico
app.get('/favicon.ico', (req, res) => {
    res.redirect('/images/Logo_pagina.png');
});

// Ruta principal
app.get('/', (req, res) => {
    // Asegurarse de que el objeto de usuario esté disponible
    const user = req.user ? {
        id: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar,
        discriminator: req.user.discriminator
    } : null;
    
    res.render('index', { 
        title: 'Inicio',
        user: user,
        dashboard: false
    });
});

// Ruta para el dashboard
app.get('/dashboard', async (req, res, next) => {
    if (!req.user) {
        return res.redirect('/');
    }

    try {
        // Verificar la conexión a MongoDB (no bloquear si no está disponible)
        const isConnected = await checkMongoDBConnection();

        // Obtener los servidores usando el dashboardController que verifica si el bot está en cada servidor
        // Asumiendo que dashboardController.getUserGuilds existe
        const guilds = await dashboardController.getUserGuilds(req.user);

        // Generar el enlace de invitación del bot
        const botInvite = `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
        
        // Renderizar la vista del dashboard
        return res.render('dashboard', {
            title: 'Dashboard - Mis Servidores',
            user: req.user,
            guilds: guilds,
            dashboard: true,
            botInvite: botInvite
        });
    } catch (error) {
        console.error('Error en la ruta /dashboard:', error);
        return res.status(500).render('error', {
            title: 'Error del servidor',
            message: 'Ocurrió un error al cargar el dashboard. Por favor, inténtalo de nuevo más tarde.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Ruta para la configuración del servidor
app.get('/dashboard/:serverId', async (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }

    try {
        const { serverId } = req.params;
        
        // Verificar si el usuario es administrador del servidor
        const guild = req.user.guilds.find(g => g.id === serverId);
        if (!guild) {
            return res.status(404).render('error', {
                title: 'Servidor no encontrado',
                message: 'No se encontró el servidor especificado o no tienes permisos para acceder a él.'
            });
        }
        
        // Verificar permisos de administrador
        const permissions = BigInt(guild.permissions || 0);
        const isAdmin = (permissions & 0x8n) === 0x8n || (permissions & 0x20n) === 0x20n;
        if (!isAdmin) {
            return res.status(403).render('error', {
                title: 'Permisos insuficientes',
                message: 'No tienes permisos de administrador en este servidor.'
            });
        }
        
        // Verificar la conexión a MongoDB
        const isConnected = await checkMongoDBConnection();
        if (!isConnected) {
            throw new Error('No se pudo conectar a la base de datos');
        }
        
        // Obtener o crear la configuración del servidor
        const config = await serverConfigController.getOrCreateConfig(serverId, guild.name);
        
        // Pasar variables 'title' y 'dashboard' al layout
        return res.render('server/config', {
            title: `Configuración - ${guild.name}`, // Se necesita para el layout
            dashboard: true,                      // Se necesita para el layout
            guild: {
                id: guild.id,
                name: guild.name, 
                icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
                permissions: guild.permissions
            },
            config: config,
            user: req.user
        });
    } catch (error) {
        console.error('Error en la ruta de configuración del servidor:', error);
        // Se mejoró el manejo de errores para renderizar la vista 'error'
        res.status(500).render('error', {
            title: 'Error del servidor',
            message: 'Ocurrió un error al cargar la configuración. Por favor, inténtalo de nuevo más tarde.',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Implementaciones de rutas API y de control (recuperadas de tu funcionalidad original)

// Ruta para verificar el token del bot
app.get('/api/debug/bot-token', async (req, res) => {
    try {
        const botToken = process.env.DISCORD_BOT_TOKEN;
        const clientId = process.env.DISCORD_CLIENT_ID;

        if (!botToken || !clientId) {
            return res.status(500).json({
                error: 'Tokens no configurados',
                clientId: clientId ? 'OK' : 'MISSING',
                botToken: botToken ? 'OK' : 'MISSING'
            });
        }

        const response = await fetch('https://discord.com/api/users/@me', {
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        }); 

        const debugInfo = {
            clientId: clientId,
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString()
        };

        if (response.status === 200) {
            const botInfo = await response.json();
            debugInfo.botInfo = {
                id: botInfo.id,
                username: botInfo.username,
                discriminator: botInfo.discriminator,
                verified: botInfo.verified,
                mfa_enabled: botInfo.mfa_enabled
            };
            debugInfo.message = '✅ Token del bot es válido';
            debugInfo.valid = true;
        } else {
            debugInfo.message = `❌ Token inválido o error inesperado: ${response.status}`;
            debugInfo.valid = false;
        }

        res.json(debugInfo);
    } catch (error) {
        console.error('Error verificando token del bot:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// Ruta simplificada para verificar si el bot está en un servidor
app.get('/api/debug/simple-bot-check/:guildId', async (req, res) => {
    try {
        const { guildId } = req.params;
        const botToken = process.env.DISCORD_BOT_TOKEN;
        const clientId = process.env.DISCORD_CLIENT_ID;

        if (!botToken || !clientId) {
            return res.status(500).json({ error: 'Tokens no configurados' });
        }

        // Método 1: Verificar miembro directamente
        const memberResponse = await fetch(`https://discord.com/api/guilds/${guildId}/members/${clientId}`, {
            headers: {
                'Authorization': `Bot ${botToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const result = {
            guildId: guildId,
            botUserId: clientId,
            timestamp: new Date().toISOString(),
            status: memberResponse.status,
            botInGuild: memberResponse.status === 200
        };

        res.json(result);
    } catch (error) {
        console.error('Error en simple bot check:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// Ruta para refrescar guilds del usuario
app.post('/dashboard/refresh', async (req, res) => {
    if (!req.user || !req.user.accessToken) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const response = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
                'Authorization': `Bearer ${req.user.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener la lista de servidores desde Discord');
        }

        const guilds = await response.json();
        req.user.guilds = guilds;

        req.session.save(() => {
            res.json({ success: true, guilds: guilds.length });
        });
    } catch (error) {
        console.error('Error al actualizar la lista de servidores:', error);
        res.status(500).json({ error: 'Error al actualizar la lista de servidores' });
    }
});
app.get('/api/servers/:serverId/channels', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'No autorizado' });
    }

    try {
        const { serverId } = req.params;
        const guild = req.user.guilds.find(g => g.id === serverId);

        if (!guild) {
            return res.status(404).json({ success: false, error: 'Servidor no encontrado' });
        }

        const permissions = BigInt(guild.permissions || 0);
        const isAdmin = (permissions & 0x8n) === 0x8n || (permissions & 0x20n) === 0x20n;
        if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'No tienes permisos' });
        }
        
        // Asumiendo que serverConfigController.getServerChannels existe
        const result = await serverConfigController.getServerChannels(serverId);
        res.json(result);
    } catch (error) {
        console.error('Error al obtener canales del servidor:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// Ruta para probar el mensaje de bienvenida
app.post('/api/servers/:serverId/test-welcome', async (req, res) => {
    console.log('Test welcome request received:', {
        serverId: req.params.serverId,
        body: req.body,
        user: req.user ? { id: req.user.id, username: req.user.username } : 'No user'
    });

    try {
        const { serverId } = req.params;
        const { message, isEmbed, embed } = req.body;
        
        // Validación básica de la solicitud
        if (!req.user) {
            console.log('No user in session');
            return res.status(401).json({ success: false, error: 'No autorizado' });
        }

        // Validar que el servidor existe en los gremios del usuario
        const userGuild = req.user.guilds?.find(g => g.id === serverId);
        if (!userGuild) {
            console.log('User does not have access to this server');
            return res.status(403).json({ success: false, error: 'No tienes acceso a este servidor' });
        }

        // Verificar que el usuario tenga permisos en el servidor
        const hasPermission = (userGuild.permissions & 0x00000020) === 0x00000020; // MANAGE_GUILD
        if (!hasPermission) {
            console.log('User does not have MANAGE_GUILD permission');
            return res.status(403).json({ 
                success: false, 
                error: 'No tienes permisos de administración en este servidor' 
            });
        }

        // Obtener la configuración del servidor
        const ServerConfig = require('./models/ServerConfig');
        const serverConfig = await ServerConfig.findOne({ guildId: serverId });
        
        if (!serverConfig || !serverConfig.welcome || !serverConfig.welcome.channelId) {
            console.log('No welcome channel configured for server:', serverId);
            return res.status(400).json({ 
                success: false, 
                error: 'No hay un canal de bienvenida configurado. Por favor, configura un canal de bienvenida primero.'
            });
        }
        
        console.log('Server config found:', {
            welcomeChannel: serverConfig.welcome.channelId,
            welcomeEnabled: serverConfig.welcome.enabled
        });
        
        // Validar que el mensaje o embed tenga contenido
        if (!message && (!isEmbed || !embed || (!embed.title && !embed.description))) {
            return res.status(400).json({
                success: false,
                error: 'El mensaje de bienvenida no puede estar vacío. Por favor, proporciona un mensaje o configura un embed.'
            });
        }
        
        // Obtener información del servidor desde la API de Discord
        console.log('Fetching guild info from Discord API...');
        const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${serverId}`, {
            headers: {
                'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!guildResponse.ok) {
            const errorData = await guildResponse.text().catch(() => 'No se pudo leer el mensaje de error');
            console.error('Error al obtener información del servidor:', {
                status: guildResponse.status,
                statusText: guildResponse.statusText,
                error: errorData
            });
            
            if (guildResponse.status === 404) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'No se encontró el servidor. Asegúrate de que el bot esté en el servidor.'
                });
            } else if (guildResponse.status === 403) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'El bot no tiene permisos para ver este servidor.'
                });
            } else {
                return res.status(500).json({ 
                    success: false, 
                    error: `Error al obtener información del servidor: ${guildResponse.status} ${guildResponse.statusText}`
                });
            }
        }
        
        let guild;
        try {
            guild = await guildResponse.json();
            console.log('Guild info retrieved successfully:', {
                id: guild.id,
                name: guild.name,
                memberCount: guild.approximate_member_count
            });
        } catch (error) {
            console.error('Error al procesar la respuesta del servidor:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Error al procesar la información del servidor'
            });
        }

        // Enviar mensaje de prueba al canal
        const channelId = serverConfig.welcome.channelId;
        const botToken = process.env.DISCORD_BOT_TOKEN;
        
        let discordResponse;
        
        if (isEmbed && embed) {
            try {
                // Obtener información del usuario con valores por defecto
                const userId = req.user.discordId || req.user.id || '123456789012345678';
                const username = req.user.username || 'Usuario';
                const discriminator = req.user.discriminator || '0000';
                const avatar = req.user.avatar || (userId % 5); // Usar un avatar por defecto basado en el ID
                const guildName = guild?.name || serverConfig?.guildName || 'este servidor';
                const memberCount = guild?.approximate_member_count || 'muchos';

                // Crear objeto con todas las variables disponibles
                const variables = {
                    // Variables básicas (para compatibilidad)
                    'user': username,
                    'server': guildName,
                    'guild': guildName,
                    
                    // Información del usuario
                    'user.name': username,
                    'user.tag': `${username}#${discriminator}`,
                    'user.mention': `<@${userId}>`,
                    'user.id': userId,
                    'user.avatar': `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`,
                    'user.avatarURL': `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`,
                    'user.discriminator': discriminator,
                    
                    // Información del servidor
                    'server.name': guildName,
                    'guild.name': guildName,
                    'server.id': serverId,
                    'guild.id': serverId,
                    'server.memberCount': memberCount,
                    'guild.memberCount': memberCount,
                    
                    // Fechas
                    'date': new Date().toLocaleDateString('es-ES'),
                    'time': new Date().toLocaleTimeString('es-ES'),
                    'datetime': new Date().toLocaleString('es-ES'),
                    
                    // Mensajes predefinidos
                    'welcome.message': '¡Bienvenido al servidor!',
                    'welcome.rules': 'Por favor lee las reglas del servidor.'
                };

                // Función para reemplazar variables en el texto
                const replaceVariables = (text) => {
                    if (!text) return '';
                    
                    // Reemplazar todas las variables del objeto
                    let result = text;
                    Object.entries(variables).forEach(([key, value]) => {
                        if (value !== null && value !== undefined) {
                            // Reemplazar tanto {key} como {key.value}
                            result = result
                                .replace(new RegExp(`\\{${key}\\}`, 'g'), value)
                                .replace(new RegExp(`\\{${key.replace(/\./g, '\\.')}\\}`, 'g'), value);
                        }
                    });
                    
                    return result;
                };

                // Crear embed de prueba con valores por defecto
                let embedColor = 0x0099ff; // Valor por defecto
                
                // Manejar diferentes formatos de color
                if (embed.color) {
                    if (typeof embed.color === 'string') {
                        // Si es un string, quitar el # si existe y convertir a número
                        embedColor = parseInt(embed.color.replace('#', ''), 16);
                    } else if (typeof embed.color === 'number') {
                        // Si ya es un número, usarlo directamente
                        embedColor = embed.color;
                    }
                }
                
                const embedData = {
                    title: replaceVariables(embed.title) || '¡Bienvenido al servidor!',
                    description: replaceVariables(embed.description || '¡Hola {user.mention}! {welcome.message} {welcome.rules}'),
                    color: embedColor,
                    timestamp: new Date().toISOString(),
                    fields: [],
                    footer: {
                        text: `ID de usuario: ${userId}`,
                        icon_url: `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`
                    }
                };
                
                // Añadir thumbnail si está definido
                if (embed.thumbnail) {
                    embedData.thumbnail = { 
                        url: replaceVariables(embed.thumbnail.url || '') 
                    };
                }
                
                // Añadir imagen si está definida
                if (embed.image) {
                    embedData.image = { 
                        url: replaceVariables(embed.image.url || '') 
                    };
                }
                
                console.log('Enviando embed a Discord:', JSON.stringify(embedData, null, 2));
                
                // Enviar embed al canal
                discordResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bot ${botToken}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'UnifyBot (https://github.com/yourusername/unifybot, 1.0.0)'
                    },
                    body: JSON.stringify({
                        embeds: [embedData],
                        allowed_mentions: {
                            users: [req.user.discordId]
                        }
                    })
                });
            } catch (embedError) {
                console.error('Error al construir el embed:', embedError);
                return res.status(400).json({ 
                    success: false, 
                    error: 'Error en el formato del embed',
                    details: embedError.message 
                });
            }
        } else {
            // Función para reemplazar variables (versión simple para mensajes de texto)
            const replaceVariables = (text) => {
                if (!text) return '';
                
                const userVars = {
                    'user.name': req.user?.username || 'Usuario',
                    'user.tag': req.user?.username ? `${req.user.username}#${req.user.discriminator || '0000'}` : 'Usuario#0000',
                    'user.mention': req.user?.discordId ? `<@${req.user.discordId}>` : '@Usuario',
                    'user.id': req.user?.discordId || '0',
                    'server.name': serverConfig.guildName || 'este servidor',
                    'server.id': serverId,
                    'date': new Date().toLocaleDateString(),
                    'time': new Date().toLocaleTimeString()
                };
                
                let result = text;
                Object.entries(userVars).forEach(([key, value]) => {
                    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
                });
                
                return result;
            };
            
            const content = replaceVariables(message || '¡Hola {user.mention}! ¡Bienvenido a {server.name}!');
                
            discordResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });
        }
        
        if (!discordResponse.ok) {
            const error = await discordResponse.json();
            console.error('Error al enviar mensaje de prueba a Discord:', error);
            return res.status(discordResponse.status).json({ 
                success: false, 
                error: 'Error al enviar el mensaje de prueba',
                discordError: error
            });
        }
        
        res.json({ success: true, message: 'Mensaje de prueba enviado correctamente' });
        
    } catch (error) {
        console.error('Error en /api/servers/:serverId/test-welcome:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Ruta para actualizar la configuración de bienvenida
app.post('/api/servers/:serverId/welcome', express.json(), async (req, res) => {
    console.log('Update welcome config request:', {
        serverId: req.params.serverId,
        body: req.body,
        user: req.user ? { id: req.user.id, username: req.user.username } : 'No user'
    });

    if (!req.user) {
        return res.status(401).json({ success: false, error: 'No autorizado' });
    }

    try {
        const { serverId } = req.params;
        const guild = req.user.guilds.find(g => g.id === serverId);

        if (!guild) {
            return res.status(404).json({ success: false, error: 'Servidor no encontrado' });
        }

        const permissions = BigInt(guild.permissions || 0);
        const isAdmin = (permissions & 0x8n) === 0x8n || (permissions & 0x20n) === 0x20n;
        if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'No tienes permisos' });
        }

        // Asegurarse de que el cuerpo de la solicitud tenga los campos necesarios
        const welcomeConfig = {
            enabled: req.body.enabled || false,
            channelId: req.body.channelId,
            message: req.body.message || '',
            imageUrl: req.body.imageUrl || '',
            embed: {
                enabled: req.body.embed?.enabled || false,
                title: req.body.embed?.title || '¡Bienvenido!',
                description: req.body.embed?.description || 'Bienvenido {user.mention} a {server.name}!',
                color: req.body.embed?.color || '#0099ff',
                thumbnail: req.body.embed?.thumbnail || false,
                footer: req.body.embed?.footer || '',
                image: req.body.embed?.image || ''
            }
        };

        console.log('Saving welcome config:', welcomeConfig);

        // Actualizar la configuración
        const result = await serverConfigController.updateWelcomeConfig(serverId, welcomeConfig);
        
        if (result.success) {
            console.log('Configuración de bienvenida actualizada correctamente');
        } else {
            console.error('Error al guardar la configuración:', result.error);
        }

        res.json(result);
    } catch (error) {
        console.error('Error al actualizar configuración de bienvenida:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor al guardar la configuración' 
        });
    }
});


// Ruta para el cierre de sesión
app.get('/logout', (req, res, next) => {
    // Se usa el patrón moderno de Passport con callback
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

// Rutas de autenticación
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', 
    passport.authenticate('discord', { 
        failureRedirect: '/',
        successRedirect: '/dashboard'
    })
);

// Rutas de autenticación (si tienes un archivo routes/auth.js)
// app.use('/auth', authRoutes);

// Rutas para archivos estáticos (esto ya está en la configuración de express.static)
// app.use(express.static(path.join(__dirname, 'public')));


// Ruta para términos de servicio
app.get('/terminos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terminos.html'));
});

// Ruta para política de privacidad
app.get('/privacidad', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacidad.html'));
});

// Ruta para manejar recursos que no se encuentran (Manejo de 404)
app.use((req, res, next) => {
    console.log(`Solicitud a ruta no manejada: ${req.path}`);
    // Se mejoró el manejo de 404 para renderizar la vista 'error'
    res.status(404).render('error', {
        title: '404 - No Encontrado',
        message: `La página solicitada (${req.path}) no existe.`
    });
});

// Iniciar el servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    const baseUrl = process.env.NODE_ENV === 'production'
        ? `https://${process.env.FRONTEND_URL || 'unify-dashboard.onrender.com'}`
        : `http://localhost:${PORT}`;

    console.log(`🚀 Servidor iniciado en ${process.env.NODE_ENV === 'production' ? 'producción' : 'desarrollo'}`);
    console.log(`📍 Servidor escuchando en ${baseUrl}`);
    console.log('📋 Rutas disponibles:');
    console.log(`   GET  /`);
    console.log(`   GET  /dashboard`);
    console.log(`   GET  /dashboard/:serverId`);
    console.log(`   GET  /auth/discord`);
    console.log(`   GET  /auth/discord/callback`);
    console.log(`   GET  /logout`);
    console.log(`   POST /dashboard/refresh`);
    console.log(`   GET  /api/servers/:serverId/channels`);
    console.log(`   POST /api/servers/:serverId/welcome`);
    console.log(`   GET  /api/debug/bot-token`);
    console.log(`   GET  /api/debug/simple-bot-check/:guildId`);
    console.log(`   GET  /terminos`);
    console.log(`   GET  /privacidad`);
    console.log(`🌐 Página principal: ${baseUrl}`);
});

// Manejo de errores
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`El puerto ${PORT} está en uso. Por favor, cierra otras instancias del servidor.`);
    } else {
        console.error('Error al iniciar el servidor:', error.message);
    }
    process.exit(1);
});
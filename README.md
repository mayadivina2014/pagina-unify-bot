# Unify Bot - Sistema de DNI Internacional para Discord

Este es el sitio web para Unify Bot, un sistema de identificación para servidores de Discord con roles.

## 🚀 Despliegue en Render.com

### 1. Preparar el proyecto

Asegúrate de tener todos los archivos necesarios:
- `index.js` - Servidor principal
- `package.json` - Dependencias
- `.env` - Variables de entorno (NO subir a Git)
- `views/` - Plantillas EJS
- `public/` - Archivos estáticos
- `controllers/` - Controladores
- `models/` - Modelos de MongoDB

### 2. Variables de entorno requeridas

En render.com, configura las siguientes variables de entorno:

```bash
# Discord OAuth2
DISCORD_CLIENT_ID=tu_client_id_de_discord
DISCORD_CLIENT_SECRET=tu_client_secret_de_discord
DISCORD_CALLBACK_URL=https://tu-app-en-render.onrender.com/auth/discord/callback
DISCORD_BOT_TOKEN=tu_bot_token_de_discord

# Session
SESSION_SECRET=un_secreto_muy_seguro_y_aleatorio_para_produccion

# Server
PORT=3000
NODE_ENV=production

# Frontend URL
FRONTEND_URL=https://tu-app-en-render.onrender.com

# MongoDB
MONGODB_URI=tu_mongodb_connection_string
MONGODB_OPTIONS={"useNewUrlParser":true,"useUnifiedTopology":true,"appName":"sistem-international-bot"}
```

### 3. Pasos en Render.com

1. **Crear nuevo Web Service**
   - Conecta tu repositorio de GitHub
   - Selecciona el branch correcto

2. **Configuración del servicio**
   - **Runtime**: Node.js
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (para pruebas) o Paid

3. **Variables de entorno**
   - Copia las variables del paso 2
   - Asegúrate de que `DISCORD_CALLBACK_URL` use tu dominio de render.com

4. **Configuración adicional**
   - **Auto-Deploy**: Sí (para actualizaciones automáticas)
### 4. Configuración de Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Selecciona tu aplicación
3. En "OAuth2" → "Redirects", agrega:
   ```
   https://unify-dashboard.onrender.com/auth/discord/callback
   ```

### 5. Verificar despliegue

Una vez desplegada:
- La aplicación debería estar disponible en `https://unify-dashboard.onrender.com`
- Verifica que la conexión a MongoDB funcione
- Prueba la autenticación con Discord

## 🔧 Configuración local (desarrollo)

1. **Clonar el repositorio**
   ```bash
   git clone tu-repositorio
   cd pagina-unify-bot
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   - Copia `.env.example` a `.env`
   - Completa las variables necesarias

4. **Iniciar en desarrollo**
   ```bash
   npm run dev
   ```

## 📁 Estructura del proyecto

```
pagina-unify-bot/
├── controllers/          # Controladores de la aplicación
├── models/              # Modelos de MongoDB
├── public/              # Archivos estáticos (CSS, JS, imágenes)
├── routes/              # Rutas adicionales
├── views/               # Plantillas EJS
│   ├── layouts/         # Layouts principales
│   ├── partials/        # Partes reutilizables
│   ├── server/          # Páginas del dashboard
│   └── *.ejs           # Páginas principales
├── .env                 # Variables de entorno (NO subir)
├── .env.example         # Ejemplo de variables
├── .dockerignore        # Archivos a ignorar en Docker
├── Procfile            # Configuración para render.com
├── render.yaml         # Configuración adicional de render.com
├── index.js            # Servidor principal
├── package.json        # Dependencias
└── README.md          # Este archivo
```

## 🔐 Seguridad

- Nunca subas el archivo `.env` a Git
- Usa HTTPS en producción
- Configura CORS correctamente
- Usa secretos seguros para las sesiones

## 🚀 Características

- ✅ Autenticación con Discord OAuth2
- ✅ Dashboard para administradores
- ✅ Configuración de servidores
- ✅ Sistema de mensajes de bienvenida
- ✅ Integración con MongoDB
- ✅ Diseño responsivo con Bootstrap
- ✅ Soporte para temas claro/oscuro

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en render.com
2. Verifica las variables de entorno
3. Asegúrate de que MongoDB esté accesible
4. Comprueba la configuración de Discord OAuth2

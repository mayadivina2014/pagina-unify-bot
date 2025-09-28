const express = require('express');
const router = express.Router();
const passport = require('passport');
const fetch = require('node-fetch');

// Ruta para iniciar sesión con Discord
router.get('/discord', passport.authenticate('discord'));

// Ruta de callback después de la autenticación
router.get('/discord/callback', 
    passport.authenticate('discord', { 
        failureRedirect: '/' 
    }),
    (req, res) => {
        // Redirigir al dashboard después de la autenticación exitosa
        res.redirect('/dashboard');
    }
);

// Ruta para cerrar sesión
router.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// Ruta para actualizar la lista de servidores
router.post('/refresh-guilds', 
    passport.authenticate('session'),
    async (req, res) => {
        if (!req.user || !req.user.accessToken) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        try {
            // Obtener la lista actualizada de servidores
            const response = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: {
                    'Authorization': `Bearer ${req.user.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener la lista de servidores');
            }

            const guilds = await response.json();
            
            // Actualizar la lista de servidores en la sesión del usuario
            req.user.guilds = guilds;
            
            // Guardar los cambios en la sesión
            req.session.save(() => {
                res.json({ success: true });
            });
        } catch (error) {
            console.error('Error al actualizar servidores:', error);
            res.status(500).json({ error: 'Error al actualizar la lista de servidores' });
        }
    }
);

module.exports = router;

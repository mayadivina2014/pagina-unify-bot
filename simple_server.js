require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.json({ message: 'Servidor funcionando correctamente' });
});

app.get('/api/test', (req, res) => {
    res.json({ status: 'API funcionando' });
});

const server = app.listen(PORT, () => {
    console.log(`✅ Servidor básico funcionando en http://localhost:${PORT}`);
    console.log('✅ API disponible en /api/test');
});

server.on('error', (error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});

const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Conexión a MongoDB Atlas
mongoose.connect('', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Conexión exitosa a MongoDB Atlas');
  })
  .catch((error) => {
    console.error('Error al conectar a MongoDB Atlas:', error);
  });

// Configuración de vistas y rutas
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Importar las rutas de autenticación
const authRoutes = require('./routes/auth');

// Rutas de autenticación
app.use('/', authRoutes);

// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor escuchando en http://localhost:3000');
});

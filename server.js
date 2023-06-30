const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const sgMail = require('@sendgrid/mail');

const app = express();

// Configuración de SendGrid
sgMail.setApiKey('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'); // Reemplaza con tu propia clave de API de SendGrid

// Conexión a MongoDB Atlas
mongoose.connect('mongodb+srv://brigittrujillo:1234@cluster0.tmcoio0.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true }) // Reemplaza 'MONGODB_URI' con tu propia URL de conexión a MongoDB Atlas
  .then(() => {
    console.log('Conexión exitosa a MongoDB Atlas');
  })
  .catch((error) => {
    console.error('Error al conectar a MongoDB Atlas:', error);
  });

// Definición del modelo de usuario
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});

const User = mongoose.model('User', UserSchema);

// Configuración de vistas y rutas
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Ruta de registro
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Verificar si el usuario ya existe en la base de datos
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send('El usuario ya está registrado');
    }

    // Generar hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear un nuevo usuario
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    // Guardar el nuevo usuario en la base de datos
    await newUser.save();

    // Enviar correo de bienvenida
    const msg = {
      to: email,
      from: 'brigit.trujillo@tecsup.edu.pe', // Reemplaza con tu dirección de correo electrónico
      subject: '¡Bienvenido a nuestra aplicación!',
      text: 'Gracias por registrarte en nuestra aplicación.'
    };
    await sgMail.send(msg);

    res.send('Registro exitoso');
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.send('Error al registrar usuario');
  }
});

// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor escuchando en http://localhost:3000');
});

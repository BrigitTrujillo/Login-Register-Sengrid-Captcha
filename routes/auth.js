const express = require('express');
const bcrypt = require('bcrypt');
const sgMail = require('@sendgrid/mail');
const fetch = require('node-fetch');
const crypto = require('crypto');
const User = require('../models/user');

const router = express.Router();

// Configuración de SendGrid
sgMail.setApiKey('SendGrid');


router.get('/inicio', (req, res) => {
    res.render('inicio');
  });

  
// Ruta de registro
router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
  
      // Verifica si el usuario ya existe en la base de datos
      const existingUser = await User.findOne({ username });
  
      if (existingUser) {
        return res.send('El nombre de usuario ya está en uso');
      }
  
      // Generar el hash de la contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
  
      // Crear el nuevo usuario
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        blocked: false
      });
  
      // Guardar el usuario en la base de datos
      await newUser.save();
  
      // Enviar correo de bienvenida
      const msg = {
        to: email,
        from: 'brigit.trujillo@tecsup.edu.pe',
        subject: '¡Bienvenido a nuestra aplicación!',
        text: 'Gracias por registrarte en nuestra aplicación.'
      };
      await sgMail.send(msg);
  
      // Si no se producen errores al enviar el correo, se considera como enviado correctamente
      res.render('incio');
    } catch (error) {
      console.error('Error en el registro:', error);
      res.send('Error en el registro');
    }
  });
  


// Ruta de inicio de sesión
router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', async (req, res) => {
    try {
      const { username, email, password } = req.body;
  
      // Verificar el reCAPTCHA
      const recaptchaResponse = req.body['g-recaptcha-response'];
      const secretKey = ''; // Reemplaza con tu propia clave secreta de reCAPTCHA v3
      const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaResponse}`;
      const response = await fetch(verificationURL, { method: 'POST' });
      const data = await response.json();
  
      if (!data.success || data.score < 0.5) {
        return res.send('Por favor, completa el reCAPTCHA antes de iniciar sesión');
      }
  
      // Buscar al usuario en la base de datos
      // Buscar al usuario en la base de datos por dirección de correo electrónico
      const user = await User.findOne({ $or: [{ email }, { username }] });
  
      if (!user) {
        // Si el usuario no existe, mostrar un mensaje genérico para evitar revelar información sobre los datos incorrectos
        return res.send('Nombre de usuario y/o contraseña no válidos');
      }
  
      // Verificar si la cuenta está bloqueada
      if (user.blocked) {
        return res.send('Tu cuenta ha sido bloqueada.Por muchos intentos');
      }
  
      // Verificar la contraseña
      const passwordMatch = await bcrypt.compare(password, user.password);
  
      if (!passwordMatch) {
        // Si la contraseña no coincide, mostrar un mensaje genérico para evitar revelar información sobre los datos incorrectos
        user.loginAttempts += 1;
        await user.save();
  
        if (user.loginAttempts >= 3) {
          // Bloquear la cuenta después de 3 intentos fallidos
          user.blocked = true;
          await user.save();
          return res.send('Tu cuenta ha sido bloqueada debido a múltiples intentos fallidos de inicio de sesión. Por favor, contacta al administrador.');
        }
  
        return res.send('Nombre de usuario y/o contraseña no válidos');
      }
  
      // Restablecer el contador de intentos fallidos después de un inicio de sesión exitoso
      user.loginAttempts = 0;
      await user.save();
  
      // Inicio de sesión exitoso
      res.render('inicio'); 
    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
      res.send('Error en el inicio de sesión');
    }
  });



// Ruta de restablecimiento de contraseña
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

// Ruta de restablecimiento de contraseña
router.post('/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
  
      // Verificar si el correo electrónico existe en la base de datos
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.send('No se encontró ninguna cuenta asociada a este correo electrónico');
      }
  
      // Generar un token de restablecimiento de contraseña y almacenarlo en el documento del usuario
      const resetToken = crypto.randomBytes(20).toString('hex');
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000; // El token de restablecimiento expirará en 1 hora
      await user.save();
  
      // Enviar correo electrónico al usuario con el enlace de restablecimiento de contraseña
      const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`; // Reemplaza con tu propia URL de restablecimiento de contraseña
      const msg = {
        to: email,
        from: 'brigit.trujillo@tecsup.edu.pe',
        subject: 'Restablecimiento de contraseña',
        text: `Hola ${user.username},\n\nHas solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para completar el proceso:\n\n${resetLink}\n\nSi no solicitaste este restablecimiento de contraseña, puedes ignorar este correo.\n\nSaludos,\nEquipo de la aplicación`,
      };
      await sgMail.send(msg);
  
      res.send('Se ha enviado un correo electrónico con las instrucciones para restablecer tu contraseña');
    } catch (error) {
      console.error('Error en el restablecimiento de contraseña:', error);
      res.send('Error en el restablecimiento de contraseña');
    }
  });
  
  router.get('/reset-password', (req, res) => {
    const token = req.query.token; // Obtén el token de restablecimiento de contraseña de la URL
    res.render('reset-password', { token });
  });
  router.post('/reset-password', async (req, res) => {
    const { token, password, confirmPassword } = req.body;
  
    // Verifica si el token es válido y aún no ha expirado
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
  
    if (!user) {
      return res.send('El enlace de restablecimiento de contraseña no es válido o ha expirado');
    }
  
    if (password !== confirmPassword) {
      return res.send('Las contraseñas no coinciden');
    }
  
    // Genera un nuevo hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
  
    // Actualiza la contraseña del usuario en la base de datos
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
  
    res.send('Tu contraseña ha sido restablecida exitosamente');
  });
  

module.exports = router;

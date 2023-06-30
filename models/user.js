const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  blocked: Boolean,
  loginAttempts: {
    type: Number,
    default: 0
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

const User = mongoose.model('User', UserSchema);

module.exports = User;

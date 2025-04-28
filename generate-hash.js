const bcrypt = require('bcrypt');

const plaintextPassword = 'admin123'; // New password
const saltRounds = 10;

bcrypt.hash(plaintextPassword, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
  } else {
    console.log('New hash:', hash);
  }
});
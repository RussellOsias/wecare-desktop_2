const bcrypt = require('bcrypt');

// Stored hash from the database
const hashedPassword = '$2b$10$newGeneratedHashHere'; // Replace with your actual hash
const plaintextPassword = 'admin123'; // Provided by the user

bcrypt.compare(plaintextPassword, hashedPassword, (err, result) => {
  if (err) {
    console.error('Error during password comparison:', err);
  } else {
    console.log('Is password valid?', result);
  }
});
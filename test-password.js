const bcrypt = require('bcrypt');

// Test password verification
const verifyPassword = () => {
  const hashedPassword = '$2y$10$iCuQxcFWofJezsH9cIvOjOMuCsx.vxTeTBaEWfo1B1MgIOsSFqNbK'; // From the database
  const plaintextPassword = 'admin123'; // Provided by the user

  bcrypt.compare(plaintextPassword, hashedPassword, (err, result) => {
    if (err) {
      console.error('Error during password comparison:', err);
    } else {
      console.log('Is password valid?', result);
    }
  });
};

// Generate a new hash
const generateNewHash = () => {
  const plaintextPassword = 'admin123'; // New password
  const saltRounds = 10;

  bcrypt.hash(plaintextPassword, saltRounds, (err, hash) => {
    if (err) {
      console.error('Error generating hash:', err);
    } else {
      console.log('New hash:', hash);
    }
  });
};

// Run the functions
console.log('Verifying password...');
verifyPassword();

console.log('Generating new hash...');
generateNewHash();
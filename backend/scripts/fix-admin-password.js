/**
 * Quick script to generate a bcrypt hash for admin password
 * Run: node scripts/fix-admin-password.js <password>
 * Then use the SQL output to update the database
 */

const bcrypt = require('bcrypt');

const password = process.argv[2] || 'admin123';
const email = process.argv[3] || 'mamoo@gmail.com';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    process.exit(1);
  }
  
  console.log('\n========================================');
  console.log('Password Reset SQL Command:');
  console.log('========================================\n');
  console.log(`UPDATE users SET password = '${hash}' WHERE email = '${email}';`);
  console.log('\n========================================');
  console.log('Or use this in your database client:');
  console.log('========================================\n');
  console.log(`Email: ${email}`);
  console.log(`New Password: ${password}`);
  console.log(`Hashed Password: ${hash}\n`);
});

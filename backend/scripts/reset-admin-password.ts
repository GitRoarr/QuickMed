/**
 * Script to reset admin password
 * Run with: npx ts-node scripts/reset-admin-password.ts <email> <newPassword>
 * 
 * Example: npx ts-node scripts/reset-admin-password.ts mamoo@gmail.com newpassword123
 */

import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../src/users/entities/user.entity';

async function resetAdminPassword(email: string, newPassword: string) {
  // You'll need to configure your database connection
  // This is a simplified version - adjust based on your setup
  console.log(`Resetting password for: ${email}`);
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  console.log(`Hashed password: ${hashedPassword}`);
  console.log(`\nTo update in database, run this SQL:`);
  console.log(`UPDATE users SET password = '${hashedPassword}' WHERE email = '${email}';`);
  console.log(`\nOr use the admin service method if you have database access.`);
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: npx ts-node scripts/reset-admin-password.ts <email> <newPassword>');
  process.exit(1);
}

resetAdminPassword(email, password)
  .then(() => {
    console.log('\nPassword hash generated successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

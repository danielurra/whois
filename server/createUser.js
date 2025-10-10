// Script to create the default admin user
import bcrypt from 'bcryptjs';
import db from './db.js';

async function createUser() {
  try {
    const firstName = 'Amigo';
    const lastName = 'Allense';
    const email = 'amigo@amigo.com';
    const password = 'asusvc66';

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Check if user already exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM reguser WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      console.log('User already exists:', email);
      process.exit(0);
    }

    // Insert new user
    const [result] = await db.execute(
      'INSERT INTO reguser (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)',
      [firstName, lastName, email, passwordHash]
    );

    console.log('User created successfully!');
    console.log('ID:', result.insertId);
    console.log('Name:', firstName, lastName);
    console.log('Email:', email);
    console.log('Password:', password);

    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
}

createUser();

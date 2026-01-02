const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

async function main() {
  const username = 'admin@movex';
  const password = 'Admin@123';
  const role = 'admin';

  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role',
    [username.toLowerCase(), hash, role]
  );

  console.log('Admin user upserted');
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

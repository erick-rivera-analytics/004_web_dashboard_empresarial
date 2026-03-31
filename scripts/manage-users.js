#!/usr/bin/env node

/**
 * User Management Script
 *
 * Gestiona usuarios en la base de datos PostgreSQL
 *
 * Uso:
 *   node scripts/manage-users.js create <username> <password>
 *   node scripts/manage-users.js list
 *   node scripts/manage-users.js update <username> <newPassword>
 *   node scripts/manage-users.js delete <username>
 *   node scripts/manage-users.js reset-password <username>
 *
 * Ejemplos:
 *   node scripts/manage-users.js create maria miContraseña123
 *   node scripts/manage-users.js list
 *   node scripts/manage-users.js update admin nuevaContraseña456
 *   node scripts/manage-users.js delete maria
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DATABASE_HOST || '10.0.2.70',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'datalakehouse',
  user: process.env.DATABASE_USER || 'db_admin',
  password: process.env.DATABASE_PASSWORD || 'edramerl1403',
});

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createUser(username, password) {
  try {
    if (!username || !password) {
      log('❌ Uso: node scripts/manage-users.js create <username> <password>', 'red');
      return;
    }

    if (password.length < 6) {
      log('❌ La contraseña debe tener al menos 6 caracteres', 'red');
      return;
    }

    log('⏳ Creando usuario...', 'yellow');

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO public.users (username, password_hash) VALUES ($1, $2)',
      [username, hash]
    );

    log(`✅ Usuario '${username}' creado exitosamente`, 'green');
  } catch (error) {
    if (error.code === '23505') {
      log(`❌ El usuario '${username}' ya existe`, 'red');
    } else {
      log(`❌ Error: ${error.message}`, 'red');
    }
  }
}

async function listUsers() {
  try {
    log('⏳ Obteniendo usuarios...', 'yellow');

    const result = await pool.query(
      'SELECT id, username, is_active, created_at FROM public.users ORDER BY created_at DESC'
    );

    if (result.rows.length === 0) {
      log('📭 No hay usuarios en la base de datos', 'yellow');
      return;
    }

    log('\n📋 USUARIOS EN LA BD:\n', 'blue');
    result.rows.forEach((user, index) => {
      const status = user.is_active ? '✅ ACTIVO' : '❌ INACTIVO';
      log(`  ${index + 1}. ${user.username}`, 'green');
      log(`     ID: ${user.id} | Estado: ${status}`);
      log(`     Creado: ${user.created_at.toLocaleString()}`);
    });
    log('');
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
  }
}

async function updatePassword(username, newPassword) {
  try {
    if (!username || !newPassword) {
      log('❌ Uso: node scripts/manage-users.js update <username> <newPassword>', 'red');
      return;
    }

    if (newPassword.length < 6) {
      log('❌ La contraseña debe tener al menos 6 caracteres', 'red');
      return;
    }

    log('⏳ Actualizando contraseña...', 'yellow');

    const hash = await bcrypt.hash(newPassword, 10);

    const result = await pool.query(
      'UPDATE public.users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2 RETURNING username',
      [hash, username]
    );

    if (result.rows.length === 0) {
      log(`❌ Usuario '${username}' no encontrado`, 'red');
      return;
    }

    log(`✅ Contraseña de '${username}' actualizada`, 'green');
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
  }
}

async function deleteUser(username) {
  try {
    if (!username) {
      log('❌ Uso: node scripts/manage-users.js delete <username>', 'red');
      return;
    }

    if (username === 'admin') {
      log('⚠️  ¿Estás seguro que querés borrar el usuario admin?', 'yellow');
      log('    Ejecuta: node scripts/manage-users.js delete admin --force', 'yellow');
      return;
    }

    log('⏳ Eliminando usuario...', 'yellow');

    const result = await pool.query('DELETE FROM public.users WHERE username = $1 RETURNING username', [
      username,
    ]);

    if (result.rows.length === 0) {
      log(`❌ Usuario '${username}' no encontrado`, 'red');
      return;
    }

    log(`✅ Usuario '${username}' eliminado`, 'green');
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
  }
}

async function resetPassword(username) {
  try {
    if (!username) {
      log('❌ Uso: node scripts/manage-users.js reset-password <username>', 'red');
      return;
    }

    log('⏳ Reseteando contraseña a "password123"...', 'yellow');

    const hash = await bcrypt.hash('password123', 10);

    const result = await pool.query(
      'UPDATE public.users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2 RETURNING username',
      [hash, username]
    );

    if (result.rows.length === 0) {
      log(`❌ Usuario '${username}' no encontrado`, 'red');
      return;
    }

    log(`✅ Contraseña de '${username}' reseteada a "password123"`, 'green');
    log('⚠️  Cambiala inmediatamente con: update <username> <newPassword>', 'yellow');
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
  }
}

async function main() {
  const [, , command, arg1, arg2] = process.argv;

  try {
    switch (command) {
      case 'create':
        await createUser(arg1, arg2);
        break;
      case 'list':
        await listUsers();
        break;
      case 'update':
        await updatePassword(arg1, arg2);
        break;
      case 'delete':
        await deleteUser(arg1);
        break;
      case 'reset-password':
        await resetPassword(arg1);
        break;
      default:
        log('\n📖 USER MANAGEMENT SCRIPT\n', 'blue');
        log('Uso:', 'yellow');
        log('  node scripts/manage-users.js create <username> <password>');
        log('  node scripts/manage-users.js list');
        log('  node scripts/manage-users.js update <username> <newPassword>');
        log('  node scripts/manage-users.js delete <username>');
        log('  node scripts/manage-users.js reset-password <username>\n');
        log('Ejemplos:', 'yellow');
        log('  node scripts/manage-users.js create maria miContraseña123');
        log('  node scripts/manage-users.js list');
        log('  node scripts/manage-users.js update admin nuevaContraseña456');
        log('  node scripts/manage-users.js delete maria\n');
    }
  } catch (error) {
    log(`❌ Error fatal: ${error.message}`, 'red');
  } finally {
    await pool.end();
  }
}

main();

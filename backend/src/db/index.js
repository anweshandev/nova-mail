import knex from 'knex';
import config from '../../knexfile.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = process.env.NODE_ENV || 'development';

// Ensure data directory exists
const dbPath = config[env].connection.filename;
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

/**
 * Knex database instance
 * Uses SQLite with WAL mode for better concurrency
 */
const db = knex(config[env]);

// Periodic WAL checkpoint for production (every 5 minutes)
// Prevents WAL file from growing too large
if (env === 'production') {
  setInterval(() => {
    db.raw('PRAGMA wal_checkpoint(PASSIVE)')
      .catch(err => console.error('WAL checkpoint error:', err));
  }, 5 * 60 * 1000); // 5 minutes
}

// Optimize database on startup (production only)
if (env === 'production') {
  db.raw('PRAGMA optimize')
    .catch(err => console.error('Database optimize error:', err));
}

export default db;

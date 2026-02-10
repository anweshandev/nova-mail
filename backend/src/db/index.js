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

export default db;

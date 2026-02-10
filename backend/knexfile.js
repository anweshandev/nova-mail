import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Knex configuration for NovaMail
 * Uses SQLite with WAL mode for both development and production
 */
const config = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: process.env.DATABASE_PATH || path.join(__dirname, 'data', 'novamail.db'),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'src', 'db', 'migrations'),
    },
    pool: {
      afterCreate: (conn, done) => {
        // Enable WAL mode for better concurrency
        conn.pragma('journal_mode = WAL');
        // Enable foreign keys
        conn.pragma('foreign_keys = ON');
        // Optimize for performance
        conn.pragma('synchronous = NORMAL');
        conn.pragma('cache_size = -64000'); // 64MB cache
        conn.pragma('temp_store = MEMORY');
        done();
      },
    },
  },

  production: {
    client: 'better-sqlite3',
    connection: {
      filename: process.env.DATABASE_PATH || '/data/novamail.db',
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'src', 'db', 'migrations'),
    },
    pool: {
      afterCreate: (conn, done) => {
        // Enable WAL mode for better concurrency
        conn.pragma('journal_mode = WAL');
        // Enable foreign keys
        conn.pragma('foreign_keys = ON');
        // Optimize for performance
        conn.pragma('synchronous = NORMAL');
        conn.pragma('cache_size = -64000'); // 64MB cache
        conn.pragma('temp_store = MEMORY');
        done();
      },
    },
  },
};

export default config;

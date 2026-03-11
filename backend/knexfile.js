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
      min: 1,
      max: 1, // SQLite works best with single connection
      afterCreate: (conn, done) => {
        // Enable WAL mode for better concurrency
        conn.pragma('journal_mode = WAL');
        
        // Enable foreign keys
        conn.pragma('foreign_keys = ON');
        
        // Optimize for performance
        conn.pragma('synchronous = NORMAL');
        conn.pragma('cache_size = -64000'); // 64MB cache (smaller for dev)
        conn.pragma('temp_store = MEMORY');
        
        // Busy timeout: wait up to 3 seconds if database is locked
        conn.pragma('busy_timeout = 3000');
        
        // Memory-mapped I/O (512MB for dev - half of production)
        conn.pragma('mmap_size = 536870912');
        
        // WAL autocheckpoint
        conn.pragma('wal_autocheckpoint = 1000');
        
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
      min: 1,
      max: 1, // SQLite works best with single connection
      afterCreate: (conn, done) => {
        // Enable WAL mode for better concurrency and crash recovery
        conn.pragma('journal_mode = WAL');
        
        // Enable foreign keys
        conn.pragma('foreign_keys = ON');
        
        // NORMAL is safer than OFF, faster than FULL
        conn.pragma('synchronous = NORMAL');
        
        // 128MB cache for production (optimal for email server workload)
        // Note: compile-time default is 20MB, but we override for better performance
        conn.pragma('cache_size = -128000');
        
        // Store temp tables in memory
        conn.pragma('temp_store = MEMORY');
        
        // Busy timeout: wait up to 5 seconds if database is locked
        conn.pragma('busy_timeout = 5000');
        
        // Memory-mapped I/O for better read performance (1GB)
        // Matches compile-time SQLITE_MAX_MMAP_SIZE flag
        conn.pragma('mmap_size = 1073741824');
        
        // WAL autocheckpoint every 1000 pages (~4MB with 4KB pages)
        conn.pragma('wal_autocheckpoint = 1000');
        
        // Optimize page size (4KB is optimal for modern systems)
        conn.pragma('page_size = 4096');
        
        // Enable automatic index creation for query optimization
        conn.pragma('automatic_index = ON');
        
        // Analyze tables for query optimization
        conn.exec('PRAGMA analysis_limit = 1000');
        
        done();
      },
    },
  },
};

export default config;

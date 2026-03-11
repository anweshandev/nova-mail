FROM node:20-alpine

# Install build tools for native dependencies (like better-sqlite3)
RUN apk add --no-cache python3 make g++ build-base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Set SQLite compile-time flags for better-sqlite3
ENV CFLAGS="-DSQLITE_THREADSAFE=1 \
-DSQLITE_ENABLE_FTS5 \
-DSQLITE_ENABLE_JSON1 \
-DSQLITE_ENABLE_RTREE \
-DSQLITE_ENABLE_DBSTAT_VTAB \
-DSQLITE_ENABLE_UNLOCK_NOTIFY \
-DSQLITE_ENABLE_COLUMN_METADATA \
-DSQLITE_DEFAULT_CACHE_SIZE=-20000 \
-DSQLITE_DEFAULT_PAGE_SIZE=4096 \
-DSQLITE_DEFAULT_WAL_SYNCHRONOUS=1 \
-DSQLITE_MAX_MMAP_SIZE=1073741824"

# Install dependencies (better-sqlite3 will compile with above flags)
RUN npm install --omit=dev

# Copy source code
COPY . .

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Command is handled by docker-compose.yml

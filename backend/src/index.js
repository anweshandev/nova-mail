import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.js';
import emailRoutes from './routes/emails.js';
import folderRoutes from './routes/folders.js';
import settingsRoutes from './routes/settings.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { initPocketBase, cleanupExpiredSessions } from './services/pocketbase.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Cleanup expired sessions periodically (every hour)
setInterval(async () => {
  try {
    const result = await cleanupExpiredSessions();
    if (result.deleted > 0) {
      console.log(`🧹 Cleaned up ${result.deleted} expired sessions`);
    }
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
}, 60 * 60 * 1000);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Request logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Rate limiting
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found', 
    message: `Cannot ${req.method} ${req.path}` 
  });
});

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  // Initialize PocketBase connection
  const pbConnected = await initPocketBase();
  if (!pbConnected) {
    console.warn('⚠️  PocketBase not available - user sessions will not persist');
  }
  
  app.listen(PORT, () => {
    console.log(`✨ NovaMail Backend running on port ${PORT}`);
    console.log(`📧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database: PocketBase (${process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'})`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
}

start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;

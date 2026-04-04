import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { Database } from 'sqlite3';

// Import routes
import activityRoutes from './routes/activities';
import analyticsRoutes from './routes/analytics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
export const db = new Database(path.join(__dirname, '..', 'runbound.db'));

// Initialize database tables
db.serialize(() => {
  // Activities table
  db.run(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT DEFAULT 'run',
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration INTEGER,
      distance REAL,
      calories INTEGER,
      avg_pace REAL,
      avg_speed REAL,
      max_speed REAL,
      elevation_gain REAL,
      path_data TEXT,
      territory_claimed BOOLEAN DEFAULT FALSE,
      notes TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Personal records table
  db.run(`
    CREATE TABLE IF NOT EXISTS personal_records (
      id TEXT PRIMARY KEY,
      record_type TEXT NOT NULL,
      value REAL NOT NULL,
      activity_id TEXT,
      achieved_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (activity_id) REFERENCES activities (id)
    )
  `);

  // Routes table
  db.run(`
    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      distance REAL,
      elevation_gain REAL,
      path_data TEXT NOT NULL,
      times_completed INTEGER DEFAULT 0,
      avg_time REAL,
      best_time REAL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Segments table
  db.run(`
    CREATE TABLE IF NOT EXISTS segments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_lat REAL NOT NULL,
      start_lng REAL NOT NULL,
      end_lat REAL NOT NULL,
      end_lng REAL NOT NULL,
      distance REAL NOT NULL,
      elevation_gain REAL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Segment efforts table
  db.run(`
    CREATE TABLE IF NOT EXISTS segment_efforts (
      id TEXT PRIMARY KEY,
      segment_id TEXT NOT NULL,
      activity_id TEXT NOT NULL,
      elapsed_time REAL NOT NULL,
      start_time INTEGER NOT NULL,
      avg_speed REAL,
      max_speed REAL,
      FOREIGN KEY (segment_id) REFERENCES segments (id),
      FOREIGN KEY (activity_id) REFERENCES activities (id)
    )
  `);
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8081'], // React Native metro bundler
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/activities', activityRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🏃‍♂️ RunBound server running on port ${PORT}`);
  console.log(`📊 Database initialized at runbound.db`);
});
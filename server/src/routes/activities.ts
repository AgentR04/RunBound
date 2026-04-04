import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../index';
import { Activity } from '../models/types';

const router = Router();

// Get all activities with pagination
router.get('/', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const query = `
    SELECT * FROM activities 
    ORDER BY start_time DESC 
    LIMIT ? OFFSET ?
  `;

  db.all(query, [limit, offset], (err, rows: any[]) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch activities' });
    }

    const activities = rows.map(row => ({
      ...row,
      pathData: row.path_data ? JSON.parse(row.path_data) : [],
      startTime: row.start_time,
      endTime: row.end_time,
      avgPace: row.avg_pace,
      avgSpeed: row.avg_speed,
      maxSpeed: row.max_speed,
      elevationGain: row.elevation_gain,
      territoryClaimed: Boolean(row.territory_claimed),
      createdAt: row.created_at
    }));

    res.json({ activities, page, limit });
  });
});

// Get activity by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM activities WHERE id = ?', [id], (err, row: any) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch activity' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const activity = {
      ...row,
      pathData: row.path_data ? JSON.parse(row.path_data) : [],
      startTime: row.start_time,
      endTime: row.end_time,
      avgPace: row.avg_pace,
      avgSpeed: row.avg_speed,
      maxSpeed: row.max_speed,
      elevationGain: row.elevation_gain,
      territoryClaimed: Boolean(row.territory_claimed),
      createdAt: row.created_at
    };

    res.json(activity);
  });
});

// Create new activity
router.post('/', (req, res) => {
  const activity: Partial<Activity> = req.body;
  const id = uuidv4();

  const query = `
    INSERT INTO activities (
      id, title, type, start_time, end_time, duration, distance, 
      calories, avg_pace, avg_speed, max_speed, elevation_gain, 
      path_data, territory_claimed, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    id,
    activity.title || 'Untitled Activity',
    activity.type || 'run',
    activity.startTime,
    activity.endTime,
    activity.duration,
    activity.distance,
    activity.calories,
    activity.avgPace,
    activity.avgSpeed,
    activity.maxSpeed,
    activity.elevationGain,
    activity.pathData ? JSON.stringify(activity.pathData) : null,
    activity.territoryClaimed ? 1 : 0,
    activity.notes
  ];

  db.run(query, values, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create activity' });
    }

    res.status(201).json({ id, message: 'Activity created successfully' });
  });
});

// Update activity
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates: Partial<Activity> = req.body;

  const query = `
    UPDATE activities SET 
      title = COALESCE(?, title),
      type = COALESCE(?, type),
      end_time = COALESCE(?, end_time),
      duration = COALESCE(?, duration),
      distance = COALESCE(?, distance),
      calories = COALESCE(?, calories),
      avg_pace = COALESCE(?, avg_pace),
      avg_speed = COALESCE(?, avg_speed),
      max_speed = COALESCE(?, max_speed),
      elevation_gain = COALESCE(?, elevation_gain),
      path_data = COALESCE(?, path_data),
      territory_claimed = COALESCE(?, territory_claimed),
      notes = COALESCE(?, notes)
    WHERE id = ?
  `;

  const values = [
    updates.title,
    updates.type,
    updates.endTime,
    updates.duration,
    updates.distance,
    updates.calories,
    updates.avgPace,
    updates.avgSpeed,
    updates.maxSpeed,
    updates.elevationGain,
    updates.pathData ? JSON.stringify(updates.pathData) : undefined,
    updates.territoryClaimed ? 1 : 0,
    updates.notes,
    id
  ];

  db.run(query, values, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update activity' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ message: 'Activity updated successfully' });
  });
});

// Delete activity
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM activities WHERE id = ?', [id], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete activity' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ message: 'Activity deleted successfully' });
  });
});

// Get recent activities (last 7 days)
router.get('/recent/week', (req, res) => {
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  const query = `
    SELECT * FROM activities 
    WHERE start_time > ? 
    ORDER BY start_time DESC
  `;

  db.all(query, [weekAgo], (err, rows: any[]) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch recent activities' });
    }

    const activities = rows.map(row => ({
      ...row,
      pathData: row.path_data ? JSON.parse(row.path_data) : [],
      startTime: row.start_time,
      endTime: row.end_time,
      avgPace: row.avg_pace,
      avgSpeed: row.avg_speed,
      maxSpeed: row.max_speed,
      elevationGain: row.elevation_gain,
      territoryClaimed: Boolean(row.territory_claimed),
      createdAt: row.created_at
    }));

    res.json(activities);
  });
});

export default router;
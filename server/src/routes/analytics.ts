import { Router } from 'express';
import { db } from '../index';
import { AnalyticsData, MonthlyStats, PaceDistribution, PerformanceTrend, WeeklyStats } from '../models/types';

const router = Router();

// Get overall analytics summary
router.get('/summary', (req, res) => {
  const queries = {
    totals: `
      SELECT 
        COUNT(*) as total_activities,
        SUM(distance) as total_distance,
        SUM(duration) as total_duration,
        SUM(calories) as total_calories,
        AVG(avg_pace) as avg_pace
      FROM activities
    `,
    recentActivities: `
      SELECT * FROM activities 
      ORDER BY start_time DESC 
      LIMIT 5
    `,
    personalRecords: `
      SELECT * FROM personal_records 
      ORDER BY achieved_at DESC
    `
  };

  // Execute all queries
  db.get(queries.totals, (err, totals: any) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch analytics summary' });
    }

    db.all(queries.recentActivities, (err, recentRows: any[]) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch recent activities' });
      }

      db.all(queries.personalRecords, (err, recordRows: any[]) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to fetch personal records' });
        }

        const recentActivities = recentRows.map(row => ({
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

        const personalRecords = recordRows.map(row => ({
          ...row,
          recordType: row.record_type,
          activityId: row.activity_id,
          achievedAt: row.achieved_at
        }));

        const analyticsData: Partial<AnalyticsData> = {
          totalActivities: totals.total_activities || 0,
          totalDistance: totals.total_distance || 0,
          totalDuration: totals.total_duration || 0,
          totalCalories: totals.total_calories || 0,
          avgPace: totals.avg_pace || 0,
          personalRecords,
          recentActivities
        };

        res.json(analyticsData);
      });
    });
  });
});

// Get weekly statistics
router.get('/weekly', (req, res) => {
  const weeks = parseInt(req.query.weeks as string) || 12;

  const query = `
    SELECT 
      strftime('%Y-W%W', datetime(start_time/1000, 'unixepoch')) as week,
      SUM(distance) as distance,
      SUM(duration) as duration,
      COUNT(*) as activities,
      SUM(calories) as calories,
      AVG(avg_pace) as avg_pace
    FROM activities
    WHERE start_time > ?
    GROUP BY week
    ORDER BY week DESC
    LIMIT ?
  `;

  const weeksAgo = Date.now() - (weeks * 7 * 24 * 60 * 60 * 1000);

  db.all(query, [weeksAgo, weeks], (err, rows: any[]) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch weekly statistics' });
    }

    const weeklyStats: WeeklyStats[] = rows.map(row => ({
      week: row.week,
      distance: row.distance || 0,
      duration: row.duration || 0,
      activities: row.activities || 0,
      calories: row.calories || 0,
      avgPace: row.avg_pace || 0
    }));

    res.json(weeklyStats);
  });
});

// Get monthly statistics
router.get('/monthly', (req, res) => {
  const months = parseInt(req.query.months as string) || 12;

  const query = `
    SELECT 
      strftime('%Y-%m', datetime(start_time/1000, 'unixepoch')) as month,
      SUM(distance) as distance,
      SUM(duration) as duration,
      COUNT(*) as activities,
      SUM(calories) as calories,
      AVG(avg_pace) as avg_pace
    FROM activities
    WHERE start_time > ?
    GROUP BY month
    ORDER BY month DESC
    LIMIT ?
  `;

  const monthsAgo = Date.now() - (months * 30 * 24 * 60 * 60 * 1000);

  db.all(query, [monthsAgo, months], (err, rows: any[]) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch monthly statistics' });
    }

    const monthlyStats: MonthlyStats[] = rows.map(row => ({
      month: row.month,
      distance: row.distance || 0,
      duration: row.duration || 0,
      activities: row.activities || 0,
      calories: row.calories || 0,
      avgPace: row.avg_pace || 0
    }));

    res.json(monthlyStats);
  });
});

// Get performance trends
router.get('/trends', (req, res) => {
  const days = parseInt(req.query.days as string) || 30;

  const query = `
    SELECT 
      DATE(start_time/1000, 'unixepoch') as date,
      AVG(avg_pace) as avg_pace,
      SUM(distance) as distance
    FROM activities
    WHERE start_time > ?
    GROUP BY date
    ORDER BY date DESC
    LIMIT ?
  `;

  const daysAgo = Date.now() - (days * 24 * 60 * 60 * 1000);

  db.all(query, [daysAgo, days], (err, rows: any[]) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch performance trends' });
    }

    // Calculate 7-day moving average
    const trends: PerformanceTrend[] = [];
    rows.forEach((row, index) => {
      const windowStart = Math.max(0, index - 6);
      const windowData = rows.slice(windowStart, index + 1);
      const movingAvgPace = windowData.reduce((sum, d) => sum + (d.avg_pace || 0), 0) / windowData.length;

      trends.push({
        date: row.date,
        avgPace: row.avg_pace || 0,
        distance: row.distance || 0,
        movingAvgPace
      });
    });

    res.json(trends.reverse()); // Return chronological order
  });
});

// Get pace distribution
router.get('/pace-distribution', (req, res) => {
  const query = `
    SELECT avg_pace FROM activities 
    WHERE avg_pace IS NOT NULL AND avg_pace > 0
  `;

  db.all(query, (err, rows: any[]) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch pace data' });
    }

    // Create pace buckets (30-second intervals)
    const buckets: { [key: string]: number } = {};
    const bucketSize = 0.5; // 30 seconds

    rows.forEach(row => {
      const pace = row.avg_pace;
      const bucketStart = Math.floor(pace / bucketSize) * bucketSize;
      const bucketEnd = bucketStart + bucketSize;
      const bucketKey = `${Math.floor(bucketStart)}:${String(Math.round((bucketStart % 1) * 60)).padStart(2, '0')}-${Math.floor(bucketEnd)}:${String(Math.round((bucketEnd % 1) * 60)).padStart(2, '0')}`;

      buckets[bucketKey] = (buckets[bucketKey] || 0) + 1;
    });

    const totalActivities = rows.length;
    const paceDistribution: PaceDistribution[] = Object.entries(buckets)
      .map(([paceRange, count]) => ({
        paceRange,
        count,
        percentage: (count / totalActivities) * 100
      }))
      .sort((a, b) => a.paceRange.localeCompare(b.paceRange));

    res.json(paceDistribution);
  });
});

// Get personal records
router.get('/records', (req, res) => {
  db.all('SELECT * FROM personal_records ORDER BY achieved_at DESC', (err, rows: any[]) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch personal records' });
    }

    const records = rows.map(row => ({
      ...row,
      recordType: row.record_type,
      activityId: row.activity_id,
      achievedAt: row.achieved_at
    }));

    res.json(records);
  });
});

// Update personal record
router.post('/records', (req, res) => {
  const { recordType, value, activityId } = req.body;

  // Check if this is a new personal record
  const checkQuery = 'SELECT value FROM personal_records WHERE record_type = ? ORDER BY value DESC LIMIT 1';

  db.get(checkQuery, [recordType], (err, existingRecord: any) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to check existing records' });
    }

    const isNewRecord = !existingRecord || value > existingRecord.value;

    if (isNewRecord) {
      const insertQuery = `
        INSERT INTO personal_records (id, record_type, value, activity_id)
        VALUES (?, ?, ?, ?)
      `;

      const recordId = require('uuid').v4();
      db.run(insertQuery, [recordId, recordType, value, activityId], function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to save personal record' });
        }

        res.json({
          message: 'New personal record!',
          isNewRecord: true,
          recordId,
          recordType,
          value
        });
      });
    } else {
      res.json({
        message: 'Not a personal record',
        isNewRecord: false
      });
    }
  });
});

export default router;
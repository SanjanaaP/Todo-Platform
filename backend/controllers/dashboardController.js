const pool = require('../config/db');

// GET /api/dashboard
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const filter = isAdmin ? '' : `WHERE (created_by = ${userId} OR assigned_to = ${userId})`;

    const counts = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE TRUE) AS total,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'todo' OR status = 'in_progress') AS pending,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') AS overdue
      FROM tasks ${filter}
    `);

    const activity = await pool.query(`
      SELECT al.action, al.details, al.created_at, u.name AS user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${isAdmin ? '' : `WHERE al.user_id = ${userId}`}
      ORDER BY al.created_at DESC
      LIMIT 10
    `);

    const byPriority = await pool.query(`
      SELECT priority, COUNT(*) as count
      FROM tasks ${filter}
      GROUP BY priority
    `);

    const byStatus = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM tasks ${filter}
      GROUP BY status
    `);

    res.json({
      success: true,
      stats: counts.rows[0],
      recentActivity: activity.rows,
      byPriority: byPriority.rows,
      byStatus: byStatus.rows
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard.' });
  }
};

module.exports = { getDashboard };
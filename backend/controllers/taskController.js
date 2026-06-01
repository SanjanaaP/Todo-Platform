const pool = require('../config/db');
const xss = require('xss');

const logActivity = async (userId, taskId, action, details) => {
  try {
    await pool.query(
      'INSERT INTO activity_logs (user_id, task_id, action, details) VALUES ($1, $2, $3, $4)',
      [userId, taskId, action, details]
    );
  } catch (e) {
    console.error('Activity log error:', e);
  }
};

const getTasks = async (req, res) => {
  try {
    const { search, status, priority, sort_by, order, assigned_to } = req.query;
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (req.user.role === 'member') {
      conditions.push('(t.created_by = $' + paramIdx + ' OR t.assigned_to = $' + paramIdx + ')');
      params.push(req.user.id);
      paramIdx++;
    }

    if (search) {
      conditions.push('t.title ILIKE $' + paramIdx);
      params.push('%' + search + '%');
      paramIdx++;
    }
    if (status) {
      conditions.push('t.status = $' + paramIdx);
      params.push(status);
      paramIdx++;
    }
    if (priority) {
      conditions.push('t.priority = $' + paramIdx);
      params.push(priority);
      paramIdx++;
    }
    if (assigned_to) {
      conditions.push('t.assigned_to = $' + paramIdx);
      params.push(assigned_to);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const validSortFields = { due_date: 't.due_date', created_at: 't.created_at', priority: 't.priority', title: 't.title' };
    const sortField = validSortFields[sort_by] || 't.created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const query = 'SELECT t.*, u1.name AS creator_name, u2.name AS assignee_name, COUNT(a.id) AS attachment_count FROM tasks t LEFT JOIN users u1 ON t.created_by = u1.id LEFT JOIN users u2 ON t.assigned_to = u2.id LEFT JOIN task_attachments a ON t.id = a.task_id ' + whereClause + ' GROUP BY t.id, u1.name, u2.name ORDER BY ' + sortField + ' ' + sortOrder + ' NULLS LAST';

    const result = await pool.query(query, params);
    res.json({ success: true, tasks: result.rows });
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks.' });
  }
};

const getKanban = async (req, res) => {
  try {
    let whereClause = '';
    const params = [];
    if (req.user.role === 'member') {
      whereClause = 'WHERE (t.created_by = $1 OR t.assigned_to = $1)';
      params.push(req.user.id);
    }

    const query = 'SELECT t.*, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id ' + whereClause + ' ORDER BY t.priority DESC, t.due_date ASC NULLS LAST';

    const result = await pool.query(query, params);
    const kanban = {
      todo: result.rows.filter(t => t.status === 'todo'),
      in_progress: result.rows.filter(t => t.status === 'in_progress'),
      completed: result.rows.filter(t => t.status === 'completed')
    };

    res.json({ success: true, kanban });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch kanban data.' });
  }
};

const getTask = async (req, res) => {
  try {
    const { id } = req.params;
    const taskResult = await pool.query(
      'SELECT t.*, u1.name AS creator_name, u2.name AS assignee_name FROM tasks t LEFT JOIN users u1 ON t.created_by = u1.id LEFT JOIN users u2 ON t.assigned_to = u2.id WHERE t.id = $1',
      [id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const task = taskResult.rows[0];

    if (req.user.role === 'member' && task.created_by !== req.user.id && task.assigned_to !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const attachments = await pool.query(
      'SELECT * FROM task_attachments WHERE task_id = $1 ORDER BY created_at DESC', [id]
    );

    const logs = await pool.query(
      'SELECT al.*, u.name AS user_name FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id WHERE al.task_id = $1 ORDER BY al.created_at DESC LIMIT 20', [id]
    );

    res.json({ success: true, task, attachments: attachments.rows, activity: logs.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch task.' });
  }
};

const createTask = async (req, res) => {
  try {
    let { title, description, status, priority, due_date, assigned_to } = req.body;
    title = xss(title);
    description = description ? xss(description) : null;

    const result = await pool.query(
      'INSERT INTO tasks (title, description, status, priority, due_date, created_by, assigned_to) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, description, status || 'todo', priority || 'medium', due_date || null, req.user.id, assigned_to || null]
    );

    const task = result.rows[0];
    await logActivity(req.user.id, task.id, 'created', 'Task "' + title + '" created');

    res.status(201).json({ success: true, message: 'Task created.', task });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ success: false, message: 'Failed to create task.' });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    let { title, description, status, priority, due_date, assigned_to } = req.body;

    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const task = existing.rows[0];
    if (req.user.role === 'member' && task.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    title = title ? xss(title) : task.title;
    description = description !== undefined ? xss(description) : task.description;

    const result = await pool.query(
      'UPDATE tasks SET title=$1, description=$2, status=$3, priority=$4, due_date=$5, assigned_to=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [title, description, status || task.status, priority || task.priority,
       due_date !== undefined ? due_date : task.due_date,
       assigned_to !== undefined ? assigned_to : task.assigned_to, id]
    );

    await logActivity(req.user.id, parseInt(id), 'updated', 'Task "' + title + '" updated');
    res.json({ success: true, message: 'Task updated.', task: result.rows[0] });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ success: false, message: 'Failed to update task.' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const task = existing.rows[0];
    if (req.user.role === 'member' && task.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ success: true, message: 'Task deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete task.' });
  }
};

module.exports = { getTasks, getTask, getKanban, createTask, updateTask, deleteTask };
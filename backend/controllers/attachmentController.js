const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

const uploadAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const task = await pool.query('SELECT id FROM tasks WHERE id = $1', [id]);
    if (task.rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const result = await pool.query(
      'INSERT INTO task_attachments (task_id, uploaded_by, file_name, file_path, file_type, file_size) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, req.user.id, req.file.originalname, '/uploads/' + req.file.filename,
       req.file.mimetype, req.file.size]
    );

    res.status(201).json({ success: true, message: 'File uploaded.', attachment: result.rows[0] });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'File upload failed.' });
  }
};

const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM task_attachments WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attachment not found.' });
    }

    const attachment = result.rows[0];
    if (req.user.role !== 'admin' && attachment.uploaded_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const filePath = path.join(__dirname, '..', attachment.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM task_attachments WHERE id = $1', [id]);
    res.json({ success: true, message: 'Attachment deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete attachment.' });
  }
};

module.exports = { uploadAttachment, deleteAttachment };
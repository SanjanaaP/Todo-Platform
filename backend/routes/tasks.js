const express = require('express');
const router = express.Router();
const { getTasks, getTask, getKanban, createTask, updateTask, deleteTask } = require('../controllers/taskController');
const { uploadAttachment, deleteAttachment } = require('../controllers/attachmentController');
const { authenticate } = require('../middleware/auth');
const { taskValidator } = require('../middleware/validate');
const upload = require('../middleware/upload');

router.use(authenticate);

router.get('/', getTasks);
router.get('/kanban', getKanban);
router.get('/:id', getTask);
router.post('/', taskValidator, createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

router.post('/:id/attachments', upload.single('file'), uploadAttachment);
router.delete('/attachments/:id', deleteAttachment);

module.exports = router;
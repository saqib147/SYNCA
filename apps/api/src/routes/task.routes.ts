import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  createTask,
  getProjectTasks,
  getMyTasks,
  updateTask,
  moveTask,
  deleteTask,
} from '../controllers/task.controller.js';

const router = Router();

// Protect all task routes
router.use(requireAuth);

router.post('/', createTask);
router.get('/', getProjectTasks);
router.get('/my-tasks', getMyTasks);
router.patch('/:id', updateTask);
router.patch('/:id/move', moveTask);
router.delete('/:id', deleteTask);

export default router;

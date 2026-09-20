import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  createProject,
  getWorkspaceProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from '../controllers/project.controller.js';

const router = Router();

// Protect all project routes
router.use(requireAuth);

router.post('/', createProject);
router.get('/', getWorkspaceProjects);
router.get('/:id', getProjectById);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;

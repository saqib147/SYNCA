import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  deleteMessage,
  getChannelMessages,
  getDmMessages,
  sendMessage,
} from '../controllers/message.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/channel/:projectId', getChannelMessages);
router.get('/dm/:userId', getDmMessages);
router.post('/', sendMessage);
router.delete('/:id', deleteMessage);

export default router;

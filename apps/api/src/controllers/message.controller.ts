import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getAuth } from '@clerk/express';
import { sendMessageSchema, listMessagesQuerySchema } from '@synca/zod-schemas';
import { Message } from '../models/Message.js';
import { getIO } from '../socket/index.js';
import { fetchUserProfile } from '../utils/clerk-profile.js';
import {
  canonicalizeDmChannelId,
  dmChannelId,
  extractPlainText,
  findActiveProject,
  isDmParticipant,
  isProjectAdminOrMod,
  isProjectMember,
} from '../utils/membership.js';

export const getSenderProfile = fetchUserProfile;

const getUserId = (req: Request): string | undefined => {
  try {
    return (req as any).auth?.userId || getAuth(req)?.userId;
  } catch {
    return (req as any).auth?.userId;
  }
};

function serializeMessage(doc: any) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: String(obj._id),
    _id: String(obj._id),
    channelType: obj.channelType,
    channelId: obj.channelId,
    projectId: obj.projectId ? String(obj.projectId) : null,
    senderId: obj.senderId,
    senderName: obj.senderName || 'User',
    senderAvatar: obj.senderAvatar || '',
    content: obj.content,
    plainText: obj.plainText || '',
    attachments: obj.attachments || [],
    reactions: obj.reactions || [],
    mentions: obj.mentions || [],
    deletedAt: obj.deletedAt || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

async function assertCanAccessChannel(
  userId: string,
  channelType: 'dm' | 'channel',
  channelId: string
): Promise<{ ok: true; projectId: string | null } | { ok: false; status: number; code: string; message: string }> {
  if (channelType === 'channel') {
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return { ok: false, status: 400, code: 'VALIDATION_ERROR', message: 'Invalid project channel id' };
    }
    const project = await findActiveProject(channelId);
    if (!project) {
      return { ok: false, status: 404, code: 'NOT_FOUND', message: 'Project not found' };
    }
    if (!isProjectMember(project, userId)) {
      return { ok: false, status: 403, code: 'FORBIDDEN', message: 'You must be a project member to access this channel' };
    }
    return { ok: true, projectId: String(project._id) };
  }

  if (!isDmParticipant(channelId, userId)) {
    return { ok: false, status: 403, code: 'FORBIDDEN', message: 'You are not a participant in this DM' };
  }
  return { ok: true, projectId: null };
}

/**
 * GET /api/v1/messages/channel/:projectId
 */
export const getChannelMessages = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const { projectId } = req.params;
    const query = listMessagesQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: query.error.issues },
      });
    }

    const access = await assertCanAccessChannel(userId, 'channel', projectId);
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        error: { code: access.code, message: access.message },
      });
    }

    const filter: Record<string, unknown> = {
      channelType: 'channel',
      channelId: projectId,
      deletedAt: null,
    };

    if (query.data.cursor && mongoose.Types.ObjectId.isValid(query.data.cursor)) {
      const cursorMsg = await Message.findOne({
        _id: query.data.cursor,
        channelType: 'channel',
        channelId: projectId,
      }).select('createdAt _id');
      if (cursorMsg) {
        filter.$or = [
          { createdAt: { $lt: cursorMsg.createdAt } },
          { createdAt: cursorMsg.createdAt, _id: { $lt: cursorMsg._id } },
        ];
      }
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(query.data.limit)
      .lean();

    const ordered = messages.reverse();
    return res.status(200).json({
      success: true,
      data: {
        messages: ordered.map(serializeMessage),
        nextCursor: ordered.length === query.data.limit ? String(ordered[0]._id) : null,
      },
    });
  } catch (err) {
    console.error('[getChannelMessages]', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load channel messages' },
    });
  }
};

/**
 * GET /api/v1/messages/dm/:userId
 */
export const getDmMessages = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const peerId = req.params.userId;
    if (!peerId || peerId === userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid peer userId required' },
      });
    }

    const query = listMessagesQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: query.error.issues },
      });
    }

    const channelId = dmChannelId(userId, peerId);
    const filter: Record<string, unknown> = {
      channelType: 'dm',
      channelId,
      deletedAt: null,
    };

    if (query.data.cursor && mongoose.Types.ObjectId.isValid(query.data.cursor)) {
      const cursorMsg = await Message.findOne({
        _id: query.data.cursor,
        channelType: 'dm',
        channelId,
      }).select('createdAt _id');
      if (cursorMsg) {
        filter.$or = [
          { createdAt: { $lt: cursorMsg.createdAt } },
          { createdAt: cursorMsg.createdAt, _id: { $lt: cursorMsg._id } },
        ];
      }
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(query.data.limit)
      .lean();

    const ordered = messages.reverse();
    return res.status(200).json({
      success: true,
      data: {
        channelId,
        messages: ordered.map(serializeMessage),
        nextCursor: ordered.length === query.data.limit ? String(ordered[0]._id) : null,
      },
    });
  } catch (err) {
    console.error('[getDmMessages]', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load DM messages' },
    });
  }
};

/**
 * POST /api/v1/messages
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid message payload',
          details: parsed.error.issues,
        },
      });
    }

    let { channelType, channelId, content, attachments, mentions } = parsed.data;

    if (channelType === 'dm') {
      const canonical = canonicalizeDmChannelId(userId, channelId);
      if (!canonical) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Invalid or unauthorized DM channel' },
        });
      }
      channelId = canonical;
    }

    const access = await assertCanAccessChannel(userId, channelType, channelId);
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        error: { code: access.code, message: access.message },
      });
    }

    if (content === undefined || content === null || content === '') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Message content is required' },
      });
    }

    // Always resolve sender profile server-side to prevent spoofing
    const profile = await fetchUserProfile(userId);

    const message = await Message.create({
      channelType,
      channelId,
      projectId: access.projectId,
      senderId: userId,
      senderName: profile.name,
      senderAvatar: profile.avatar,
      content,
      plainText: extractPlainText(content),
      attachments: attachments || [],
      mentions: mentions || [],
      reactions: [],
    });

    const serialized = serializeMessage(message);

    // Emit over Socket.io so live clients receive REST-sent messages immediately
    const io = getIO();
    if (io) {
      if (channelType === 'channel') {
        io.to(`project:${channelId}`).emit('message:new', serialized);
      } else {
        const [a, b] = channelId.split(':');
        const peerId = a === userId ? b : a;
        io.to(`dm:${channelId}`).to(`user:${userId}`).to(`user:${peerId}`).emit('message:new', serialized);
      }
    }

    return res.status(201).json({
      success: true,
      data: serialized,
    });
  } catch (err) {
    console.error('[sendMessage]', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send message' },
    });
  }
};

/**
 * DELETE /api/v1/messages/:id
 */
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid message ID required' },
      });
    }

    const msg = await Message.findOne({ _id: id, deletedAt: null });
    if (!msg) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Message not found' },
      });
    }

    const isSender = msg.senderId === userId;
    let canModerate = false;

    if (msg.channelType === 'channel' && msg.projectId) {
      const project = await findActiveProject(String(msg.projectId));
      canModerate = project ? isProjectAdminOrMod(project, userId) : false;
    }

    if (!isSender && !canModerate) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only delete your own messages' },
      });
    }

    msg.deletedAt = new Date();
    await msg.save();

    const io = getIO();
    if (io) {
      const room = msg.channelType === 'channel' ? `project:${msg.channelId}` : `dm:${msg.channelId}`;
      io.to(room).emit('message:deleted', {
        messageId: String(msg._id),
        channelId: msg.channelId,
      });
    }

    return res.status(200).json({
      success: true,
      data: { messageId: String(msg._id), channelId: msg.channelId },
    });
  } catch (err) {
    console.error('[deleteMessage]', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete message' },
    });
  }
};

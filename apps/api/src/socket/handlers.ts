import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { sendMessageSchema, reactMessageSchema } from '@synca/zod-schemas';
import { Message } from '../models/Message.js';
import { Project } from '../models/Project.js';
import { redisClient } from '../lib/redis.js';
import { getSenderProfile } from '../controllers/message.controller.js';
import {
  dmChannelId,
  extractPlainText,
  findActiveProject,
  isDmParticipant,
  isProjectAdminOrMod,
  isProjectMember,
} from '../utils/membership.js';

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

function projectRoom(projectId: string) {
  return `project:${projectId}`;
}

function dmRoom(channelId: string) {
  return `dm:${channelId}`;
}

function userRoom(userId: string) {
  return `user:${userId}`;
}

async function assertAccess(userId: string, channelType: 'dm' | 'channel', channelId: string) {
  if (channelType === 'channel') {
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return { ok: false as const, message: 'Invalid project id' };
    }
    const project = await findActiveProject(channelId);
    if (!project || !isProjectMember(project, userId)) {
      return { ok: false as const, message: 'Not a project member' };
    }
    return { ok: true as const, projectId: String(project._id) };
  }

  if (!isDmParticipant(channelId, userId)) {
    return { ok: false as const, message: 'Not a DM participant' };
  }
  return { ok: true as const, projectId: null };
}

function emitRoom(io: Server, channelType: 'dm' | 'channel', channelId: string, event: string, payload: unknown) {
  const room = channelType === 'channel' ? projectRoom(channelId) : dmRoom(channelId);
  io.to(room).emit(event, payload);
}

export function registerSocketHandlers(io: Server, socket: Socket) {
  const userId: string = socket.data.userId;
  socket.join(userRoom(userId));

  // Automatically join all project rooms the user is a member of so they receive real-time notifications on any page
  void (async () => {
    try {
      const userProjects = await Project.find({
        deletedAt: null,
        $or: [{ ownerId: userId }, { 'members.userId': userId }, { teamMembers: userId }],
      })
        .select('_id')
        .lean();

      for (const p of userProjects) {
        await socket.join(projectRoom(String(p._id)));
      }
    } catch (e) {
      console.warn('[Socket] Auto-join project rooms error:', e);
    }
  })();

  // Presence online
  void (async () => {
    try {
      if (redisClient.isOpen) {
        await redisClient.set(`presence:${userId}`, JSON.stringify({ status: 'online', lastSeen: Date.now() }), {
          EX: 60,
        });
      }
    } catch {
      /* ignore presence failures */
    }
    socket.broadcast.emit('presence:update', {
      userId,
      status: 'online',
      lastSeen: new Date(),
    });
  })();

  socket.on('project:join', async (payload: { projectId: string }) => {
    try {
      const projectId = payload?.projectId;
      const project = await findActiveProject(projectId);
      if (!project || !isProjectMember(project, userId)) {
        socket.emit('error', { code: 'FORBIDDEN', message: 'Cannot join project room' });
        return;
      }
      await socket.join(projectRoom(projectId));
    } catch (err) {
      console.error('[project:join]', err);
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to join project' });
    }
  });

  socket.on('project:leave', async (payload: { projectId: string }) => {
    if (payload?.projectId) {
      await socket.leave(projectRoom(payload.projectId));
    }
  });

  socket.on('dm:join', async (payload: { targetUserId: string }) => {
    try {
      const targetUserId = payload?.targetUserId;
      if (!targetUserId) return;
      const channelId = dmChannelId(userId, targetUserId);
      await socket.join(dmRoom(channelId));
    } catch (err) {
      console.error('[dm:join]', err);
    }
  });

  socket.on('dm:leave', async (payload: { targetUserId: string }) => {
    try {
      const targetUserId = payload?.targetUserId;
      if (!targetUserId) return;
      const channelId = dmChannelId(userId, targetUserId);
      await socket.leave(dmRoom(channelId));
    } catch (err) {
      console.error('[dm:leave]', err);
    }
  });

  socket.on('message:send', async (payload) => {
    try {
      const parsed = sendMessageSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Invalid message payload' });
        return;
      }

      let { channelType, channelId, content, attachments, mentions, senderName, senderAvatar } = parsed.data;
      if (channelType === 'dm' && !channelId.includes(':')) {
        channelId = dmChannelId(userId, channelId);
      }

      const access = await assertAccess(userId, channelType, channelId);
      if (!access.ok) {
        socket.emit('error', { code: 'FORBIDDEN', message: access.message });
        return;
      }

      if (content === undefined || content === null || content === '') {
        socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Message content is required' });
        return;
      }

      // Use client-provided authenticated profile if present, fallback to Clerk API cache
      let finalName = senderName?.trim();
      let finalAvatar = senderAvatar?.trim();
      if (!finalName) {
        const profile = await getSenderProfile(userId);
        finalName = profile.name;
        finalAvatar = finalAvatar || profile.avatar;
      }

      const message = await Message.create({
        channelType,
        channelId,
        projectId: access.projectId,
        senderId: userId,
        senderName: finalName,
        senderAvatar: finalAvatar || '',
        content,
        plainText: extractPlainText(content),
        attachments: attachments || [],
        mentions: mentions || [],
        reactions: [],
      });

      const serialized = serializeMessage(message);

      // Broadcast with Socket.io automatic room deduplication
      if (channelType === 'channel') {
        let broadcastTarget = io.to(projectRoom(channelId));
        const project = await findActiveProject(channelId);
        if (project) {
          const recipientIds = new Set<string>();
          if (project.ownerId) recipientIds.add(project.ownerId);
          if (Array.isArray(project.members)) {
            project.members.forEach((m: any) => m.userId && recipientIds.add(m.userId));
          }
          if (Array.isArray(project.teamMembers)) {
            project.teamMembers.forEach((uid: string) => uid && recipientIds.add(uid));
          }
          for (const mId of recipientIds) {
            broadcastTarget = broadcastTarget.to(userRoom(mId));
          }
        }
        broadcastTarget.emit('message:new', serialized);
      }

      // DM peer & sender notification across all their active tabs/rooms
      if (channelType === 'dm') {
        const [a, b] = channelId.split(':');
        const peerId = a === userId ? b : a;
        io.to(dmRoom(channelId))
          .to(userRoom(userId))
          .to(userRoom(peerId))
          .emit('message:new', serialized);
      }
    } catch (err) {
      console.error('[message:send]', err);
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to send message' });
    }
  });

  socket.on('message:react', async (payload) => {
    try {
      const parsed = reactMessageSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Invalid reaction payload' });
        return;
      }

      const message = await Message.findById(parsed.data.messageId);
      if (!message) {
        socket.emit('error', { code: 'NOT_FOUND', message: 'Message not found' });
        return;
      }

      const access = await assertAccess(userId, message.channelType, message.channelId);
      if (!access.ok) {
        socket.emit('error', { code: 'FORBIDDEN', message: access.message });
        return;
      }

      const emoji = parsed.data.emoji;
      let reaction = message.reactions.find((r) => r.emoji === emoji);
      if (!reaction) {
        message.reactions.push({ emoji, userIds: [userId] });
      } else {
        const idx = reaction.userIds.indexOf(userId);
        if (idx >= 0) reaction.userIds.splice(idx, 1);
        else reaction.userIds.push(userId);
        if (reaction.userIds.length === 0) {
          message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
        }
      }

      await message.save();
      emitRoom(io, message.channelType, message.channelId, 'message:reaction', {
        messageId: String(message._id),
        reactions: message.reactions,
      });
    } catch (err) {
      console.error('[message:react]', err);
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to react' });
    }
  });

  socket.on('message:delete', async (payload: { messageId: string }) => {
    try {
      const message = await Message.findById(payload?.messageId);
      if (!message) {
        socket.emit('error', { code: 'NOT_FOUND', message: 'Message not found' });
        return;
      }

      const isSender = message.senderId === userId;
      let canModerate = false;
      if (message.channelType === 'channel' && message.projectId) {
        const project = await findActiveProject(String(message.projectId));
        canModerate = project ? isProjectAdminOrMod(project, userId) : false;
      }

      if (!isSender && !canModerate) {
        socket.emit('error', { code: 'FORBIDDEN', message: 'Cannot delete this message' });
        return;
      }

      message.deletedAt = new Date();
      await message.save();

      emitRoom(io, message.channelType, message.channelId, 'message:deleted', {
        messageId: String(message._id),
        channelId: message.channelId,
      });
    } catch (err) {
      console.error('[message:delete]', err);
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to delete message' });
    }
  });

  const typingKey = (channelType: string, channelId: string) => `typing:${channelType}:${channelId}`;

  socket.on('typing:start', async (payload: { channelType: 'dm' | 'channel'; channelId: string }) => {
    try {
      let channelId = payload.channelId;
      if (payload.channelType === 'dm' && !channelId.includes(':')) {
        channelId = dmChannelId(userId, channelId);
      }
      const access = await assertAccess(userId, payload.channelType, channelId);
      if (!access.ok) return;

      const key = typingKey(payload.channelType, channelId);
      if (redisClient.isOpen) {
        await redisClient.sAdd(key, userId);
        await redisClient.expire(key, 5);
        const userIds = await redisClient.sMembers(key);
        emitRoom(io, payload.channelType, channelId, 'typing:update', {
          channelId,
          typingUsers: userIds.map((id) => ({ userId: id, name: id === userId ? 'You' : 'Member' })),
        });
      } else {
        emitRoom(io, payload.channelType, channelId, 'typing:update', {
          channelId,
          typingUsers: [{ userId, name: 'Member' }],
        });
      }
    } catch (err) {
      console.error('[typing:start]', err);
    }
  });

  socket.on('typing:stop', async (payload: { channelType: 'dm' | 'channel'; channelId: string }) => {
    try {
      let channelId = payload.channelId;
      if (payload.channelType === 'dm' && !channelId.includes(':')) {
        channelId = dmChannelId(userId, channelId);
      }
      const key = typingKey(payload.channelType, channelId);
      if (redisClient.isOpen) {
        await redisClient.sRem(key, userId);
        const userIds = await redisClient.sMembers(key);
        emitRoom(io, payload.channelType, channelId, 'typing:update', {
          channelId,
          typingUsers: userIds.map((id) => ({ userId: id, name: 'Member' })),
        });
      }
    } catch (err) {
      console.error('[typing:stop]', err);
    }
  });

  socket.on('disconnect', () => {
    void (async () => {
      try {
        if (redisClient.isOpen) {
          await redisClient.set(
            `presence:${userId}`,
            JSON.stringify({ status: 'offline', lastSeen: Date.now() }),
            { EX: 86400 }
          );
        }
      } catch {
        /* ignore */
      }
      socket.broadcast.emit('presence:update', {
        userId,
        status: 'offline',
        lastSeen: new Date(),
      });
    })();
  });
}

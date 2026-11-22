import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { sendMessageSchema, reactMessageSchema, typingEventSchema } from '@synca/zod-schemas';
import { Message } from '../models/Message.js';
import { Project } from '../models/Project.js';
import { redisClient } from '../lib/redis.js';
import { fetchUserProfile, fetchUserProfilesBatch } from '../utils/clerk-profile.js';
import {
  canonicalizeDmChannelId,
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
  if (channelType === 'channel') {
    io.to(projectRoom(channelId)).emit(event, payload);
    return;
  }
  const [a, b] = channelId.split(':');
  let target = io.to(dmRoom(channelId));
  if (a) target = target.to(userRoom(a));
  if (b) target = target.to(userRoom(b));
  target.emit(event, payload);
}

export function registerSocketHandlers(io: Server, socket: Socket) {
  const userId: string = socket.data.userId;
  socket.join(userRoom(userId));

  // Track joined project rooms on this socket so presence broadcasts are scoped to collaborators
  let joinedProjectIds: string[] = [];

  // Auto-join all active project rooms and emit scoped online presence
  void (async () => {
    try {
      const userProjects = await Project.find({
        deletedAt: null,
        $or: [{ ownerId: userId }, { 'members.userId': userId }, { teamMembers: userId }],
      })
        .select('_id')
        .lean();

      joinedProjectIds = userProjects.map((p) => String(p._id));
      for (const pid of joinedProjectIds) {
        await socket.join(projectRoom(pid));
      }

      if (redisClient.isOpen) {
        await redisClient.set(
          `presence:${userId}`,
          JSON.stringify({ status: 'online', lastSeen: Date.now() }),
          { EX: 300 }
        );
      }

      // Broadcast online status only to shared project rooms (not globally)
      // AND send an initial presence:sync snapshot of collaborators already online
      if (joinedProjectIds.length > 0) {
        let target = socket.to(projectRoom(joinedProjectIds[0]));
        for (let i = 1; i < joinedProjectIds.length; i++) {
          target = target.to(projectRoom(joinedProjectIds[i]));
        }
        target.emit('presence:update', {
          userId,
          status: 'online',
          lastSeen: new Date(),
        });

        const onlineSet = new Set<string>();
        const roomSocketLists = await Promise.all(
          joinedProjectIds.map((pid) => io.in(projectRoom(pid)).fetchSockets())
        );
        for (const list of roomSocketLists) {
          for (const s of list) {
            const uid = s.data?.userId;
            if (uid && uid !== userId) onlineSet.add(uid);
          }
        }
        socket.emit('presence:sync', { onlineUserIds: Array.from(onlineSet) });
      }
    } catch (e) {
      console.warn('[Socket] Auto-join/presence error:', e);
    }
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
      if (!joinedProjectIds.includes(projectId)) {
        joinedProjectIds.push(projectId);
      }
    } catch (err) {
      console.error('[project:join]', err);
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to join project' });
    }
  });

  socket.on('project:leave', async (payload: { projectId: string }) => {
    if (payload?.projectId) {
      await socket.leave(projectRoom(payload.projectId));
      joinedProjectIds = joinedProjectIds.filter((id) => id !== payload.projectId);
    }
  });

  socket.on('dm:join', async (payload: { targetUserId: string }) => {
    try {
      const channelId = canonicalizeDmChannelId(userId, payload?.targetUserId || '');
      if (!channelId) return;
      await socket.join(dmRoom(channelId));
    } catch (err) {
      console.error('[dm:join]', err);
    }
  });

  socket.on('dm:leave', async (payload: { targetUserId: string }) => {
    try {
      const channelId = canonicalizeDmChannelId(userId, payload?.targetUserId || '');
      if (!channelId) return;
      await socket.leave(dmRoom(channelId));
    } catch (err) {
      console.error('[dm:leave]', err);
    }
  });

  socket.on('message:send', async (payload, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const parsed = sendMessageSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Invalid message payload' });
        ack?.({ ok: false, error: 'Invalid message payload' });
        return;
      }

      let { channelType, channelId, content, attachments, mentions } = parsed.data;
      if (channelType === 'dm') {
        const canonical = canonicalizeDmChannelId(userId, channelId);
        if (!canonical) {
          socket.emit('error', { code: 'FORBIDDEN', message: 'Invalid or unauthorized DM channel' });
          ack?.({ ok: false, error: 'Invalid or unauthorized DM channel' });
          return;
        }
        channelId = canonical;
      }

      const access = await assertAccess(userId, channelType, channelId);
      if (!access.ok) {
        socket.emit('error', { code: 'FORBIDDEN', message: access.message });
        ack?.({ ok: false, error: access.message });
        return;
      }

      if (content === undefined || content === null || content === '') {
        socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Message content is required' });
        ack?.({ ok: false, error: 'Message content is required' });
        return;
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

      if (channelType === 'dm') {
        const [a, b] = channelId.split(':');
        const peerId = a === userId ? b : a;
        io.to(dmRoom(channelId))
          .to(userRoom(userId))
          .to(userRoom(peerId))
          .emit('message:new', serialized);
      }

      ack?.({ ok: true });
    } catch (err) {
      console.error('[message:send]', err);
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to send message' });
      ack?.({ ok: false, error: 'Failed to send message' });
    }
  });

  socket.on('message:react', async (payload) => {
    try {
      const parsed = reactMessageSchema.safeParse(payload);
      if (!parsed.success || !mongoose.Types.ObjectId.isValid(parsed.data.messageId)) {
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
      if (!payload?.messageId || !mongoose.Types.ObjectId.isValid(payload.messageId)) {
        socket.emit('error', { code: 'VALIDATION_ERROR', message: 'Invalid message ID' });
        return;
      }

      const message = await Message.findById(payload.messageId);
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

  async function emitTypingUpdate(channelType: 'dm' | 'channel', channelId: string, userIds: string[]) {
    const profiles = await fetchUserProfilesBatch(userIds);
    emitRoom(io, channelType, channelId, 'typing:update', {
      channelId,
      typingUsers: userIds.map((id) => ({
        userId: id,
        name: profiles.get(id)?.name || `User ${id.slice(-4)}`,
      })),
    });
  }

  socket.on('typing:start', async (payload) => {
    try {
      const parsed = typingEventSchema.safeParse(payload);
      if (!parsed.success) return;

      let { channelType, channelId } = parsed.data;
      if (channelType === 'dm') {
        const canonical = canonicalizeDmChannelId(userId, channelId);
        if (!canonical) return;
        channelId = canonical;
      }
      const access = await assertAccess(userId, channelType, channelId);
      if (!access.ok) return;

      const key = typingKey(channelType, channelId);
      if (redisClient.isOpen) {
        await redisClient.sAdd(key, userId);
        await redisClient.expire(key, 5);
        const userIds = await redisClient.sMembers(key);
        await emitTypingUpdate(channelType, channelId, userIds);
      } else {
        await emitTypingUpdate(channelType, channelId, [userId]);
      }
    } catch (err) {
      console.error('[typing:start]', err);
    }
  });

  socket.on('typing:stop', async (payload) => {
    try {
      const parsed = typingEventSchema.safeParse(payload);
      if (!parsed.success) return;

      let { channelType, channelId } = parsed.data;
      if (channelType === 'dm') {
        const canonical = canonicalizeDmChannelId(userId, channelId);
        if (!canonical) return;
        channelId = canonical;
      }
      const access = await assertAccess(userId, channelType, channelId);
      if (!access.ok) return;

      const key = typingKey(channelType, channelId);
      if (redisClient.isOpen) {
        await redisClient.sRem(key, userId);
        const userIds = await redisClient.sMembers(key);
        await emitTypingUpdate(channelType, channelId, userIds);
      } else {
        await emitTypingUpdate(channelType, channelId, []);
      }
    } catch (err) {
      console.error('[typing:stop]', err);
    }
  });

  socket.on('disconnect', () => {
    void (async () => {
      try {
        // Only mark user offline if they have no other open tabs/sockets
        const remaining = await io.in(userRoom(userId)).fetchSockets();
        if (remaining.length > 0) return;

        if (redisClient.isOpen) {
          await redisClient.set(
            `presence:${userId}`,
            JSON.stringify({ status: 'offline', lastSeen: Date.now() }),
            { EX: 86400 }
          );
        }

        if (joinedProjectIds.length > 0) {
          let target = io.to(projectRoom(joinedProjectIds[0]));
          for (let i = 1; i < joinedProjectIds.length; i++) {
            target = target.to(projectRoom(joinedProjectIds[i]));
          }
          target.emit('presence:update', {
            userId,
            status: 'offline',
            lastSeen: new Date(),
          });
        }
      } catch {
        /* ignore */
      }
    })();
  });
}

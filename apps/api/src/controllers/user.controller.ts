import { Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { Project } from '../models/Project.js';
import { Message } from '../models/Message.js';
import { dmChannelId } from '../utils/membership.js';
import {
  fetchUserProfile,
  fetchUserProfilesBatch,
  lookupUserByExactEmail,
} from '../utils/clerk-profile.js';

const getUserId = (req: Request): string | undefined => {
  try {
    return (req as any).auth?.userId || getAuth(req)?.userId;
  } catch {
    return (req as any).auth?.userId;
  }
};

/**
 * GET /api/v1/users/teammates
 * Returns all unique project members (across all projects the caller belongs to),
 * enriched with their Clerk display name and avatar via batched lookup.
 */
export const getTeammates = async (req: Request, res: Response) => {
  try {
    const currentUserId = getUserId(req);
    if (!currentUserId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    }

    // Find all projects the user belongs to
    const projects = await Project.find({
      deletedAt: null,
      $or: [
        { ownerId: currentUserId },
        { 'members.userId': currentUserId },
        { teamMembers: currentUserId },
      ],
    })
      .select('ownerId members teamMembers name')
      .lean();

    // Collect unique peer user IDs + deduplicated shared project names
    const peerMap = new Map<string, Set<string>>();

    for (const proj of projects) {
      const addPeer = (uid: string) => {
        if (!uid || uid === currentUserId) return;
        if (!peerMap.has(uid)) peerMap.set(uid, new Set());
        peerMap.get(uid)!.add(proj.name);
      };

      if (proj.ownerId) addPeer(proj.ownerId);
      if (Array.isArray(proj.members)) {
        for (const m of proj.members as any[]) {
          if (m.userId) addPeer(m.userId);
        }
      }
      if (Array.isArray(proj.teamMembers)) {
        for (const uid of proj.teamMembers as string[]) {
          addPeer(uid);
        }
      }
    }

    // Also aggregate existing DM threads so Tier 3 external DM peers appear in the sidebar
    // and conversations are ordered by most recent activity (lastMessageAt descending)
    const escapedUid = currentUserId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const dmRegex = new RegExp(`(^${escapedUid}:|:${escapedUid}$)`);

    const dmThreads = await Message.aggregate([
      {
        $match: {
          channelType: 'dm',
          deletedAt: null,
          channelId: { $regex: dmRegex },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$channelId',
          lastMessageAt: { $first: '$createdAt' },
          lastMessagePreview: { $first: '$plainText' },
        },
      },
    ]);

    const dmMetaMap = new Map<string, { lastMessageAt: string; lastMessagePreview: string }>();
    for (const thread of dmThreads) {
      const parts = String(thread._id).split(':');
      if (parts.length !== 2) continue;
      const peerId: string = parts[0] === currentUserId ? parts[1] : parts[0];
      if (!peerId || peerId === currentUserId) continue;

      if (!peerMap.has(peerId)) {
        peerMap.set(peerId, new Set()); // External Tier 3 DM peer (0 shared projects)
      }
      dmMetaMap.set(peerId, {
        lastMessageAt: thread.lastMessageAt ? new Date(thread.lastMessageAt).toISOString() : '',
        lastMessagePreview: (thread.lastMessagePreview || '').slice(0, 80),
      });
    }

    const peerIds = Array.from(peerMap.keys());
    const profileMap = await fetchUserProfilesBatch(peerIds);

    const profiles = peerIds
      .map((uid) => {
        const profile = profileMap.get(uid) || { name: `User ${uid.slice(-4)}`, avatar: '' };
        const dmMeta = dmMetaMap.get(uid);
        return {
          userId: uid,
          name: profile.name,
          avatarUrl: profile.avatar,
          sharedProjects: Array.from(peerMap.get(uid) || []),
          lastMessageAt: dmMeta?.lastMessageAt || null,
          lastMessagePreview: dmMeta?.lastMessagePreview || null,
        };
      })
      .sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt) {
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        }
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;
        return a.name.localeCompare(b.name);
      });

    return res.status(200).json({ success: true, data: { teammates: profiles } });
  } catch (err) {
    console.error('[getTeammates]', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load teammates' } });
  }
};

/**
 * GET /api/v1/users/lookup?email=...
 * Tier 3 scoped discovery: exact email match only (never lists users).
 */
export const lookupUserByEmail = async (req: Request, res: Response) => {
  try {
    const currentUserId = getUserId(req);
    if (!currentUserId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    }

    const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid email address is required' },
      });
    }

    const found = await lookupUserByExactEmail(email);
    if (!found || found.userId === currentUserId) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No Synca user found with that exact email' },
      });
    }

    return res.status(200).json({
      success: true,
      data: found,
    });
  } catch (err) {
    console.error('[lookupUserByEmail]', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to look up user' } });
  }
};

/**
 * GET /api/v1/users/:userId/profile
 * Returns public profile (name & avatar) for a user, scoped to self, shared-project teammates, or existing DM peers.
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const currentUserId = getUserId(req);
    if (!currentUserId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    }

    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'User ID is required' } });
    }

    // Scope check: caller must be self, share an active project, or have an existing DM thread
    if (userId !== currentUserId) {
      const sharesProject = await Project.exists({
        deletedAt: null,
        $and: [
          { $or: [{ ownerId: currentUserId }, { 'members.userId': currentUserId }, { teamMembers: currentUserId }] },
          { $or: [{ ownerId: userId }, { 'members.userId': userId }, { teamMembers: userId }] },
        ],
      });

      if (!sharesProject) {
        const hasDm = await Message.exists({
          channelType: 'dm',
          channelId: dmChannelId(currentUserId, userId),
          deletedAt: null,
        });
        if (!hasDm) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Profile access is restricted to collaborators' },
          });
        }
      }
    }

    const profile = await fetchUserProfile(userId);
    return res.status(200).json({
      success: true,
      data: {
        userId,
        name: profile.name,
        avatarUrl: profile.avatar,
      },
    });
  } catch (err) {
    console.error('[getUserProfile]', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load profile' } });
  }
};

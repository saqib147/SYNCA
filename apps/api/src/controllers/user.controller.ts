import { Request, Response } from 'express';
import { getAuth, clerkClient } from '@clerk/express';
import { Project } from '../models/Project.js';

const getUserId = (req: Request): string | undefined => {
  try {
    return (req as any).auth?.userId || getAuth(req)?.userId;
  } catch {
    return (req as any).auth?.userId;
  }
};

// In-memory profile cache shared with message controller
const profileCache = new Map<string, { name: string; avatar: string; cachedAt: number }>();

async function fetchProfile(userId: string): Promise<{ name: string; avatar: string }> {
  const cached = profileCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < 10 * 60 * 1000) {
    return { name: cached.name, avatar: cached.avatar };
  }
  try {
    const u = await clerkClient.users.getUser(userId);
    const name = u.firstName
      ? `${u.firstName} ${u.lastName || ''}`.trim()
      : u.username || u.emailAddresses?.[0]?.emailAddress?.split('@')[0] || `User ${userId.slice(-4)}`;
    const avatar = u.imageUrl || '';
    profileCache.set(userId, { name, avatar, cachedAt: Date.now() });
    return { name, avatar };
  } catch {
    return { name: `User ${userId.slice(-4)}`, avatar: '' };
  }
}

/**
 * GET /api/v1/users/teammates
 * Returns all unique project members (across all projects the caller belongs to),
 * enriched with their Clerk display name and avatar.
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

    // Collect unique peer user IDs + which projects they share
    const peerMap = new Map<string, string[]>(); // userId -> [projectName, ...]

    for (const proj of projects) {
      const addPeer = (uid: string) => {
        if (!uid || uid === currentUserId) return;
        if (!peerMap.has(uid)) peerMap.set(uid, []);
        peerMap.get(uid)!.push(proj.name);
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

    // Fetch Clerk profiles in parallel (bounded to avoid rate-limiting)
    const peerIds = Array.from(peerMap.keys());
    const profiles = await Promise.all(
      peerIds.map(async (uid) => {
        const profile = await fetchProfile(uid);
        return {
          userId: uid,
          name: profile.name,
          avatarUrl: profile.avatar,
          sharedProjects: peerMap.get(uid) || [],
        };
      })
    );

    return res.status(200).json({ success: true, data: { teammates: profiles } });
  } catch (err) {
    console.error('[getTeammates]', err);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load teammates' } });
  }
};

/**
 * GET /api/v1/users/:userId/profile
 * Returns public profile (name & avatar) for a specific user.
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'User ID is required' } });
    }
    const profile = await fetchProfile(userId);
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


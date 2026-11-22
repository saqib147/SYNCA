import { clerkClient } from '@clerk/express';

export interface UserProfile {
  name: string;
  avatar: string;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 1000;

const profileCache = new Map<string, { name: string; avatar: string; cachedAt: number }>();

function setCache(userId: string, profile: UserProfile) {
  if (profileCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = profileCache.keys().next().value;
    if (oldestKey) profileCache.delete(oldestKey);
  }
  profileCache.set(userId, { ...profile, cachedAt: Date.now() });
}

function formatClerkUser(u: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  emailAddresses?: Array<{ emailAddress: string }>;
  imageUrl?: string | null;
}): UserProfile {
  const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  const name =
    fullName ||
    u.username ||
    u.emailAddresses?.[0]?.emailAddress?.split('@')[0] ||
    `User ${u.id.slice(-4)}`;
  return { name, avatar: u.imageUrl || '' };
}

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const cached = profileCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { name: cached.name, avatar: cached.avatar };
  }
  try {
    const u = await clerkClient.users.getUser(userId);
    const profile = formatClerkUser(u);
    setCache(userId, profile);
    return profile;
  } catch {
    return { name: `User ${userId.slice(-4)}`, avatar: '' };
  }
}

export async function fetchUserProfilesBatch(userIds: string[]): Promise<Map<string, UserProfile>> {
  const result = new Map<string, UserProfile>();
  const missing: string[] = [];
  const now = Date.now();

  for (const uid of userIds) {
    const cached = profileCache.get(uid);
    if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
      result.set(uid, { name: cached.name, avatar: cached.avatar });
    } else {
      missing.push(uid);
    }
  }

  // Batch fetch missing IDs in chunks of 50 via Clerk getUserList
  for (let i = 0; i < missing.length; i += 50) {
    const chunk = missing.slice(i, i + 50);
    try {
      const response = await clerkClient.users.getUserList({ userId: chunk, limit: 50 });
      const users = Array.isArray(response) ? response : response.data || [];
      for (const u of users) {
        const profile = formatClerkUser(u);
        setCache(u.id, profile);
        result.set(u.id, profile);
      }
    } catch {
      // Fallback to individual placeholders for this chunk
    }
    for (const uid of chunk) {
      if (!result.has(uid)) {
        result.set(uid, { name: `User ${uid.slice(-4)}`, avatar: '' });
      }
    }
  }

  return result;
}

export async function lookupUserByExactEmail(
  email: string
): Promise<{ userId: string; name: string; avatarUrl: string } | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return null;

  try {
    const response = await clerkClient.users.getUserList({
      emailAddress: [normalized],
      limit: 1,
    });
    const users = Array.isArray(response) ? response : response.data || [];
    const match = users.find((u: any) =>
      u.emailAddresses?.some((e: { emailAddress: string }) => e.emailAddress.toLowerCase() === normalized)
    );
    if (!match) return null;

    const profile = formatClerkUser(match);
    setCache(match.id, profile);
    return {
      userId: match.id,
      name: profile.name,
      avatarUrl: profile.avatar,
    };
  } catch {
    return null;
  }
}

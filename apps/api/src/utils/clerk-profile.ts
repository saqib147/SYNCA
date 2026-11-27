import { clerkClient } from '@clerk/express';
import { redisClient } from '../lib/redis.js';

export interface UserProfile {
  name: string;
  avatar: string;
  email?: string;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes L1 memory
const REDIS_TTL_SEC = 15 * 60; // 15 minutes L2 Redis
const MAX_CACHE_ENTRIES = 1000;

const profileCache = new Map<string, UserProfile & { cachedAt: number }>();
const inFlightSingle = new Map<string, Promise<UserProfile>>();

function setCache(userId: string, profile: UserProfile) {
  if (profileCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = profileCache.keys().next().value;
    if (oldestKey) profileCache.delete(oldestKey);
  }
  profileCache.set(userId, { ...profile, cachedAt: Date.now() });

  if (redisClient.isReady) {
    redisClient
      .set(`profile:${userId}`, JSON.stringify(profile), { EX: REDIS_TTL_SEC })
      .catch(() => {});
  }
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
  const email = u.emailAddresses?.[0]?.emailAddress;
  const name =
    fullName ||
    u.username ||
    email?.split('@')[0] ||
    `User ${u.id.slice(-4)}`;
  return { name, avatar: u.imageUrl || '', email };
}

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const cached = profileCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { name: cached.name, avatar: cached.avatar, email: cached.email };
  }

  const existing = inFlightSingle.get(userId);
  if (existing) return existing;

  const promise = (async (): Promise<UserProfile> => {
    try {
      // L2 Redis check
      if (redisClient.isReady) {
        const raw = await redisClient.get(`profile:${userId}`).catch(() => null);
        if (raw) {
          const parsed = JSON.parse(raw) as UserProfile;
          profileCache.set(userId, { ...parsed, cachedAt: Date.now() });
          return parsed;
        }
      }

      const u = await clerkClient.users.getUser(userId);
      const profile = formatClerkUser(u);
      setCache(userId, profile);
      return profile;
    } catch {
      return { name: `User ${userId.slice(-4)}`, avatar: '' };
    } finally {
      inFlightSingle.delete(userId);
    }
  })();

  inFlightSingle.set(userId, promise);
  return promise;
}

export async function fetchUserProfilesBatch(userIds: string[]): Promise<Map<string, UserProfile>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const result = new Map<string, UserProfile>();
  let missing: string[] = [];
  const now = Date.now();

  for (const uid of uniqueIds) {
    const cached = profileCache.get(uid);
    if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
      result.set(uid, { name: cached.name, avatar: cached.avatar, email: cached.email });
    } else {
      missing.push(uid);
    }
  }

  // L2 Redis batch MGET for any L1 misses
  if (missing.length > 0 && redisClient.isReady) {
    try {
      const keys = missing.map((uid) => `profile:${uid}`);
      const values = await redisClient.mGet(keys);
      const stillMissing: string[] = [];
      values.forEach((raw, idx) => {
        const uid = missing[idx];
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as UserProfile;
            profileCache.set(uid, { ...parsed, cachedAt: now });
            result.set(uid, parsed);
            return;
          } catch {
            // fall through to Clerk fetch
          }
        }
        stillMissing.push(uid);
      });
      missing = stillMissing;
    } catch {
      // ignore Redis error and fall through to Clerk
    }
  }

  // Parallel batch fetch remaining IDs in chunks of 50 via Clerk getUserList
  if (missing.length > 0) {
    const chunks: string[][] = [];
    for (let i = 0; i < missing.length; i += 50) {
      chunks.push(missing.slice(i, i + 50));
    }

    await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const response = await clerkClient.users.getUserList({ userId: chunk, limit: 50 });
          const users = Array.isArray(response) ? response : response.data || [];
          for (const u of users) {
            const profile = formatClerkUser(u);
            setCache(u.id, profile);
            result.set(u.id, profile);
          }
        } catch {
          // Fallback to placeholders below
        }
        for (const uid of chunk) {
          if (!result.has(uid)) {
            result.set(uid, { name: `User ${uid.slice(-4)}`, avatar: '' });
          }
        }
      })
    );
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

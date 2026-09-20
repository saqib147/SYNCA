import crypto from 'crypto';

const JOIN_CODE_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates a cryptographically secure, human-friendly uppercase join code.
 * Excludes easily confusable characters (0, O, 1, I).
 */
export function generateJoinCode(length = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, JOIN_CODE_CHARSET.length);
    result += JOIN_CODE_CHARSET[randomIndex];
  }
  return result;
}

/**
 * Creates a URL-safe slug from a string (e.g., workspace name).
 * If randomSuffix is true, appends a short random alphanumeric string.
 */
export function slugify(text: string, randomSuffix = false): string {
  let slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 45);

  if (!slug) {
    slug = 'workspace';
  }

  if (randomSuffix) {
    const suffix = crypto.randomBytes(3).toString('hex').slice(0, 4);
    slug = `${slug}-${suffix}`;
  }

  return slug;
}

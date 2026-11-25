const DEFAULT_BACKEND_URL = 'https://synca-w047.onrender.com';

function normalizeBaseUrl(raw?: string): string {
  const value = (raw || DEFAULT_BACKEND_URL).trim();
  // Strip trailing slashes and any accidental trailing /api/v1 so callers can safely append /api/v1/...
  return value.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
}

export const API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
export const SOCKET_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL
);

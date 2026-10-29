import { Message } from '@synca/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

function getHeaders(token?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = body.error || {};
    throw new ApiError(
      error.message || `Request failed with status ${res.status}`,
      error.code || 'UNKNOWN_ERROR',
      res.status
    );
  }
  return body.data as T;
}

export interface MessagePage {
  messages: Message[];
  nextCursor: string | null;
  channelId?: string;
}

export async function getChannelMessages(
  projectId: string,
  token: string | null,
  opts?: { cursor?: string; limit?: number }
): Promise<MessagePage> {
  const params = new URLSearchParams();
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.limit) params.set('limit', String(opts.limit));
  const qs = params.toString() ? `?${params}` : '';
  const res = await fetch(`${API_BASE_URL}/api/v1/messages/channel/${projectId}${qs}`, {
    headers: getHeaders(token),
  });
  return handleResponse<MessagePage>(res);
}

export async function getDmMessages(
  peerUserId: string,
  token: string | null,
  opts?: { cursor?: string; limit?: number }
): Promise<MessagePage> {
  const params = new URLSearchParams();
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.limit) params.set('limit', String(opts.limit));
  const qs = params.toString() ? `?${params}` : '';
  const res = await fetch(`${API_BASE_URL}/api/v1/messages/dm/${peerUserId}${qs}`, {
    headers: getHeaders(token),
  });
  return handleResponse<MessagePage>(res);
}

export async function sendMessageApi(
  payload: {
    channelType: 'dm' | 'channel';
    channelId: string;
    content: unknown;
    attachments?: string[];
    senderName?: string;
    senderAvatar?: string;
  },
  token: string | null
): Promise<Message> {
  const res = await fetch(`${API_BASE_URL}/api/v1/messages`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<Message>(res);
}

export async function deleteMessageApi(messageId: string, token: string | null): Promise<{ messageId: string; channelId: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/messages/${messageId}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  return handleResponse(res);
}

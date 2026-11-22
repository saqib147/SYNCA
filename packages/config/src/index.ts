export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MESSAGE_DEFAULT_LIMIT: 30,
};

export const FILE_LIMITS = {
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
  RETENTION_HOURS: 24, // Auto-delete uploaded files after 24 hours
  ALLOW_ALL_TYPES: true,
  SAFE_IMAGE_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
};

export const DEFAULT_KANBAN_COLUMNS = ['To Do', 'In Progress', 'Done'];

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_KANBAN_COLUMNS = exports.FILE_LIMITS = exports.PAGINATION = void 0;
exports.PAGINATION = {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    MESSAGE_DEFAULT_LIMIT: 30,
};
exports.FILE_LIMITS = {
    MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
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
exports.DEFAULT_KANBAN_COLUMNS = ['To Do', 'In Progress', 'Done'];

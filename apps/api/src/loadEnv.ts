import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const candidates = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), 'apps/api/.env.local'),
  typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../.env.local') : null,
].filter((p): p is string => Boolean(p && fs.existsSync(p)));

if (candidates.length > 0) {
  dotenv.config({ path: candidates[0], override: true });
} else {
  dotenv.config();
}



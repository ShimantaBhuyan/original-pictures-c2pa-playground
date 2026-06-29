import path from 'path';

const ROOT = path.resolve(process.cwd());

export const UPLOADS_DIR = path.join(ROOT, 'uploads');
export const CERTS_DIR = path.join(ROOT, 'certs');
export const DB_PATH = process.env.DB_PATH || path.join(ROOT, 'data', 'evidence.db');

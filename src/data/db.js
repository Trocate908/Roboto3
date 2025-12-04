import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'contacts.db');

let db;

try {
  db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT NOT NULL,
      canonical_name TEXT NOT NULL,
      phone_numbers TEXT,
      emails TEXT,
      organization TEXT,
      raw_vcard TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_canonical_name ON contacts(canonical_name);
  `);
  
  console.log('📚 Contact database initialized');
} catch (error) {
  console.error('Failed to initialize database:', error.message);
  db = null;
}

export function isDatabaseAvailable() {
  return db !== null;
}

export default db;

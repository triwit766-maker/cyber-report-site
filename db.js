/**
 * db.js — Database abstraction with dual support:
 *   - PostgreSQL (when process.env.DATABASE_URL is set) — for Render / Neon / production.
 *   - SQLite (better-sqlite3) fallback — for local development, no external DB needed.
 *
 * Exposes an async API: init(), query(), get(), run(), generateTicketId().
 * SQL is written with `?` placeholders; they are auto-converted to $1/$2 for Postgres.
 */
const path = require('path');
const fs = require('fs');

const USE_POSTGRES = !!process.env.DATABASE_URL;
let pgPool = null;
let sqlite = null;

// ── Placeholder converter: `?` → $1, $2, ... (Postgres style) ──────
function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// ── Ticket ID generator alphabet (no ambiguous 0/O/1/I) ────────────
const TICKET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomTicket() {
  const year = new Date().getFullYear();
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += TICKET_ALPHABET[Math.floor(Math.random() * TICKET_ALPHABET.length)];
  }
  return `CR-${year}-${rand}`;
}

// ── Public async API ───────────────────────────────────────────────
async function query(sql, params = []) {
  if (USE_POSTGRES) {
    const res = await pgPool.query(toPg(sql), params);
    return res.rows;
  }
  return sqlite.prepare(sql).all(...params);
}

async function get(sql, params = []) {
  if (USE_POSTGRES) {
    const res = await pgPool.query(toPg(sql), params);
    return res.rows[0];
  }
  return sqlite.prepare(sql).get(...params);
}

// Returns { lastInsertRowid, changes } — mirrors better-sqlite3 .run()
async function run(sql, params = []) {
  if (USE_POSTGRES) {
    let s = toPg(sql);
    const isInsert = /^\s*INSERT\s+/i.test(s);
    if (isInsert && !/RETURNING\s+/i.test(s)) s += ' RETURNING id';
    const res = await pgPool.query(s, params);
    return {
      lastInsertRowid: res.rows[0] ? res.rows[0].id : null,
      changes: res.rowCount || 0,
    };
  }
  const info = sqlite.prepare(sql).run(...params);
  return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
}

async function generateTicketId() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const tid = randomTicket();
    const exists = await get('SELECT 1 FROM reports WHERE ticket_id = ?', [tid]);
    if (!exists) return tid;
  }
  return `CR-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// ── Schema + seed (idempotent) ─────────────────────────────────────
async function init() {
  if (USE_POSTGRES) {
    const { Pool } = require('pg');
    // Render / Neon Postgres requires SSL; allow self-signed via rejectUnauthorized:false.
    // Disable explicitly with PG_SSL=false if your network doesn't support SSL.
    const ssl = process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false };
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id               SERIAL PRIMARY KEY,
        ticket_id        TEXT UNIQUE,
        reporter_name    TEXT DEFAULT '',
        reporter_contact TEXT DEFAULT '',
        issue_type       TEXT NOT NULL,
        severity         TEXT NOT NULL,
        description      TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'pending',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await pgPool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_ticket   ON reports(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_reports_status          ON reports(status);
      CREATE INDEX IF NOT EXISTS idx_reports_severity        ON reports(severity);
      CREATE INDEX IF NOT EXISTS idx_reports_created         ON reports(created_at DESC);
    `);
    console.log('[db] PostgreSQL connected & schema ready.');
  } else {
    const Database = require('better-sqlite3');
    const DATA_DIR = path.join(__dirname, 'data');
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    sqlite = new Database(path.join(DATA_DIR, 'reports.db'));
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id        TEXT UNIQUE,
        reporter_name    TEXT DEFAULT '',
        reporter_contact TEXT DEFAULT '',
        issue_type       TEXT NOT NULL,
        severity         TEXT NOT NULL,
        description      TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'pending',
        created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at       TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
    `);
    const cols = sqlite.prepare('PRAGMA table_info(reports)').all().map((c) => c.name);
    if (!cols.includes('ticket_id')) {
      sqlite.exec('ALTER TABLE reports ADD COLUMN ticket_id TEXT');
    }
    sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_ticket   ON reports(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_reports_status          ON reports(status);
      CREATE INDEX IF NOT EXISTS idx_reports_severity        ON reports(severity);
      CREATE INDEX IF NOT EXISTS idx_reports_created         ON reports(created_at DESC);
    `);
    console.log('[db] SQLite ready (local fallback).');
  }

  // ── Seed sample data only if table is empty ──────────────────────
  const countRow = await get('SELECT COUNT(*)::int AS c FROM reports'.replace('::int', USE_POSTGRES ? '::int' : ''));
  const total = Number(countRow ? countRow.c : 0);
  if (total === 0) {
    const seed = [
      { ticket_id: 'CR-2026-A7KQ2M', reporter_name: 'สมชาย ใจดี', reporter_contact: 'somchai@example.com', issue_type: 'phishing', severity: 'high', description: 'ได้รับอีเมลแอบอ้างเป็นธนาคาร ขอให้คลิกลิงก์เพื่อยืนยันบัญชี ลิงก์ชี้ไปยังโดเมนปลอม คาดว่าเป็นการฟิชชิ่งเพื่อขโมยรหัสผ่าน', status: 'in_progress', days: 2 },
      { ticket_id: 'CR-2026-B3X9P7', reporter_name: '', reporter_contact: '081-234-5678', issue_type: 'malware', severity: 'medium', description: 'คอมพิวเตอร์ทำงานช้าผิดปกติและมีโปรแกรมแปลกๆ ติดตั้งเข้ามาโดยไม่ได้ตั้งใจ หลังจากดาวน์โหลดไฟล์จากเว็บไม่ค่อยดี', status: 'pending', days: 1 },
      { ticket_id: 'CR-2026-C5M8T2', reporter_name: 'บริษัท กสิณธุรกิจ จำกัด', reporter_contact: 'it@kasin-example.co.th', issue_type: 'ddos', severity: 'critical', description: 'เว็บไซต์ของบริษัทถูกโจมตีแบบ DDoS ทำให้ไม่สามารถเข้าถึงได้เกือบ 3 ชั่วโมง ตอนนี้ฟื้นตัวแล้วแต่ต้องการตรวจสอบแหล่งที่มา', status: 'resolved', days: 5 },
    ];
    for (const r of seed) {
      if (USE_POSTGRES) {
        await run(
          `INSERT INTO reports (ticket_id, reporter_name, reporter_contact, issue_type, severity, description, status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7, now() - ($8 || ' days')::interval)`,
          [r.ticket_id, r.reporter_name, r.reporter_contact, r.issue_type, r.severity, r.description, r.status, r.days]
        );
      } else {
        sqlite.prepare(
          `INSERT INTO reports (ticket_id, reporter_name, reporter_contact, issue_type, severity, description, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','localtime','-'||?||' days'))`
        ).run(r.ticket_id, r.reporter_name, r.reporter_contact, r.issue_type, r.severity, r.description, r.status, r.days);
      }
    }
    console.log('[db] Seeded 3 sample reports.');
  }
}

module.exports = { init, query, get, run, generateTicketId, USE_POSTGRES };

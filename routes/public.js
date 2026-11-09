/** Public routes: landing, report form + submit + confirmation, public list, track-by-ticket, trust pages. */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendNewReportNotification } = require('../mailer');
const {
  ORG, ISSUE_TYPES, SEVERITIES, ISSUE_LABEL, SEVERITY_LABEL, STATUS_LABEL,
  SEVERITY_BADGE, STATUS_BADGE, validIssueType, validSeverity,
} = require('../lib/labels');

const locals = (req) => ({
  ORG, ISSUE_TYPES, SEVERITIES, ISSUE_LABEL, SEVERITY_LABEL, STATUS_LABEL,
  SEVERITY_BADGE, STATUS_BADGE,
  user: req.session && req.session.user,
  path: req.path,
});

// Live trust stats (used by landing + public list)
async function getTrustStats() {
  const s = await db.get(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status='pending'     THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status='resolved'    THEN 1 ELSE 0 END) AS resolved
    FROM reports
  `);
  const total = Number(s && s.total) || 0;
  const resolved = Number(s && s.resolved) || 0;
  return {
    total,
    pending: Number(s && s.pending) || 0,
    in_progress: Number(s && s.in_progress) || 0,
    resolved,
    resolution_rate: total > 0 ? Math.round((resolved / total) * 100) : 0,
  };
}

// ── Landing page with live trust stats ─────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    res.render('index', { ...locals(req), stats: await getTrustStats() });
  } catch (e) { next(e); }
});

// ── Trust pages ────────────────────────────────────────────────────
router.get('/privacy', (req, res) => res.render('privacy', { ...locals(req), title: 'นโยบายความเป็นส่วนตัว' }));
router.get('/terms',   (req, res) => res.render('terms',   { ...locals(req), title: 'ข้อกำหนดการใช้งาน' }));
router.get('/about',   (req, res) => res.render('about',   { ...locals(req), title: 'เกี่ยวกับเรา / ติดต่อ' }));

// ── Report form ────────────────────────────────────────────────────
router.get('/report', (req, res) => {
  res.render('report', { ...locals(req), form: {}, errors: {} });
});

// ── Submit report → dedicated confirmation page with ticket ID ─────
router.post('/report', async (req, res, next) => {
  try {
    const body = req.body || {};
    const reporter_name = (body.reporter_name || '').trim().slice(0, 120);
    const reporter_contact = (body.reporter_contact || '').trim().slice(0, 120);
    const issue_type = validIssueType(body.issue_type);
    const severity = validSeverity(body.severity);
    const description = (body.description || '').trim();
    const errors = {};
    if (!issue_type) errors.issue_type = 'กรุณาเลือกประเภทปัญหา';
    if (!severity) errors.severity = 'กรุณาเลือกระดับความรุนแรง';
    if (!description) errors.description = 'กรุณาระบุรายละเอียดปัญหา';
    else if (description.length < 10) errors.description = 'รายละเอียดสั้นเกินไป กรุณาระบุอย่างน้อย 10 ตัวอักษร';
    if (reporter_contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporter_contact) && !/^[0-9+\-\s()]{6,20}$/.test(reporter_contact)) {
      errors.reporter_contact = 'รูปแบบช่องทางติดต่อไม่ถูกต้อง กรุณากรอกอีเมลหรือเบอร์โทรศัพท์';
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).render('report', { ...locals(req), form: body, errors });
    }
    const ticket_id = await db.generateTicketId();
    const info = await db.run(
      'INSERT INTO reports (ticket_id, reporter_name, reporter_contact, issue_type, severity, description) VALUES (?, ?, ?, ?, ?, ?)',
      [ticket_id, reporter_name, reporter_contact, issue_type, severity, description]
    );
    const report = await db.get('SELECT * FROM reports WHERE id = ?', [info.lastInsertRowid]);
    // Best-effort email — never blocks or crashes the request.
    sendNewReportNotification(report).catch(() => {});
    res.status(201).render('confirm', { ...locals(req), report, title: 'บันทึกการแจ้งเรียบร้อย' });
  } catch (e) { next(e); }
});

// ── Public list (anonymized) with resolution rate + last-updated ───
router.get('/reports', async (req, res, next) => {
  try {
    const statusFilter = req.query.status || 'all';
    let where = '';
    const params = [];
    if (['pending', 'in_progress', 'resolved'].includes(statusFilter)) {
      where = 'WHERE status = ?';
      params.push(statusFilter);
    }
    const reports = await db.query(
      `SELECT id, ticket_id, issue_type, severity, description, status, created_at, updated_at
       FROM reports ${where} ORDER BY created_at DESC LIMIT 200`,
      params
    );
    const summarized = reports.map((r) => ({
      ...r,
      summary: r.description.length > 160 ? r.description.slice(0, 160) + '…' : r.description,
    }));
    res.render('list', { ...locals(req), reports: summarized, statusFilter, stats: await getTrustStats() });
  } catch (e) { next(e); }
});

// ── Track report by ticket ID (public, no login) ───────────────────
router.get('/track', async (req, res, next) => {
  try {
    const ticket = (req.query.ticket || '').trim().toUpperCase();
    let report = null;
    let notFound = false;
    if (ticket) {
      report = await db.get(
        'SELECT ticket_id, issue_type, severity, description, status, created_at, updated_at FROM reports WHERE ticket_id = ?',
        [ticket]
      );
      if (!report) notFound = true;
      else if (report.description.length > 300) report.description = report.description.slice(0, 300) + '…';
    }
    res.render('track', { ...locals(req), ticket, report, notFound, title: 'ติดตามรายงาน' });
  } catch (e) { next(e); }
});

module.exports = router;
